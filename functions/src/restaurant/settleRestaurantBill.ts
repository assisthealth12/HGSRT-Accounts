import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const settleRestaurantBill = onCall(async (request) => {
  const { data, auth } = request;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { propertyId, orderId, settleToRoom, stayId, paymentData } = data;
  if (!propertyId || !orderId) {
    throw new HttpsError('invalid-argument', 'Missing propertyId or orderId');
  }

  try {
    const result = await db.runTransaction(async (transaction) => {
      const orderRef = db.collection('restaurantOrders').doc(orderId);
      const orderDoc = await transaction.get(orderRef);
      
      if (!orderDoc.exists) {
        throw new HttpsError('not-found', 'Order not found');
      }
      
      const order = orderDoc.data()!;
      if (order.status === 'Settled' || order.status === 'Cancelled') {
         throw new HttpsError('failed-precondition', 'Order is already settled or cancelled.');
      }

      // If settling to a Room Folio
      if (settleToRoom && stayId) {
        // Create a Folio Charge
        const chargeRef = db.collection('charges').doc();
        const businessDate = new Date().toISOString().split('T')[0]; // Typically fetched from property settings

        transaction.set(chargeRef, {
          propertyId,
          stayId,
          businessDate,
          type: 'Restaurant',
          description: `Restaurant Bill - Order ${orderId}`,
          baseAmount: order.subtotal,
          discount: order.discount,
          taxableAmount: order.taxableTotal,
          taxRatePercent: 5, // Simplified
          taxAmount: order.taxTotal,
          totalAmount: order.grandTotal,
          isVoided: false,
          createdAt: Date.now(),
          createdBy: auth.uid,
          updatedAt: Date.now(),
          updatedBy: auth.uid,
        });

        // Update Order
        transaction.update(orderRef, { 
          status: 'Settled',
          chargeId: chargeRef.id,
          updatedAt: Date.now(),
          updatedBy: auth.uid
        });

      } else if (paymentData) {
        // Settling immediately at POS (Cash/Card)
        // Note: Real implementation should call the `receivePayment` logic via shared internal method
        const paymentRef = db.collection('payments').doc();
        transaction.set(paymentRef, {
          ...paymentData,
          propertyId,
          allocatedAmount: paymentData.amount, // Fully allocated to this POS receipt
          unallocatedAmount: 0,
          status: 'Received',
          isReversed: false,
          createdAt: Date.now(),
          createdBy: auth.uid,
        });

        // Update Order
        transaction.update(orderRef, { 
          status: 'Settled',
          paymentId: paymentRef.id,
          updatedAt: Date.now(),
          updatedBy: auth.uid
        });
      } else {
        throw new HttpsError('invalid-argument', 'Must provide either stayId or paymentData to settle.');
      }

      // Free the table
      if (order.tableId) {
        const tableRef = db.collection('restaurantTables').doc(order.tableId);
        transaction.update(tableRef, { status: 'Available' });
      }

      return { success: true };
    });

    return result;
  } catch (error: any) {
    console.error("Settle Bill failed: ", error);
    throw new HttpsError('internal', error.message || 'An error occurred while settling bill.');
  }
});
