import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { useRooms } from '@/hooks/useRooms';
import { useBookingsInRange } from '@/hooks/useBookings';
import { formatINR } from '@/domain/money';
import { parseImportFile, validateRows, ValidatedImportRow } from '@/lib/bulkImportBookings';
import { toast } from '@/hooks/use-toast';
import { confirmAction } from '@/hooks/use-confirm';
import { Upload, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

const CHUNK_SIZE = 200; // up to 2 writes/row (booking + payment) -> 400 writes/batch, under Firestore's 500 cap

type Stage = 'pick' | 'preview' | 'importing' | 'done';

export function BulkImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const propertyId = useAuthStore((state) => state.propertyId);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const { data: rooms = [] } = useRooms();

  const [stage, setStage] = useState<Stage>('pick');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ValidatedImportRow[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);

  // Degenerate, matches-nothing range until a file is actually loaded — avoids an
  // unbounded full-history fetch just from opening the dialog.
  const dateBounds = useMemo(() => {
    const dates = rows.map(r => r.checkIn).filter(Boolean).sort();
    if (dates.length === 0) return { start: '9999-01-01', end: '9999-01-01' };
    return { start: dates[0], end: dates[dates.length - 1] };
  }, [rows]);

  const { data: existingBookings = [] } = useBookingsInRange(dateBounds.start, dateBounds.end);
  const existingKeys = useMemo(() => {
    return new Set(existingBookings.flatMap(b =>
      (b.roomIds || []).map(roomId => `${roomId}|${b.checkIn}|${b.guestName.trim().toLowerCase()}`)
    ));
  }, [existingBookings]);

  const rowsWithDuplicateFlag = useMemo(() => {
    return rows.map(r => {
      if (r.errors.length > 0 || !r.roomId) return r;
      const key = `${r.roomId}|${r.checkIn}|${r.guestName.trim().toLowerCase()}`;
      if (existingKeys.has(key)) {
        return { ...r, errors: [...r.errors, 'Already imported (matching guest + room + check-in date exists)'] };
      }
      return r;
    });
  }, [rows, existingKeys]);

  const validRows = rowsWithDuplicateFlag.filter(r => r.errors.length === 0);
  const invalidRows = rowsWithDuplicateFlag.filter(r => r.errors.length > 0);

  const reset = () => {
    setStage('pick');
    setFileName('');
    setRows([]);
    setImportProgress(0);
    setImportedCount(0);
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    try {
      const parsed = await parseImportFile(file);
      const validated = validateRows(parsed, rooms);
      setRows(validated);
      setStage('preview');
    } catch (err: any) {
      toast({ title: 'Could not read file', description: err.message || 'Make sure you used the provided template.', variant: 'destructive' });
    }
  };

  const handleImport = async () => {
    if (!propertyId || !user) return;
    const toImport = validRows;
    if (toImport.length === 0) return;

    const ok = await confirmAction({
      title: 'Confirm Bulk Import',
      description: `This will create ${toImport.length} booking(s) in the live system. This cannot be undone from here (you'd need to delete them one by one). Continue?`,
    });
    if (!ok) return;

    setStage('importing');
    let done = 0;

    for (let i = 0; i < toImport.length; i += CHUNK_SIZE) {
      const chunk = toImport.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      const now = Date.now();

      for (const row of chunk) {
        const bookingRef = doc(collection(db, 'bookings'));
        const bookingData: Record<string, any> = {
          guestName: row.guestName,
          occupancy: row.occupancy,
          roomIds: [row.roomId],
          checkIn: row.checkIn,
          checkOut: row.checkOut,
          nights: row.nights,
          tariff: Math.round((row.tariff || 0) * 100),
          gst: Math.round((row.gst || 0) * 100),
          addonAmount: Math.round((row.addonAmount || 0) * 100),
          mealPlanAmount: Math.round((row.mealPlanAmount || 0) * 100),
          mealPlanGst: Math.round((row.mealPlanGst || 0) * 100),
          discount: Math.round((row.discount || 0) * 100),
          propertyId,
          createdAt: now,
          createdBy: user.uid,
          updatedAt: now,
          updatedBy: user.uid,
        };
        if (row.mealPlan) bookingData.mealPlan = row.mealPlan;
        if (row.remarks) bookingData.remarks = row.remarks;
        batch.set(bookingRef, bookingData);

        if (row.amountPaid && row.amountPaid > 0) {
          const paymentRef = doc(collection(db, 'payments'));
          const paymentData: Record<string, any> = {
            bookingId: bookingRef.id,
            amount: Math.round(row.amountPaid * 100),
            paymentModeId: row.paymentModeId,
            paidOn: row.paymentDate || row.checkIn,
            propertyId,
            createdAt: now,
            createdBy: user.uid,
            updatedAt: now,
            updatedBy: user.uid,
          };
          paymentData.notes = 'Imported from Excel' + (row.remarks ? ` — ${row.remarks}` : '');
          batch.set(paymentRef, paymentData);
        }
      }

      await batch.commit();
      done += chunk.length;
      setImportedCount(done);
      setImportProgress(Math.round((done / toImport.length) * 100));
    }

    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['payments'] });
    setStage('done');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Import Bookings</DialogTitle>
          <DialogDescription>Upload a filled copy of the Bulk Booking Import template.</DialogDescription>
        </DialogHeader>

        {stage === 'pick' && (
          <div className="flex flex-col items-center justify-center gap-4 py-16 border-2 border-dashed rounded-xl border-gray-200">
            <Upload className="w-10 h-10 text-gray-400" />
            <div className="text-sm text-gray-500">Select the filled .xlsx file to preview it before importing anything.</div>
            <label className="inline-block">
              <input
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <span className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold cursor-pointer hover:bg-emerald-700">
                Choose File
              </span>
            </label>
          </div>
        )}

        {stage === 'preview' && (
          <div className="flex-1 overflow-hidden flex flex-col gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-gray-500 truncate">{fileName}</span>
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{validRows.length} Ready to Import</Badge>
              {invalidRows.length > 0 && (
                <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{invalidRows.length} Need Fixing / Already Imported</Badge>
              )}
            </div>

            <div className="flex-1 overflow-auto border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Row</th>
                    <th className="p-2 text-left">Guest</th>
                    <th className="p-2 text-left">Room</th>
                    <th className="p-2 text-left">Check-in → Check-out</th>
                    <th className="p-2 text-left">Total</th>
                    <th className="p-2 text-left">Paid</th>
                    <th className="p-2 text-left">Pending</th>
                    <th className="p-2 text-left">Payment</th>
                    <th className="p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rowsWithDuplicateFlag.map(row => (
                    <tr key={row.rowNumber} className={`border-t ${row.errors.length > 0 ? 'bg-red-50' : ''}`}>
                      <td className="p-2">{row.rowNumber}</td>
                      <td className="p-2">{row.guestName || '—'}</td>
                      <td className="p-2">{row.roomNumber || '—'}</td>
                      <td className="p-2 whitespace-nowrap">{row.checkIn} → {row.checkOut}</td>
                      <td className="p-2">{row.total !== null ? formatINR(Math.round(row.total * 100)) : '—'}</td>
                      <td className="p-2">{row.amountPaid !== null ? formatINR(Math.round(row.amountPaid * 100)) : '—'}</td>
                      <td className="p-2 font-semibold">
                        {row.total !== null && row.amountPaid !== null
                          ? formatINR(Math.round((row.total - row.amountPaid) * 100))
                          : '—'}
                      </td>
                      <td className="p-2">{row.paymentMode || '—'}</td>
                      <td className="p-2">
                        {row.errors.length === 0 ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" /> OK</span>
                        ) : (
                          <span className="inline-flex items-start gap-1 text-red-700">
                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>{row.errors.join('; ')}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {stage === 'importing' && (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            <div className="text-sm text-gray-600">Importing {importedCount} of {validRows.length}…</div>
            <div className="w-full max-w-sm bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className="bg-emerald-600 h-2 rounded-full transition-all" style={{ width: `${importProgress}%` }} />
            </div>
          </div>
        )}

        {stage === 'done' && (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            <div className="text-sm font-semibold text-gray-800">Imported {importedCount} booking(s) successfully.</div>
          </div>
        )}

        <DialogFooter>
          {stage === 'preview' && (
            <>
              <Button variant="outline" onClick={reset}>Choose a Different File</Button>
              <Button onClick={handleImport} disabled={validRows.length === 0} className="bg-emerald-600 hover:bg-emerald-700">
                Import {validRows.length} Booking(s)
              </Button>
            </>
          )}
          {stage === 'done' && (
            <Button onClick={() => { reset(); onOpenChange(false); }}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
