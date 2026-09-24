import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
// import PDFDocument from 'pdfkit'; // Example dependency you'd install

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const generateInvoicePDF = onCall(async (request) => {
  const { data, auth } = request;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { propertyId, stayId } = data;
  if (!propertyId || !stayId) {
    throw new HttpsError('invalid-argument', 'Missing propertyId or stayId');
  }

  try {
    // 1. Fetch Stay Data
    const stayDoc = await db.collection('stays').doc(stayId).get();
    if (!stayDoc.exists) throw new HttpsError('not-found', 'Stay not found');

    // 2. Fetch Charges
    const chargesSnapshot = await db.collection('charges')
      .where('stayId', '==', stayId)
      .where('isVoided', '==', false)
      .get();
      
    // 3. Fetch Payments
    const paymentsSnapshot = await db.collection('payments')
      // Note: we'd ideally have a stayId on the payment, or link through an invoice document
      // For this stub, we just pretend we fetch them.
      .limit(1)
      .get();

    // 4. Generate PDF using pdfkit or similar library
    // const doc = new PDFDocument();
    // doc.text(`Invoice for Stay ${stayId}`);
    // ... add data to PDF ...
    
    // 5. Upload to Firebase Storage
    // const bucket = admin.storage().bucket();
    // const file = bucket.file(`invoices/${propertyId}/${stayId}.pdf`);
    // await file.save(doc.read());
    // const [url] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });

    // Return the URL so the frontend can download it
    return { url: 'https://example.com/mock-invoice.pdf' };
    
  } catch (error: any) {
    console.error("Generate PDF failed: ", error);
    throw new HttpsError('internal', error.message || 'An error occurred generating the PDF.');
  }
});
