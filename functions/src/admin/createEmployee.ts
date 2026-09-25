import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const createEmployee = onCall(async (request) => {
  const { data, auth } = request;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { propertyId, employeeData } = data;
  if (!propertyId || !employeeData) {
    throw new HttpsError('invalid-argument', 'Missing propertyId or employeeData');
  }

  // Only Admins can grant a system login (assign a role). Anyone authenticated
  // for the property can still add a plain employee record with no login.
  if (employeeData.role && auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only Admins can grant system access.');
  }

  try {
    let authUserId: string | null = null;

    // 1. If email and password are provided, create or update the Firebase Auth User
    if (employeeData.email && employeeData.password) {
      try {
        const userRecord = await admin.auth().createUser({
          email: employeeData.email,
          password: employeeData.password,
          displayName: `${employeeData.firstName} ${employeeData.lastName}`,
        });
        authUserId = userRecord.uid;
      } catch (authError: any) {
        if (authError.code === 'auth/email-already-exists') {
          // If the user already exists (e.g. manually created first admin), just fetch them
          const existingUser = await admin.auth().getUserByEmail(employeeData.email);
          
          // Optionally update their password if they provided it here
          await admin.auth().updateUser(existingUser.uid, {
            password: employeeData.password,
            displayName: `${employeeData.firstName} ${employeeData.lastName}`
          });
          
          authUserId = existingUser.uid;
        } else {
          throw authError; // Re-throw other auth errors
        }
      }

      // Set Custom Claims for Role-Based Access Control (RBAC)
      if (authUserId && employeeData.role) {
        await admin.auth().setCustomUserClaims(authUserId, {
          role: employeeData.role,
          propertyId: propertyId
        });
      }
    }

    // 2. Remove password from the data before saving to Firestore
    const { password, ...firestoreData } = employeeData;

    // 3. Create the Employee Profile Document
    // If we created an auth user, we use their UID as the document ID for easy mapping
    const employeeRef = authUserId 
      ? db.collection('employees').doc(authUserId) 
      : db.collection('employees').doc();

    const newEmployee = {
      ...firestoreData,
      id: employeeRef.id,
      propertyId,
      hasSystemAccess: !!authUserId,
      createdAt: Date.now(),
      createdBy: auth.uid,
      updatedAt: Date.now(),
      updatedBy: auth.uid,
    };

    await employeeRef.set(newEmployee);

    // 4. Log the Audit Event
    await db.collection('auditLogs').add({
      propertyId,
      action: 'EMPLOYEE_CREATED',
      entityId: employeeRef.id,
      entityType: 'employee',
      details: `Created employee ${newEmployee.firstName} ${newEmployee.lastName}${newEmployee.role ? ` (${newEmployee.role})` : ''}`,
      userId: auth.uid,
      timestamp: Date.now()
    });

    return { success: true, employeeId: employeeRef.id };
    
  } catch (error: any) {
    console.error("Create Employee failed: ", error);
    
    // Check for Firebase Auth specific errors like email-already-in-use
    if (error.code === 'auth/email-already-exists') {
        throw new HttpsError('already-exists', 'An account with this email already exists.');
    }
    
    throw new HttpsError('internal', error.message || 'An error occurred while creating the employee.');
  }
});
