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
import { useRooms } from '@/hooks/useRooms';
import { useRoomTypes } from '@/hooks/useRoomTypes';
import { useCreateRoom, useUpdateRoom, useDeleteRoom } from '@/hooks/useCreateRoom';
import { useAuthStore } from '@/store/authStore';

export function RoomsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  const { data: rooms = [], isLoading: isLoadingRooms } = useRooms();
  const { data: roomTypes = [] } = useRoomTypes();
  const { mutateAsync: createRoom, isPending: isCreatingRoom } = useCreateRoom();
  const { mutateAsync: updateRoom, isPending: isUpdatingRoom } = useUpdateRoom();
  const { mutateAsync: deleteRoom } = useDeleteRoom();
  const role = useAuthStore((state) => state.role);

  const roomTypeName = (roomTypeId: string) =>
    roomTypes.find(t => t.id === roomTypeId)?.name || roomTypeId;

  const handleDelete = async (room: Room) => {
    if (!confirm(`Delete room ${room.roomNumber}? This can be reviewed later in the audit log.`)) return;
    await deleteRoom(room);
  };

  const columns: ColumnDef<Room>[] = [
    {
      accessorKey: 'roomNumber',
      header: 'Room',
    },
    {
      accessorKey: 'roomTypeId',
      header: 'Type',
      cell: ({ row }) => roomTypeName(row.original.roomTypeId),
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
      cell: ({ row }) => (
        <div className="space-x-2">
          <Button variant="outline" size="sm" onClick={() => { setEditingRoom(row.original); setIsDialogOpen(true); }}>
            Edit
          </Button>
          {role === 'admin' && (
            <Button variant="outline" size="sm" onClick={() => handleDelete(row.original)}>
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  const handleSubmit = async (data: any) => {
    if (editingRoom) {
      await updateRoom({ id: editingRoom.id, data, previous: editingRoom });
    } else {
      await createRoom(data);
    }
    setIsDialogOpen(false);
    setEditingRoom(null);
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
        <Button onClick={() => { setEditingRoom(null); setIsDialogOpen(true); }}>Add Room</Button>
      </div>

      {isLoadingRooms ? (
        <div className="py-12 text-center text-muted-foreground">Loading rooms...</div>
      ) : (
        <DataTable
          columns={columns}
          data={rooms}
          searchKey="roomNumber"
        />
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingRoom(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRoom ? 'Edit Room' : 'Add New Room'}</DialogTitle>
          </DialogHeader>
          {roomTypes.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No room types configured yet. Add room types before creating rooms.
            </p>
          )}
          <RoomForm
            roomTypes={roomTypes}
            onSubmit={handleSubmit}
            isLoading={isCreatingRoom || isUpdatingRoom}
            initialData={editingRoom ?? undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
