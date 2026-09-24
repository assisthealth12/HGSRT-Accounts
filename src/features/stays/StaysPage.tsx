import React, { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Stay } from '@/domain/stay';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/button';
import { StayForm } from '@/components/forms/StayForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useStays } from '@/hooks/useStays';
import { useRooms } from '@/hooks/useRooms';
import { useCustomers } from '@/hooks/useCustomers';
import { useNavigate } from 'react-router-dom';

export function StaysPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();

  const { data: stays = [], isLoading: isLoadingStays } = useStays();
  const { data: rooms = [] } = useRooms();
  const { data: customers = [] } = useCustomers();

  const columns: ColumnDef<Stay>[] = [
    {
      id: 'guest',
      header: 'Primary Guest',
      cell: ({ row }) => row.original.guests[0]?.name || 'Unknown',
    },
    {
      accessorKey: 'checkInDate',
      header: 'Check-In',
    },
    {
      accessorKey: 'expectedCheckOutDate',
      header: 'Expected Check-Out',
    },
    {
      id: 'room',
      header: 'Room',
      cell: ({ row }) => {
        const roomId = row.original.roomAssignments[0]?.roomId;
        const room = rooms.find(r => r.id === roomId);
        return room ? room.roomNumber : (roomId || 'N/A');
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        let colorClass = 'text-foreground';
        if (status === 'In-House') colorClass = 'text-primary font-bold';
        if (status === 'Reserved') colorClass = 'text-warning';
        if (status === 'Checked-Out') colorClass = 'text-success';
        if (status === 'Cancelled' || status === 'No-Show') colorClass = 'text-destructive';

        return <span className={colorClass}>{status}</span>;
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        return (
          <div className="space-x-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/stays/${row.original.id}`)}>
              Folio
            </Button>
          </div>
        );
      },
    },
  ];

  const handleSubmit = (data: any) => {
    // We would dispatch this to the checkInGuest Cloud Function
    console.log('Stay data submitted to API:', data);
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Stays & Check-Ins</h2>
          <p className="text-muted-foreground">
            Manage your in-house guests, reservations, and check-outs.
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>New Check-In</Button>
      </div>

      {isLoadingStays ? (
        <div className="py-12 text-center text-muted-foreground">Loading stays...</div>
      ) : (
        <DataTable 
          columns={columns} 
          data={stays} 
        />
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Reservation / Check-In</DialogTitle>
          </DialogHeader>
          <StayForm customers={customers} rooms={rooms} onSubmit={handleSubmit} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
