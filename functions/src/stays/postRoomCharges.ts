import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Calculates tax based on Indian GST slabs (simplified for example)
// In a real app, this logic might be imported from a shared domain layer 
// built with something like ts-morph to share code between frontend and functions.
function calculateGST(amountPaise: number) {
  // e.g. Below 7500 INR (750000 paise) = 12%, Above = 18%
  const rate = amountPaise > 750000 ? 18 : 12;
  const totalTax = Math.round((amountPaise * rate) / 100);
  const halfTax = Math.round(totalTax / 2);
  
  return {
    taxRatePercent: rate,
    taxAmount: {
      totalTax,
      breakdown: [
        { taxType: 'CGST', taxRate: rate / 2, taxAmount: halfTax },
        { taxType: 'SGST', taxRate: rate / 2, taxAmount: totalTax - halfTax }
      ]
    }
  };
}

export const postRoomCharges = onCall(async (request) => {
  const { data, auth } = request;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { propertyId, businessDate } = data;
  if (!propertyId || !businessDate) {
    throw new HttpsError('invalid-argument', 'Missing propertyId or businessDate');
  }

  try {
    // 1. Find all active stays for this property
    const staysSnapshot = await db.collection('stays')
      .where('propertyId', '==', propertyId)
      .where('status', '==', 'In-House')
      .get();
      
    if (staysSnapshot.empty) {
      return { postedCount: 0, message: 'No active stays found.' };
    }

    const batch = db.batch();
    let postedCount = 0;

    // 2. Loop through stays and their room assignments to generate charges
    staysSnapshot.docs.forEach(stayDoc => {
      const stay = stayDoc.data();
      
      stay.roomAssignments.forEach((assignment: any) => {
        // Here you would typically check if the room charge for this specific assignment
        // and this specific business date has already been posted to avoid duplicates.
        // For brevity, we assume it hasn't or we'd query first.
        
        const chargeRef = db.collection('charges').doc();
        const baseAmount = assignment.nightlyRate;
        const taxInfo = calculateGST(baseAmount);
        
        const charge = {
          id: chargeRef.id,
          propertyId,
          stayId: stayDoc.id,
          roomId: assignment.roomId,
          businessDate,
          type: 'Room',
          description: `Room Rent - ${businessDate}`,
          baseAmount,
          discount: 0,
          taxableAmount: baseAmount,
          taxRatePercent: taxInfo.taxRatePercent,
          taxAmount: taxInfo.taxAmount,
          totalAmount: baseAmount + taxInfo.taxAmount.totalTax,
          isVoided: false,
          createdAt: Date.now(),
          createdBy: auth.uid,
          updatedAt: Date.now(),
          updatedBy: auth.uid,
        };
        
        batch.set(chargeRef, charge);
        postedCount++;
      });
    });

    // 3. Commit the batch
    await batch.commit();

    // 4. Log the audit
    await db.collection('auditLogs').add({
      propertyId,
      action: 'NIGHT_AUDIT_POST_ROOM_CHARGES',
      details: `Posted ${postedCount} room charges for business date ${businessDate}.`,
      userId: auth.uid,
      timestamp: Date.now()
    });

    return { postedCount, message: `Successfully posted ${postedCount} charges.` };
  } catch (error: any) {
    console.error("Failed to post room charges: ", error);
    throw new HttpsError('internal', error.message || 'An error occurred while posting charges.');
  }
});
