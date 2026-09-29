import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useExpenseCategories, useCreateExpenseCategory, useDeleteExpenseCategory } from '@/hooks/useExpenseCategories';
import { useRoomTypes } from '@/hooks/useRoomTypes';
import { useCreateRoomType, useDeleteRoomType } from '@/hooks/useCreateRoomType';
import { useRooms } from '@/hooks/useRooms';
import { useCreateRoom, useDeleteRoom } from '@/hooks/useCreateRoom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { Settings } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function SimpleLookupCard({
  title,
  items,
  onAdd,
  onDelete,
  isAdding,
}: {
  title: string;
  items: { id: string; name: string }[];
  onAdd: (name: string) => Promise<any>;
  onDelete: (item: any) => Promise<any>;
  isAdding: boolean;
}) {
  const [name, setName] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) return;
    await onAdd(name.trim());
    setName('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-3">
          {items.length === 0 && <span className="text-muted-foreground text-sm">None added yet.</span>}
          {items.map(item => (
            <Badge key={item.id} variant="secondary" className="flex items-center gap-2 py-1.5 px-4 rounded-full text-sm font-medium">
              {item.name}
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                onClick={() => onDelete(item)}
                aria-label={`Remove ${item.name}`}
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-3 items-center max-w-md">
          <Input
            placeholder="Add new..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
          />
          <Button type="button" onClick={handleAdd} disabled={isAdding}>Add</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RoomTypesCard() {
  const { data: roomTypes = [] } = useRoomTypes();
  const { mutateAsync: createRoomType, isPending } = useCreateRoomType();
  const { mutateAsync: deleteRoomType } = useDeleteRoomType();
  const [name, setName] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) return;
    await createRoomType({ name: name.trim(), sortOrder: roomTypes.length });
    setName('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Room Types</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-3">
          {roomTypes.length === 0 && <span className="text-muted-foreground text-sm">None added yet.</span>}
          {roomTypes.map(rt => (
            <Badge key={rt.id} variant="secondary" className="flex items-center gap-2 py-1.5 px-4 rounded-full text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100">
              {rt.name}
              <button
                type="button"
                className="text-slate-400 hover:text-red-500 transition-colors ml-1"
                onClick={() => deleteRoomType(rt)}
                aria-label={`Remove ${rt.name}`}
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-3 items-center max-w-md">
          <Input placeholder="e.g. Executive" value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="button" onClick={handleAdd} disabled={isPending}>Add</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RoomsManagementCard() {
  const { data: rooms = [] } = useRooms();
  const { data: roomTypes = [] } = useRoomTypes();
  const { mutateAsync: createRoom, isPending } = useCreateRoom();
  const { mutateAsync: deleteRoom } = useDeleteRoom();

  const [roomNumber, setRoomNumber] = useState('');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [baseTariff, setBaseTariff] = useState('');
  const [floor, setFloor] = useState('');

  const handleAdd = async () => {
    if (!roomNumber.trim() || !roomTypeId || !baseTariff) return;
    await createRoom({
      roomNumber: roomNumber.trim(),
      roomTypeId,
      baseTariff: parseInt(baseTariff, 10),
      isActive: true,
      floor: floor.trim()
    });
    setRoomNumber('');
    // Keep roomTypeId and baseTariff / floor to quickly add multiple similar rooms
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Rooms</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-3">
          {rooms.length === 0 && <span className="text-muted-foreground text-sm">No rooms added yet.</span>}
          {rooms.map(room => {
            const rt = roomTypes.find(t => t.id === room.roomTypeId);
            return (
              <Badge key={room.id} variant="secondary" className="flex items-center gap-2 py-1.5 px-4 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                {room.roomNumber} ({rt?.name || 'Unknown'}) - ₹{room.baseTariff}
                <button
                  type="button"
                  className="text-emerald-400 hover:text-red-500 transition-colors ml-1"
                  onClick={() => deleteRoom(room)}
                  aria-label={`Remove ${room.roomNumber}`}
                >
                  ×
                </button>
              </Badge>
            );
          })}
        </div>
        <div className="flex flex-col md:flex-row gap-3 items-end">
          <div className="space-y-1.5 flex-1">
            <label className="text-xs font-medium text-muted-foreground">Room Number</label>
            <Input placeholder="e.g. 101" value={roomNumber} onChange={e => setRoomNumber(e.target.value)} />
          </div>
          <div className="space-y-1.5 flex-1">
            <label className="text-xs font-medium text-muted-foreground">Room Type</label>
            <Select value={roomTypeId} onValueChange={setRoomTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                {roomTypes.map(rt => (
                  <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 w-24">
            <label className="text-xs font-medium text-muted-foreground">Floor</label>
            <Input placeholder="e.g. 1" value={floor} onChange={e => setFloor(e.target.value)} />
          </div>
          <div className="space-y-1.5 flex-1">
            <label className="text-xs font-medium text-muted-foreground">Base Tariff (₹)</label>
            <Input type="number" placeholder="1500" value={baseTariff} onChange={e => setBaseTariff(e.target.value)} />
          </div>
          <Button type="button" onClick={handleAdd} disabled={isPending || !roomNumber || !roomTypeId || !baseTariff} className="w-full md:w-auto">
            Add Room
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsPage() {
  const { data: expenseCategories = [] } = useExpenseCategories();
  const { mutateAsync: createExpenseCategory, isPending: isAddingCategory } = useCreateExpenseCategory();
  const { mutateAsync: deleteExpenseCategory } = useDeleteExpenseCategory();

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <PageHeader
        icon={Settings}
        title="Settings"
        description="Manage the lookup lists used across the app — add a new room type, room, or expense category here and it shows up everywhere immediately, no code change needed."
      />

      <Tabs defaultValue="rooms" className="w-full">
        <TabsList className="mb-6 bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="rooms" className="rounded-lg px-6 font-semibold">Room Types</TabsTrigger>
          <TabsTrigger value="lookups" className="rounded-lg px-6 font-semibold">System Lists</TabsTrigger>
        </TabsList>

        <TabsContent value="rooms" className="mt-0 space-y-6">
          <RoomTypesCard />
          <RoomsManagementCard />
        </TabsContent>

        <TabsContent value="lookups" className="mt-0 space-y-6">
          <SimpleLookupCard
            title="Expense Categories"
            items={expenseCategories}
            onAdd={createExpenseCategory}
            onDelete={deleteExpenseCategory}
            isAdding={isAddingCategory}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
