import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const approvePayrollRun = onCall(async (request) => {
  const { data, auth } = request;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  // Note: Only Admins should be able to run this
  // if (auth.token.role !== 'admin') throw new HttpsError('permission-denied', 'Only admins can approve payroll.');

  const { propertyId, payrollRunId } = data;
  if (!propertyId || !payrollRunId) {
    throw new HttpsError('invalid-argument', 'Missing propertyId or payrollRunId');
  }

  try {
    const result = await db.runTransaction(async (transaction) => {
      const runRef = db.collection('payrollRuns').doc(payrollRunId);
      const runDoc = await transaction.get(runRef);
      
      if (!runDoc.exists) {
        throw new HttpsError('not-found', 'Payroll run not found');
      }
      
      const run = runDoc.data()!;
      if (run.status !== 'Draft') {
        throw new HttpsError('failed-precondition', 'Can only approve Draft payroll runs.');
      }

      // Update the Payroll Run status
      transaction.update(runRef, {
        status: 'Approved',
        approvedBy: auth.uid,
        approvedAt: Date.now(),
        updatedAt: Date.now(),
        updatedBy: auth.uid
      });

      // Audit Log
      const auditRef = db.collection('auditLogs').doc();
      transaction.set(auditRef, {
        propertyId,
        action: 'PAYROLL_APPROVED',
        entityId: payrollRunId,
        entityType: 'payrollRun',
        details: `Approved payroll for ${run.month}/${run.year} totaling ${run.totalNetPayable}`,
        userId: auth.uid,
        timestamp: Date.now()
      });

      return { success: true, payrollRunId };
    });

    return result;
  } catch (error: any) {
    console.error("Approve Payroll failed: ", error);
    throw new HttpsError('internal', error.message || 'An error occurred while approving payroll.');
  }
});
