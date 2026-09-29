import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const createStaffLogin = onCall(async (request) => {
  const { data, auth } = request;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { propertyId, staffData } = data;
  if (!propertyId || !staffData) {
    throw new HttpsError('invalid-argument', 'Missing propertyId or staffData');
  }

  // Only Admins can grant a system login (assign an access role). Anyone authenticated
  // for the property can still add a plain staff record with no login.
  if (staffData.accessRole && auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only Admins can grant system access.');
  }

  try {
    let authUserId: string | null = null;

    // 1. If email and password are provided, create or update the Firebase Auth User
    if (staffData.email && staffData.password) {
      try {
        const userRecord = await admin.auth().createUser({
          email: staffData.email,
          password: staffData.password,
          displayName: staffData.name,
        });
        authUserId = userRecord.uid;
      } catch (authError: any) {
        if (authError.code === 'auth/email-already-exists') {
          const existingUser = await admin.auth().getUserByEmail(staffData.email);
          await admin.auth().updateUser(existingUser.uid, {
            password: staffData.password,
            displayName: staffData.name,
          });
          authUserId = existingUser.uid;
        } else {
          throw authError;
        }
      }

      if (authUserId && staffData.accessRole) {
        await admin.auth().setCustomUserClaims(authUserId, {
          role: staffData.accessRole,
          propertyId,
        });
      }
    }

    // 2. Remove password before saving to Firestore
    const { password, ...firestoreData } = staffData;

    // 3. Create the Staff document (uid as doc id when a login was granted)
    const staffRef = authUserId
      ? db.collection('staff').doc(authUserId)
      : db.collection('staff').doc();

    const newStaff = {
      ...firestoreData,
      id: staffRef.id,
      propertyId,
      hasSystemAccess: !!authUserId,
      createdAt: Date.now(),
      createdBy: auth.uid,
      updatedAt: Date.now(),
      updatedBy: auth.uid,
    };

    await staffRef.set(newStaff);

    // 4. Audit trail
    await db.collection('auditLogs').add({
      propertyId,
      userId: auth.uid,
      userRole: auth.token.role ?? null,
      action: 'create',
      entityType: 'staff',
      entityId: staffRef.id,
      changes: { name: newStaff.name, accessRole: newStaff.accessRole ?? null },
      timestamp: Date.now(),
    });

    return { success: true, staffId: staffRef.id };
  } catch (error: any) {
    console.error('Create staff login failed: ', error);

    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'An account with this email already exists.');
    }

    throw new HttpsError('internal', error.message || 'An error occurred while creating the staff login.');
  }
});
