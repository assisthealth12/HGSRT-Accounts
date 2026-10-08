import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useQueryClient } from '@tanstack/react-query';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { useBookingsInRange } from '@/hooks/useBookings';
import { bookingTotal } from '@/domain/booking';
import { formatINR } from '@/domain/money';
import { logAudit } from '@/lib/audit';
import { toast } from '@/hooks/use-toast';
import { confirmAction } from '@/hooks/use-confirm';
import { Loader2, AlertTriangle } from 'lucide-react';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

const CHUNK_SIZE = 400;

export function BulkDeleteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const propertyId = useAuthStore((state) => state.propertyId);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const queryClient = useQueryClient();

  const [from, setFrom] = useState(firstOfMonthISO());
  const [to, setTo] = useState(todayISO());
  const [importedOnly, setImportedOnly] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: bookings = [], isLoading } = useBookingsInRange(from, to);

  const visibleBookings = useMemo(() => {
    return importedOnly ? bookings.filter(b => b.source === 'bulk-import') : bookings;
  }, [bookings, importedOnly]);

  // Default to everything visible selected when the filtered list changes — safer to
  // start from "all of what's shown" than to make someone click every row by hand.
  useEffect(() => {
    setSelected(new Set(visibleBookings.map(b => b.id)));
  }, [visibleBookings]);

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(prev => prev.size === visibleBookings.length ? new Set() : new Set(visibleBookings.map(b => b.id)));
  };

  const reset = () => {
    setSelected(new Set());
    setIsDeleting(false);
  };

  const handleDelete = async () => {
    if (!propertyId || !user || selected.size === 0) return;

    const ok = await confirmAction({
      title: 'Confirm Bulk Delete',
      description: `This will delete ${selected.size} booking(s). They are soft-deleted (recoverable from Firestore by support if truly needed, but gone from every screen immediately) — payments already recorded against them are NOT deleted, per the system's append-only payment history. Continue?`,
      variant: 'destructive',
    });
    if (!ok) return;

    setIsDeleting(true);
    const ids = Array.from(selected);
    const now = Date.now();

    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      const chunk = ids.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const id of chunk) {
        batch.update(doc(db, 'bookings', id), { deletedAt: now, deletedBy: user.uid });
      }
      await batch.commit();
    }

    await logAudit({
      propertyId,
      userId: user.uid,
      userRole: role,
      action: 'delete',
      entityType: 'booking',
      entityId: `bulk-delete-${now}`,
      changes: [{ field: 'bulkDeleteCount', oldValue: null, newValue: ids.length }],
    });

    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    toast({ title: 'Deleted', description: `${ids.length} booking(s) deleted.` });
    setIsDeleting(false);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Delete Bookings</DialogTitle>
          <DialogDescription>Pick a date range, review exactly what will be deleted, then confirm.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label>From (Check-in)</Label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <Label>To (Check-in)</Label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm pb-2 cursor-pointer select-none">
            <Checkbox checked={importedOnly} onCheckedChange={(v) => setImportedOnly(!!v)} />
            Only show Bulk-Imported bookings (safer)
          </label>
        </div>

        {!importedOnly && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            This will also show bookings entered manually through the app in this date range, not just imported ones. Double-check your selection before deleting.
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">{visibleBookings.length} booking(s) in range</span>
          <button className="text-emerald-700 font-medium hover:underline" onClick={toggleAll}>
            {selected.size === visibleBookings.length && visibleBookings.length > 0 ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div className="flex-1 overflow-auto border rounded-lg">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-gray-400">Loading…</div>
          ) : visibleBookings.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">No bookings in this range{importedOnly ? ' from a bulk import' : ''}.</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="p-2 w-8"></th>
                  <th className="p-2 text-left">Guest</th>
                  <th className="p-2 text-left">Check-in</th>
                  <th className="p-2 text-left">Total</th>
                  <th className="p-2 text-left">Source</th>
                </tr>
              </thead>
              <tbody>
                {visibleBookings.map(b => (
                  <tr key={b.id} className="border-t">
                    <td className="p-2">
                      <Checkbox checked={selected.has(b.id)} onCheckedChange={() => toggleOne(b.id)} />
                    </td>
                    <td className="p-2">{b.guestName}</td>
                    <td className="p-2">{b.checkIn}</td>
                    <td className="p-2">{formatINR(bookingTotal(b))}</td>
                    <td className="p-2">
                      {b.source === 'bulk-import'
                        ? <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Imported</Badge>
                        : <Badge variant="secondary">Manual</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={selected.size === 0 || isDeleting}
          >
            {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Delete {selected.size} Booking(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
