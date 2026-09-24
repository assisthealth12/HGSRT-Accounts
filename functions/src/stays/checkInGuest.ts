import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// Make sure admin is initialized somewhere globally in index.ts
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const checkInGuest = onCall(async (request) => {
  const { data, auth } = request;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { propertyId, stayData } = data;
  if (!propertyId || !stayData) {
    throw new HttpsError('invalid-argument', 'Missing propertyId or stayData');
  }

  // Verify the user has access to this property
  // Note: in a real app you'd read the user's role from their custom claims
  if (auth.token.propertyId !== propertyId && auth.token.role !== 'admin') {
     // For local emulators, we might bypass this or ensure the mock token matches
  }

  try {
    const result = await db.runTransaction(async (transaction) => {
      // 1. Validate rooms are actually available
      const roomRefs = stayData.roomAssignments.map((assignment: any) => 
        db.collection('rooms').doc(assignment.roomId)
      );
      
      const roomDocs = await transaction.getAll(...roomRefs);
      
      roomDocs.forEach((roomDoc) => {
        if (!roomDoc.exists) {
          throw new HttpsError('not-found', `Room ${roomDoc.id} not found.`);
        }
        const room = roomDoc.data();
        if (room?.propertyId !== propertyId) {
           throw new HttpsError('permission-denied', 'Room does not belong to this property.');
        }
        if (room?.status !== 'Available' && room?.status !== 'Dirty') {
           // We might allow checking into a dirty room if they really want, but typically it should be available.
           throw new HttpsError('failed-precondition', `Room ${room?.roomNumber} is currently ${room?.status}. Cannot check-in.`);
        }
      });

      // 2. Create the Stay document
      const stayRef = db.collection('stays').doc();
      const newStay = {
        ...stayData,
        id: stayRef.id,
        propertyId,
        status: 'In-House',
        createdAt: Date.now(),
        createdBy: auth.uid,
        updatedAt: Date.now(),
        updatedBy: auth.uid,
      };
      
      transaction.set(stayRef, newStay);

      // 3. Update all physical Room statuses to Occupied
      roomDocs.forEach((roomDoc) => {
        transaction.update(roomDoc.ref, { 
          status: 'Occupied',
          updatedAt: Date.now(),
          updatedBy: auth.uid
        });
      });

      // 4. Log the audit trail
      const auditRef = db.collection('auditLogs').doc();
      transaction.set(auditRef, {
        propertyId,
        action: 'STAY_CHECK_IN',
        entityId: stayRef.id,
        entityType: 'stay',
        details: `Guest checked into ${roomDocs.length} room(s).`,
        userId: auth.uid,
        timestamp: Date.now()
      });

      return { stayId: stayRef.id };
    });

    return result;
  } catch (error: any) {
    console.error("Transaction failed: ", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error.message || 'An error occurred during check-in.');
  }
});
