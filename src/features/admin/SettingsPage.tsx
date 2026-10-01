import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useExpenseCategories, useCreateExpenseCategory, useDeleteExpenseCategory } from '@/hooks/useExpenseCategories';
import { useAddons, useCreateAddon, useDeleteAddon } from '@/hooks/useAddons';
import { useRoomTypes } from '@/hooks/useRoomTypes';
import { useCreateRoomType, useDeleteRoomType } from '@/hooks/useCreateRoomType';
import { useRooms } from '@/hooks/useRooms';
import { useCreateRoom, useUpdateRoom, useDeleteRoom } from '@/hooks/useCreateRoom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { Settings, Edit2, Trash2, Plus, Bed, LayoutGrid, Check, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { formatINR } from '@/domain/money';
import { Room } from '@/domain/room';
import { confirmAction } from '@/hooks/use-confirm';
import { toast } from '@/hooks/use-toast';

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

  const handleDelete = async (item: any) => {
    const ok = await confirmAction({ title: 'Delete Item', description: `Are you sure you want to delete ${item.name}?` });
    if (ok) {
      await onDelete(item);
      toast({ title: 'Deleted', description: `${item.name} removed successfully.` });
    }
  };

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4">
        <CardTitle className="text-lg flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-gray-500" /> {title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="flex gap-3 items-center w-full max-w-md">
          <Input
            placeholder="Add new category..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
            className="h-11"
          />
          <Button type="button" onClick={handleAdd} disabled={isAdding || !name.trim()} className="h-11 px-6">
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {items.length === 0 && <span className="text-muted-foreground text-sm">None added yet.</span>}
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-2 py-2 px-4 rounded-xl text-sm font-medium bg-white border border-gray-200 shadow-sm">
              <span className="text-gray-700">{item.name}</span>
              <div className="w-px h-4 bg-gray-200 mx-1" />
              <button
                type="button"
                className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
                onClick={() => handleDelete(item)}
                aria-label={`Remove ${item.name}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AddonsCard() {
  const { data: addons = [] } = useAddons();
  const { mutateAsync: createAddon, isPending } = useCreateAddon();
  const { mutateAsync: deleteAddon } = useDeleteAddon();
  
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  const handleAdd = async () => {
    if (!name.trim() || !price) return;
    await createAddon({ name: name.trim(), price: Math.round(parseFloat(price) * 100) });
    setName('');
    setPrice('');
  };

  const handleDelete = async (addon: any) => {
    const ok = await confirmAction({ title: 'Delete Addon', description: `Are you sure you want to delete ${addon.name}?` });
    if (ok) {
      await deleteAddon(addon);
      toast({ title: 'Deleted', description: `${addon.name} removed successfully.` });
    }
  };

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4">
        <CardTitle className="text-lg flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-gray-500" /> Addons</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="flex gap-3 items-center w-full max-w-lg">
          <Input placeholder="Addon Name (e.g. Extra Bed)" value={name} onChange={(e) => setName(e.target.value)} className="h-11 flex-1" />
          <Input type="number" placeholder="Price (₹)" value={price} onChange={(e) => setPrice(e.target.value)} className="h-11 w-32" />
          <Button type="button" onClick={handleAdd} disabled={isPending || !name.trim() || !price} className="h-11 px-6">
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {addons.length === 0 && <span className="text-muted-foreground text-sm">None added yet.</span>}
          {addons.map(addon => (
            <div key={addon.id} className="flex items-center gap-2 py-2 px-4 rounded-xl text-sm font-medium bg-white border border-gray-200 shadow-sm">
              <span className="text-gray-700">{addon.name}</span>
              <span className="text-emerald-600 font-bold">{formatINR(addon.price)}</span>
              <div className="w-px h-4 bg-gray-200 mx-1" />
              <button
                type="button"
                className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
                onClick={() => handleDelete(addon)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
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

  const handleDelete = async (rt: any) => {
    const ok = await confirmAction({ title: 'Delete Room Type', description: `Are you sure you want to delete ${rt.name}?` });
    if (ok) {
      await deleteRoomType(rt);
      toast({ title: 'Deleted', description: `${rt.name} removed successfully.` });
    }
  };

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4">
        <CardTitle className="text-lg flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-gray-500" /> Room Types</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="flex gap-3 items-center w-full max-w-md">
          <Input placeholder="e.g. Executive" value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
          <Button type="button" onClick={handleAdd} disabled={isPending || !name.trim()} className="h-11 px-6">
            <Plus className="w-4 h-4 mr-2" />
            Add Type
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {roomTypes.length === 0 && <span className="text-muted-foreground text-sm">None added yet.</span>}
          {roomTypes.map(rt => (
            <div key={rt.id} className="flex items-center gap-2 py-2 px-4 rounded-xl text-sm font-bold bg-blue-50/50 border border-blue-100 text-blue-800 shadow-sm">
              <span>{rt.name}</span>
              <div className="w-px h-4 bg-blue-200 mx-1" />
              <button
                type="button"
                className="text-blue-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
                onClick={() => handleDelete(rt)}
                aria-label={`Remove ${rt.name}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function EditRoomDialog({ room, open, onOpenChange }: { room: Room | null, open: boolean, onOpenChange: (open: boolean) => void }) {
  const { data: roomTypes = [] } = useRoomTypes();
  const { mutateAsync: updateRoom, isPending } = useUpdateRoom();
  
  const [roomNumber, setRoomNumber] = useState('');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [baseTariff, setBaseTariff] = useState('');
  const [floor, setFloor] = useState('');

  // Sync state when room changes
  React.useEffect(() => {
    if (room && open) {
      setRoomNumber(room.roomNumber);
      setRoomTypeId(room.roomTypeId);
      setBaseTariff((room.baseTariff / 100).toString()); // Convert paise to rupees for input
      setFloor(room.floor || '');
    }
  }, [room, open]);

  const handleSave = async () => {
    if (!room || !roomNumber.trim() || !roomTypeId || !baseTariff) return;
    
    await updateRoom({
      id: room.id,
      previous: room,
      data: {
        roomNumber: roomNumber.trim(),
        roomTypeId,
        baseTariff: Math.round(parseFloat(baseTariff) * 100), // Convert rupees to paise
        isActive: room.isActive,
        floor: floor.trim()
      }
    });
    
    toast({ title: 'Room Updated', description: 'Room details saved successfully.' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Room Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Room Number</Label>
            <Input value={roomNumber} onChange={e => setRoomNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Room Type</Label>
            <Select value={roomTypeId} onValueChange={setRoomTypeId}>
              <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
              <SelectContent>
                {roomTypes.map(rt => (
                  <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Floor</Label>
              <Input value={floor} onChange={e => setFloor(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Base Tariff (₹)</Label>
              <Input type="number" value={baseTariff} onChange={e => setBaseTariff(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isPending || !roomNumber || !roomTypeId || !baseTariff}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  const handleAdd = async () => {
    if (!roomNumber.trim() || !roomTypeId || !baseTariff) return;
    await createRoom({
      roomNumber: roomNumber.trim(),
      roomTypeId,
      baseTariff: Math.round(parseFloat(baseTariff) * 100), // Convert rupees to paise
      isActive: true,
      floor: floor.trim()
    });
    setRoomNumber('');
    toast({ title: 'Room Created', description: `Room ${roomNumber} added successfully.` });
    // Keep roomTypeId and baseTariff / floor to quickly add multiple similar rooms
  };

  const handleDelete = async (room: Room) => {
    const ok = await confirmAction({ title: 'Delete Room', description: `Are you sure you want to delete Room ${room.roomNumber}?`, variant: 'destructive' });
    if (ok) {
      await deleteRoom(room);
      toast({ title: 'Deleted', description: `Room ${room.roomNumber} deleted.` });
    }
  };

  return (
    <>
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4 flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2"><Bed className="w-5 h-5 text-gray-500" /> Physical Rooms</CardTitle>
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 font-bold px-3">{rooms.length} Total Rooms</Badge>
        </CardHeader>
        <CardContent className="pt-6">
          
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-8">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Quick Add Room</h3>
            <div className="flex flex-col md:flex-row gap-3 items-end">
              <div className="space-y-1.5 flex-1">
                <label className="text-xs font-semibold text-gray-600">Room Number</label>
                <Input placeholder="e.g. 101" value={roomNumber} onChange={e => setRoomNumber(e.target.value)} className="bg-white" />
              </div>
              <div className="space-y-1.5 flex-1">
                <label className="text-xs font-semibold text-gray-600">Room Type</label>
                <Select value={roomTypeId} onValueChange={setRoomTypeId}>
                  <SelectTrigger className="bg-white">
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
                <label className="text-xs font-semibold text-gray-600">Floor</label>
                <Input placeholder="e.g. 1" value={floor} onChange={e => setFloor(e.target.value)} className="bg-white" />
              </div>
              <div className="space-y-1.5 flex-1">
                <label className="text-xs font-semibold text-gray-600">Base Tariff (₹)</label>
                <Input type="number" placeholder="1500" value={baseTariff} onChange={e => setBaseTariff(e.target.value)} className="bg-white" />
              </div>
              <Button type="button" onClick={handleAdd} disabled={isPending || !roomNumber || !roomTypeId || !baseTariff} className="w-full md:w-auto px-8 bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" /> Add Room
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700">Manage Rooms</h3>
            {rooms.length === 0 && <div className="text-muted-foreground text-sm py-4 text-center border rounded-lg border-dashed">No rooms configured yet.</div>}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {rooms.map(room => {
                const rt = roomTypes.find(t => t.id === room.roomTypeId);
                return (
                  <div key={room.id} className="group relative flex flex-col justify-between p-4 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-emerald-200 transition-all">
                    
                    <div className="absolute top-2 right-2 flex opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm rounded border border-gray-100">
                      <button onClick={() => setEditingRoom(room)} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="w-px bg-gray-100" />
                      <button onClick={() => handleDelete(room)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <Bed className="w-4 h-4 text-emerald-700" />
                        </div>
                        <div>
                          <div className="text-lg font-bold text-gray-900 leading-tight">{room.roomNumber}</div>
                          <div className="text-xs font-medium text-emerald-600">{rt?.name || 'Unknown Type'}</div>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex flex-col gap-1">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">Tariff</span>
                          <span className="font-bold text-gray-900">{formatINR(room.baseTariff)}</span>
                        </div>
                        {room.floor && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Floor</span>
                            <span className="font-medium text-gray-700">{room.floor}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </CardContent>
      </Card>

      <EditRoomDialog 
        room={editingRoom} 
        open={!!editingRoom} 
        onOpenChange={(open) => !open && setEditingRoom(null)} 
      />
    </>
  );
}

export function SettingsPage() {
  const { data: expenseCategories = [] } = useExpenseCategories();
  const { mutateAsync: createExpenseCategory, isPending: isAddingCategory } = useCreateExpenseCategory();
  const { mutateAsync: deleteExpenseCategory } = useDeleteExpenseCategory();

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <PageHeader
        icon={Settings}
        title="Settings & Configuration"
        description="Manage your hotel's structural data: Rooms, Room Types, and core lookup lists."
      />

      <Tabs defaultValue="rooms" className="w-full">
        <TabsList className="mb-6 bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="rooms" className="rounded-lg px-6 font-semibold">Rooms Setup</TabsTrigger>
          <TabsTrigger value="lookups" className="rounded-lg px-6 font-semibold">System Lists</TabsTrigger>
        </TabsList>

        <TabsContent value="rooms" className="mt-0 space-y-6">
          <RoomTypesCard />
          <RoomsManagementCard />
        </TabsContent>

        <TabsContent value="lookups" className="mt-0 space-y-6">
          <AddonsCard />
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
