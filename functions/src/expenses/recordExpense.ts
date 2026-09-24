import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const recordExpense = onCall(async (request) => {
  const { data, auth } = request;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { propertyId, expenseData, markAsPaid } = data;
  if (!propertyId || !expenseData) {
    throw new HttpsError('invalid-argument', 'Missing propertyId or expenseData');
  }

  try {
    const result = await db.runTransaction(async (transaction) => {
      const expenseRef = db.collection('expenses').doc();
      
      const newExpense = {
        ...expenseData,
        id: expenseRef.id,
        propertyId,
        status: markAsPaid ? 'Paid' : 'Pending Approval',
        isVoided: false,
        createdAt: Date.now(),
        createdBy: auth.uid,
        updatedAt: Date.now(),
        updatedBy: auth.uid,
      };

      transaction.set(expenseRef, newExpense);

      // If tied to a vendor, update the Vendor ledger
      if (newExpense.vendorId && !markAsPaid) {
        const vendorRef = db.collection('vendors').doc(newExpense.vendorId);
        // Note: In a real environment, you'd fetch the current totalBilled and increment.
        // For atomic increments without fetching, we can use FieldValue.increment
        transaction.update(vendorRef, {
          totalBilled: admin.firestore.FieldValue.increment(newExpense.grandTotal),
          balanceOutstanding: admin.firestore.FieldValue.increment(newExpense.grandTotal)
        });
      }

      // Log Audit
      const auditRef = db.collection('auditLogs').doc();
      transaction.set(auditRef, {
        propertyId,
        action: 'EXPENSE_RECORDED',
        entityId: expenseRef.id,
        entityType: 'expense',
        details: `Recorded expense of ${newExpense.grandTotal} for ${newExpense.category}`,
        userId: auth.uid,
        timestamp: Date.now()
      });

      return { expenseId: expenseRef.id };
    });

    return result;
  } catch (error: any) {
    console.error("Record Expense failed: ", error);
    throw new HttpsError('internal', error.message || 'An error occurred while recording expense.');
  }
});
