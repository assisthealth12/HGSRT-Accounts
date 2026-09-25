import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import PDFDocument from 'pdfkit';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

function formatINR(paise: number): string {
  return `Rs. ${(paise / 100).toFixed(2)}`;
}

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
    // 1. Fetch Stay
    const stayDoc = await db.collection('stays').doc(stayId).get();
    if (!stayDoc.exists) throw new HttpsError('not-found', 'Stay not found');
    const stay = stayDoc.data()!;

    // 2. Fetch Charges
    const chargesSnapshot = await db.collection('charges')
      .where('stayId', '==', stayId)
      .where('isVoided', '==', false)
      .get();
    const charges = chargesSnapshot.docs.map(d => d.data());

    // 3. Fetch Payments (allocated against this stay's customer)
    const paymentsSnapshot = await db.collection('payments')
      .where('customerId', '==', stay.customerId)
      .where('isReversed', '==', false)
      .get();
    const payments = paymentsSnapshot.docs.map(d => d.data());

    // 4. Fetch Property (for header) and Customer (for bill-to)
    const [propertyDoc, customerDoc] = await Promise.all([
      db.collection('properties').doc(propertyId).get(),
      db.collection('customers').doc(stay.customerId).get(),
    ]);
    const property = propertyDoc.data();
    const customer = customerDoc.data();

    // 5. Generate the PDF
    const doc = new PDFDocument({ margin: 50 });
    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));

    const pdfDone = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
    });

    doc.fontSize(18).text(property?.name || 'Hotel Invoice', { align: 'left' });
    if (property?.address) doc.fontSize(9).fillColor('gray').text(property.address);
    if (property?.gstin) doc.fontSize(9).text(`GSTIN: ${property.gstin}`);
    doc.moveDown();

    doc.fillColor('black').fontSize(12).text(`Bill To: ${customer?.name || 'Guest'}`);
    if (customer?.phone) doc.fontSize(10).text(`Phone: ${customer.phone}`);
    if (customer?.gstin) doc.fontSize(10).text(`Customer GSTIN: ${customer.gstin}`);
    doc.fontSize(10).text(`Stay: ${stay.checkInDate} to ${stay.expectedCheckOutDate}`);
    doc.moveDown();

    doc.fontSize(13).text('Charges', { underline: true });
    doc.moveDown(0.5);
    let totalCharges = 0;
    charges.forEach((c: any) => {
      totalCharges += c.totalAmount;
      doc.fontSize(10).text(
        `${c.businessDate}  ${c.type.padEnd(12)}  ${c.description}`,
        { continued: true }
      );
      doc.text(formatINR(c.totalAmount), { align: 'right' });
    });
    doc.moveDown();
    doc.fontSize(11).text(`Total Charges: ${formatINR(totalCharges)}`, { align: 'right' });
    doc.moveDown();

    doc.fontSize(13).text('Payments', { underline: true });
    doc.moveDown(0.5);
    let totalPayments = 0;
    payments.forEach((p: any) => {
      totalPayments += p.amount;
      doc.fontSize(10).text(
        `${p.paymentDate}  ${p.paymentMode}  ${p.receiptNumber}`,
        { continued: true }
      );
      doc.text(formatINR(p.amount), { align: 'right' });
    });
    doc.moveDown();
    doc.fontSize(11).text(`Total Payments: ${formatINR(totalPayments)}`, { align: 'right' });
    doc.moveDown();

    const balance = totalCharges - totalPayments;
    doc.fontSize(13).text(`Balance Due: ${formatINR(balance)}`, { align: 'right' });

    doc.end();
    const pdfBuffer = await pdfDone;

    // 6. Upload to Firebase Storage
    const bucket = admin.storage().bucket();
    const filePath = `invoices/${propertyId}/${stayId}-${Date.now()}.pdf`;
    const file = bucket.file(filePath);
    await file.save(pdfBuffer, { contentType: 'application/pdf' });

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    return { url };
  } catch (error: any) {
    console.error("Generate PDF failed: ", error);
    throw new HttpsError('internal', error.message || 'An error occurred generating the PDF.');
  }
});
