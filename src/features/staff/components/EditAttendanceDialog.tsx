import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useMarkAttendance } from '@/hooks/useAttendance';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type Status = 'present' | 'paid_leave' | 'absent' | null;

interface EditAttendanceDialogProps {
  editCell: {
    staffId: string;
    staffName: string;
    date: string; // YYYY-MM-DD
    existing?: { status: Status };
    canTakePaidLeave?: boolean;
  } | null;
  onClose: () => void;
}

export function EditAttendanceDialog({ editCell, onClose }: EditAttendanceDialogProps) {
  const { mutateAsync: markAttendance, isPending: isMarking } = useMarkAttendance();
  const [selectedStatus, setSelectedStatus] = useState<Status>(null);

  useEffect(() => {
    if (editCell) {
      setSelectedStatus(editCell.existing?.status || null);
    }
  }, [editCell]);

  const handleConfirm = async () => {
    if (!editCell || !selectedStatus) return;
    
    await markAttendance({
      staffId: editCell.staffId,
      date: editCell.date,
      status: selectedStatus,
      existing: editCell.existing as any,
    });
    
    onClose();
  };

  const getStatusLabel = (status: Status) => {
    if (status === 'present') return 'Present';
    if (status === 'paid_leave') return 'Paid Leave';
    if (status === 'absent') return 'Absent';
    return 'Not Marked';
  };

  const hasChanged = selectedStatus !== (editCell?.existing?.status || null);

  return (
    <Dialog open={!!editCell} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Attendance Edit</DialogTitle>
          {editCell && (
            <p className="text-sm text-gray-500">
              Editing attendance for <span className="font-bold text-gray-900">{editCell.staffName}</span> on <span className="font-bold text-gray-900">{format(new Date(editCell.date), 'MMMM d, yyyy')}</span>.
            </p>
          )}
        </DialogHeader>
        
        <div className="mt-4 space-y-6">
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Select New Status</label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant={selectedStatus === 'present' ? 'default' : 'outline'}
                className={cn(
                  "font-bold transition-all",
                  selectedStatus === 'present' ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
                )}
                onClick={() => setSelectedStatus('present')}
              >
                Present
              </Button>
              <Button
                variant={selectedStatus === 'paid_leave' ? 'default' : 'outline'}
                className={cn(
                  "font-bold transition-all",
                  selectedStatus === 'paid_leave' ? "bg-amber-500 hover:bg-amber-600 text-white" : "text-gray-600 hover:bg-amber-50 hover:text-amber-700",
                  editCell?.canTakePaidLeave === false && selectedStatus !== 'paid_leave' && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => setSelectedStatus('paid_leave')}
                disabled={editCell?.canTakePaidLeave === false && selectedStatus !== 'paid_leave'}
                title={editCell?.canTakePaidLeave === false && selectedStatus !== 'paid_leave' ? "Monthly paid leave limit reached" : ""}
              >
                Paid Leave
              </Button>
              <Button
                variant={selectedStatus === 'absent' ? 'default' : 'outline'}
                className={cn(
                  "font-bold transition-all",
                  selectedStatus === 'absent' ? "bg-red-600 hover:bg-red-700 text-white" : "text-gray-600 hover:bg-red-50 hover:text-red-700"
                )}
                onClick={() => setSelectedStatus('absent')}
              >
                Absent
              </Button>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col gap-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 font-medium">Current Status:</span>
              <span className="font-bold text-gray-900">{getStatusLabel(editCell?.existing?.status || null)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 font-medium">New Status:</span>
              <span className={cn(
                "font-black",
                selectedStatus === 'present' ? "text-emerald-600" :
                selectedStatus === 'paid_leave' ? "text-amber-600" :
                selectedStatus === 'absent' ? "text-red-600" : "text-gray-400"
              )}>
                {getStatusLabel(selectedStatus)}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="font-bold">
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={isMarking || !hasChanged || !selectedStatus}
              className={cn(
                "font-bold",
                selectedStatus === 'present' ? "bg-emerald-600 hover:bg-emerald-700 text-white" :
                selectedStatus === 'paid_leave' ? "bg-amber-600 hover:bg-amber-700 text-white" :
                selectedStatus === 'absent' ? "bg-red-600 hover:bg-red-700 text-white" : ""
              )}
            >
              {isMarking ? 'Saving...' : 'Confirm & Save Edit'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
