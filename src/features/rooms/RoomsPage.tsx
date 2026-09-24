import React, { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Room } from '@/domain/room';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/button';
import { RoomForm } from '@/components/forms/RoomForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Define columns for the table
const columns: ColumnDef<Room>[] = [
  {
    accessorKey: 'roomNumber',
    header: 'Room',
  },
  {
    accessorKey: 'roomTypeId', // Ideally mapped to name via relationships
    header: 'Type',
  },
  {
    accessorKey: 'floor',
    header: 'Floor',
    cell: ({ row }) => row.original.floor || '-',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      // Simple coloring logic based on status
      let colorClass = 'text-foreground';
      if (status === 'Available') colorClass = 'text-success';
      if (status === 'Occupied') colorClass = 'text-primary';
      if (status === 'Dirty') colorClass = 'text-warning';
      if (status === 'Maintenance' || status === 'Blocked') colorClass = 'text-destructive';

      return <span className={`font-medium ${colorClass}`}>{status}</span>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const room = row.original;
      return (
        <Button variant="outline" size="sm" onClick={() => console.log('Edit Room', room.id)}>
          Edit
        </Button>
      );
    },
  },
];

// Mock data until Firebase is wired up
const mockRooms: Room[] = [
  {
    id: 'r1',
    propertyId: 'hotel-001',
    roomNumber: '101',
    roomTypeId: 'type-1',
    floor: '1st Floor',
    status: 'Available',
    active: true,
    createdAt: Date.now(),
    createdBy: 'admin',
    updatedAt: Date.now(),
    updatedBy: 'admin',
  },
  {
    id: 'r2',
    propertyId: 'hotel-001',
    roomNumber: '102',
    roomTypeId: 'type-2',
    floor: '1st Floor',
    status: 'Occupied',
    active: true,
    createdAt: Date.now(),
    createdBy: 'admin',
    updatedAt: Date.now(),
    updatedBy: 'admin',
  },
  {
    id: 'r3',
    propertyId: 'hotel-001',
    roomNumber: '201',
    roomTypeId: 'type-1',
    floor: '2nd Floor',
    status: 'Dirty',
    active: true,
    createdAt: Date.now(),
    createdBy: 'admin',
    updatedAt: Date.now(),
    updatedBy: 'admin',
  }
];

// Mock Room Types
const mockRoomTypes = [
  { id: 'type-1', name: 'Standard' },
  { id: 'type-2', name: 'Executive' },
];

export function RoomsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSubmit = (data: any) => {
    console.log('Room data submitted:', data);
    setIsDialogOpen(false);
    // TODO: Wire up to TanStack Query mutation -> Firebase
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Rooms</h2>
          <p className="text-muted-foreground">
            Manage your physical rooms and their current statuses.
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>Add Room</Button>
      </div>

      <DataTable 
        columns={columns} 
        data={mockRooms} 
        searchKey="roomNumber" 
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Room</DialogTitle>
          </DialogHeader>
          <RoomForm roomTypes={mockRoomTypes} onSubmit={handleSubmit} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
