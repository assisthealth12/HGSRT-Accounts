import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const receivePayment = onCall(async (request) => {
  const { data, auth } = request;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { propertyId, paymentData, idempotencyKey } = data;
  if (!propertyId || !paymentData || !idempotencyKey) {
    throw new HttpsError('invalid-argument', 'Missing propertyId, paymentData, or idempotencyKey');
  }

  try {
    const result = await db.runTransaction(async (transaction) => {
      // 1. Idempotency Check to prevent double charges (Network retry issues)
      const idempotencyRef = db.collection('idempotencyRecords').doc(idempotencyKey);
      const idempotencyDoc = await transaction.get(idempotencyRef);
      if (idempotencyDoc.exists) {
        return idempotencyDoc.data()?.result; // Return the previous success result
      }

      // 2. Fetch Property Settings to get receipt prefix
      const propertyRef = db.collection('properties').doc(propertyId);
      const propertyDoc = await transaction.get(propertyRef);
      if (!propertyDoc.exists) {
        throw new HttpsError('not-found', 'Property not found.');
      }
      const prefix = propertyDoc.data()?.settings?.receiptPrefix || 'RCPT';
      
      // In a real app, you'd use a robust sequence generator here
      const receiptNumber = `${prefix}-${Date.now().toString().slice(-6)}`;

      // 3. Create Payment Document
      const paymentRef = db.collection('payments').doc();
      const newPayment = {
        ...paymentData,
        id: paymentRef.id,
        propertyId,
        receiptNumber,
        allocatedAmount: 0,
        unallocatedAmount: paymentData.amount, // Fully unallocated initially (Advance)
        status: 'Received',
        isReversed: false,
        createdAt: Date.now(),
        createdBy: auth.uid,
        updatedAt: Date.now(),
        updatedBy: auth.uid,
      };

      transaction.set(paymentRef, newPayment);

      // 4. Record Idempotency
      const resultData = { paymentId: paymentRef.id, receiptNumber };
      transaction.set(idempotencyRef, {
        propertyId,
        action: 'RECEIVE_PAYMENT',
        result: resultData,
        createdAt: Date.now()
      });

      // 5. Audit Log
      const auditRef = db.collection('auditLogs').doc();
      transaction.set(auditRef, {
        propertyId,
        action: 'PAYMENT_RECEIVED',
        entityId: paymentRef.id,
        entityType: 'payment',
        details: `Received payment of ${paymentData.amount} via ${paymentData.paymentMode}`,
        userId: auth.uid,
        timestamp: Date.now()
      });

      return resultData;
    });

    return result;
  } catch (error: any) {
    console.error("Payment Transaction failed: ", error);
    throw new HttpsError('internal', error.message || 'An error occurred while receiving payment.');
  }
});
