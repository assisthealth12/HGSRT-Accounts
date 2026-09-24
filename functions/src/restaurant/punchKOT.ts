import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const punchKOT = onCall(async (request) => {
  const { data, auth } = request;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { propertyId, tableId, items, orderId } = data;
  if (!propertyId || !items || items.length === 0) {
    throw new HttpsError('invalid-argument', 'Missing propertyId or items');
  }

  try {
    const result = await db.runTransaction(async (transaction) => {
      let currentOrderId = orderId;
      let orderRef;

      // 1. Check Table Status if tableId is provided (Dine-In)
      if (tableId) {
        const tableRef = db.collection('restaurantTables').doc(tableId);
        const tableDoc = await transaction.get(tableRef);
        
        if (tableDoc.exists) {
           // Mark table as occupied
           transaction.update(tableRef, { status: 'Occupied' });
        }
      }

      // 2. Create or Update the main RestaurantOrder
      if (currentOrderId) {
        orderRef = db.collection('restaurantOrders').doc(currentOrderId);
        // We would fetch and append items here in a real scenario
      } else {
        orderRef = db.collection('restaurantOrders').doc();
        currentOrderId = orderRef.id;
        
        // Transform incoming items into OrderItems with amounts calculated
        const orderItems = items.map((item: any) => ({
          menuItemId: item.menuItem.id,
          name: item.menuItem.name,
          quantity: item.quantity,
          unitPrice: item.menuItem.price,
          amount: item.menuItem.price * item.quantity,
          taxRatePercent: item.menuItem.taxRatePercent || 5, // Default 5%
          // Simplified tax for example
          taxAmount: { totalTax: Math.round((item.menuItem.price * item.quantity * 5) / 100), breakdown: [] }, 
          totalAmount: (item.menuItem.price * item.quantity) + Math.round((item.menuItem.price * item.quantity * 5) / 100)
        }));

        const subtotal = orderItems.reduce((acc: number, item: any) => acc + item.amount, 0);
        const taxTotal = orderItems.reduce((acc: number, item: any) => acc + item.taxAmount.totalTax, 0);

        transaction.set(orderRef, {
          propertyId,
          tableId,
          type: tableId ? 'Dine-In' : 'Takeaway',
          items: orderItems,
          subtotal,
          discount: 0,
          taxableTotal: subtotal,
          taxTotal: { totalTax: taxTotal, breakdown: [] },
          grandTotal: subtotal + taxTotal,
          status: 'Open',
          isVoided: false,
          createdAt: Date.now(),
          createdBy: auth.uid,
          updatedAt: Date.now(),
          updatedBy: auth.uid,
        });
      }

      // 3. Create the KOT (Kitchen Order Ticket)
      const kotRef = db.collection('kots').doc();
      const kotItems = items.map((item: any) => ({
        menuItemId: item.menuItem.id,
        name: item.menuItem.name,
        quantity: item.quantity,
        status: 'Pending'
      }));

      transaction.set(kotRef, {
        propertyId,
        orderId: currentOrderId,
        tableId,
        items: kotItems,
        status: 'Pending',
        waiterId: auth.uid,
        createdAt: Date.now(),
        createdBy: auth.uid,
      });

      return { orderId: currentOrderId, kotId: kotRef.id };
    });

    return result;
  } catch (error: any) {
    console.error("Punch KOT failed: ", error);
    throw new HttpsError('internal', error.message || 'An error occurred while punching KOT.');
  }
});
