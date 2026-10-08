import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useExpenseCategories, useCreateExpenseCategory, useDeleteExpenseCategory } from '@/hooks/useExpenseCategories';
import { useAddons, useCreateAddon, useDeleteAddon } from '@/hooks/useAddons';
import { useRoomTypes } from '@/hooks/useRoomTypes';
import { useCreateRoomType, useUpdateRoomType, useDeleteRoomType } from '@/hooks/useCreateRoomType';
import { RoomType, OccupancyRates } from '@/domain/room';
import { useRooms } from '@/hooks/useRooms';
import { useCreateRoom, useUpdateRoom, useDeleteRoom } from '@/hooks/useCreateRoom';
import { useBookings } from '@/hooks/useBookings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { Settings, Edit2, Trash2, Plus, Bed, LayoutGrid, Check, X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
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

const EMPTY_RATES: OccupancyRates = {
  singleEP: 0, singleCP: 0, doubleEP: 0, doubleCP: 0, tripleEP: 0, tripleCP: 0,
};

const RATE_FIELDS: { key: keyof OccupancyRates; label: string }[] = [
  { key: 'singleEP', label: 'Single — Room Only (EP)' },
  { key: 'singleCP', label: 'Single — Room + Breakfast (CP)' },
  { key: 'doubleEP', label: 'Double — Room Only (EP)' },
  { key: 'doubleCP', label: 'Double — Room + Breakfast (CP)' },
  { key: 'tripleEP', label: 'Triple — Room Only (EP)' },
  { key: 'tripleCP', label: 'Triple — Room + Breakfast (CP)' },
];

function RoomTypeFormDialog({
  roomType,
  open,
  onOpenChange,
  sortOrder,
}: {
  roomType: RoomType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sortOrder: number;
}) {
  const { mutateAsync: createRoomType, isPending: isCreating } = useCreateRoomType();
  const { mutateAsync: updateRoomType, isPending: isUpdating } = useUpdateRoomType();

  const [name, setName] = useState('');
  const [rates, setRates] = useState<Record<keyof OccupancyRates, string>>({
    singleEP: '', singleCP: '', doubleEP: '', doubleCP: '', tripleEP: '', tripleCP: '',
  });

  React.useEffect(() => {
    if (open) {
      setName(roomType?.name ?? '');
      const r = roomType?.rates ?? EMPTY_RATES;
      setRates({
        singleEP: r.singleEP ? String(r.singleEP / 100) : '',
        singleCP: r.singleCP ? String(r.singleCP / 100) : '',
        doubleEP: r.doubleEP ? String(r.doubleEP / 100) : '',
        doubleCP: r.doubleCP ? String(r.doubleCP / 100) : '',
        tripleEP: r.tripleEP ? String(r.tripleEP / 100) : '',
        tripleCP: r.tripleCP ? String(r.tripleCP / 100) : '',
      });
    }
  }, [open, roomType]);

  const isPending = isCreating || isUpdating;

  const handleSave = async () => {
    if (!name.trim()) return;
    const ratesPayload: OccupancyRates = {
      singleEP: Math.round(parseFloat(rates.singleEP || '0') * 100),
      singleCP: Math.round(parseFloat(rates.singleCP || '0') * 100),
      doubleEP: Math.round(parseFloat(rates.doubleEP || '0') * 100),
      doubleCP: Math.round(parseFloat(rates.doubleCP || '0') * 100),
      tripleEP: Math.round(parseFloat(rates.tripleEP || '0') * 100),
      tripleCP: Math.round(parseFloat(rates.tripleCP || '0') * 100),
    };

    if (roomType) {
      await updateRoomType({ id: roomType.id, data: { name: name.trim(), rates: ratesPayload }, previous: roomType });
      toast({ title: 'Room type updated', description: name.trim() });
    } else {
      await createRoomType({ name: name.trim(), sortOrder, rates: ratesPayload });
      toast({ title: 'Room type added', description: name.trim() });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{roomType ? 'Edit Room Type' : 'Add Room Type'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input placeholder="e.g. Executive" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label className="block mb-2">Rates (₹ per night, optional)</Label>
            <p className="text-xs text-muted-foreground mb-3">
              Leave any rate blank/0 if this room type doesn't offer that option. Rooms of this type with no
              rates set at all will keep using their individual Base Tariff instead.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {RATE_FIELDS.map(f => (
                <div key={f.key}>
                  <Label className="text-xs">{f.label}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={rates[f.key]}
                    onChange={(e) => setRates(r => ({ ...r, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isPending || !name.trim()}>
            {isPending ? 'Saving...' : 'Save Room Type'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RoomTypesCard() {
  const { data: roomTypes = [] } = useRoomTypes();
  const { mutateAsync: deleteRoomType } = useDeleteRoomType();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<RoomType | null>(null);

  const handleDelete = async (rt: RoomType) => {
    const ok = await confirmAction({ title: 'Delete Room Type', description: `Are you sure you want to delete ${rt.name}?` });
    if (ok) {
      await deleteRoomType(rt);
      toast({ title: 'Deleted', description: `${rt.name} removed successfully.` });
    }
  };

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-gray-500" /> Room Types & Rates</CardTitle>
        <Button type="button" size="sm" onClick={() => { setEditingType(null); setIsDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Type
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 pt-6">
        {roomTypes.length === 0 && <span className="text-muted-foreground text-sm">None added yet.</span>}
        {roomTypes.map(rt => (
          <div key={rt.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-gray-900">{rt.name}</span>
              <div className="flex items-center gap-1">
                <button type="button" className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors" onClick={() => { setEditingType(rt); setIsDialogOpen(true); }}>
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button type="button" className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" onClick={() => handleDelete(rt)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {rt.rates ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="text-gray-500">Single EP <span className="float-right font-semibold text-gray-800">{formatINR(rt.rates.singleEP)}</span></div>
                <div className="text-gray-500">Single CP <span className="float-right font-semibold text-gray-800">{formatINR(rt.rates.singleCP)}</span></div>
                <div className="text-gray-500">Double EP <span className="float-right font-semibold text-gray-800">{formatINR(rt.rates.doubleEP)}</span></div>
                <div className="text-gray-500">Double CP <span className="float-right font-semibold text-gray-800">{formatINR(rt.rates.doubleCP)}</span></div>
                <div className="text-gray-500">Triple EP <span className="float-right font-semibold text-gray-800">{formatINR(rt.rates.tripleEP)}</span></div>
                <div className="text-gray-500">Triple CP <span className="float-right font-semibold text-gray-800">{formatINR(rt.rates.tripleCP)}</span></div>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">No rates set — rooms of this type use their individual Base Tariff.</span>
            )}
          </div>
        ))}
      </CardContent>

      <RoomTypeFormDialog
        roomType={editingType}
        open={isDialogOpen}
        onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingType(null); }}
        sortOrder={roomTypes.length}
      />
    </Card>
  );
}

function RoomTypeRatesPreview({ roomType }: { roomType: RoomType | undefined }) {
  if (!roomType) return null;
  if (!roomType.rates) {
    return (
      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        {roomType.name} has no rates configured yet — this room will use its own Base Tariff below for every
        occupancy/meal plan. Set up rates in Room Types &amp; Rates above to link it properly.
      </div>
    );
  }
  const r = roomType.rates;
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
      <div className="text-xs font-semibold text-emerald-800 mb-2">
        Linked to {roomType.name} rates — bookings will use these instead of Base Tariff
      </div>
      <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-xs text-emerald-900">
        <div>Single EP <span className="font-semibold">{formatINR(r.singleEP)}</span></div>
        <div>Double EP <span className="font-semibold">{formatINR(r.doubleEP)}</span></div>
        <div>Triple EP <span className="font-semibold">{formatINR(r.tripleEP)}</span></div>
        <div>Single CP <span className="font-semibold">{formatINR(r.singleCP)}</span></div>
        <div>Double CP <span className="font-semibold">{formatINR(r.doubleCP)}</span></div>
        <div>Triple CP <span className="font-semibold">{formatINR(r.tripleCP)}</span></div>
      </div>
    </div>
  );
}

function EditRoomDialog({ room, open, onOpenChange }: { room: Room | null, open: boolean, onOpenChange: (open: boolean) => void }) {
  const { data: roomTypes = [] } = useRoomTypes();
  const { data: rooms = [] } = useRooms();
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
      setBaseTariff(room.baseTariff ? (room.baseTariff / 100).toString() : '');
      setFloor(room.floor || '');
    }
  }, [room, open]);

  const selectedType = roomTypes.find(t => t.id === roomTypeId);
  const typeHasRates = !!selectedType?.rates;

  const handleSave = async () => {
    if (!room || !roomNumber.trim() || !roomTypeId) return;
    if (!typeHasRates && !baseTariff) return;

    const isDuplicate = rooms.some(r =>
      r.id !== room.id && r.roomNumber.trim().toLowerCase() === roomNumber.trim().toLowerCase()
    );
    if (isDuplicate) {
      toast({ title: 'Duplicate Room Number', description: `Room ${roomNumber.trim()} already exists. Room numbers must be unique.`, variant: 'destructive' });
      return;
    }

    await updateRoom({
      id: room.id,
      previous: room,
      data: {
        roomNumber: roomNumber.trim(),
        roomTypeId,
        baseTariff: Math.round(parseFloat(baseTariff || '0') * 100), // Convert rupees to paise
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
          <RoomTypeRatesPreview roomType={selectedType} />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Floor</Label>
              <Input value={floor} onChange={e => setFloor(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Base Tariff (₹){typeHasRates && <span className="text-muted-foreground font-normal"> (fallback, unused)</span>}</Label>
              <Input type="number" value={baseTariff} onChange={e => setBaseTariff(e.target.value)} disabled={typeHasRates} />
            </div>
          </div>
        </div>
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isPending || !roomNumber || !roomTypeId || (!typeHasRates && !baseTariff)}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// One-off admin check, not worth a dedicated always-on query: finds room numbers with
// more than one active room record (can happen if two people add the same room before
// the uniqueness check existed) and tells you which copy is safe to retire — the one
// with zero bookings pointing at it — instead of leaving two visually-identical cards.
function DuplicateRoomsBanner({ rooms }: { rooms: Room[] }) {
  const { data: bookings = [] } = useBookings();
  const { mutateAsync: deleteRoom, isPending } = useDeleteRoom();

  const byNumber = new Map<string, Room[]>();
  rooms.forEach(r => byNumber.set(r.roomNumber, [...(byNumber.get(r.roomNumber) || []), r]));
  const duplicateGroups = Array.from(byNumber.entries()).filter(([, rs]) => rs.length > 1);

  if (duplicateGroups.length === 0) return null;

  const bookingCount = (roomId: string) => bookings.filter(b => b.roomIds?.includes(roomId)).length;

  const handleResolve = async (group: Room[]) => {
    const counts = group.map(r => ({ room: r, count: bookingCount(r.id) }));
    const maxCount = Math.max(...counts.map(c => c.count));
    const toKeep = counts.filter(c => c.count === maxCount);
    if (toKeep.length !== 1) {
      toast({ title: 'Cannot auto-resolve', description: `Room ${group[0].roomNumber}: multiple copies have booking history — resolve this one manually.`, variant: 'destructive' });
      return;
    }
    const toRetire = counts.filter(c => c.room.id !== toKeep[0].room.id);
    for (const { room } of toRetire) {
      await deleteRoom(room);
    }
    toast({ title: 'Duplicate Resolved', description: `Room ${group[0].roomNumber}: kept the copy with ${maxCount} booking(s), retired ${toRetire.length} empty duplicate(s).` });
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 space-y-3">
      <h3 className="text-sm font-bold text-amber-800">⚠ Duplicate Room Numbers Detected</h3>
      <p className="text-xs text-amber-700">These room numbers have more than one active record. Click Resolve to automatically keep the copy with booking history and retire the empty duplicate.</p>
      <div className="space-y-2">
        {duplicateGroups.map(([number, group]) => (
          <div key={number} className="flex items-center justify-between bg-white rounded-lg border border-amber-100 px-3 py-2">
            <span className="text-sm font-semibold text-gray-800">
              Room {number} — {group.length} copies ({group.map(r => `${bookingCount(r.id)} booking(s)`).join(', ')})
            </span>
            <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100" onClick={() => handleResolve(group)} disabled={isPending}>
              Resolve
            </Button>
          </div>
        ))}
      </div>
    </div>
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

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 12;

  const selectedType = roomTypes.find(t => t.id === roomTypeId);
  const typeHasRates = !!selectedType?.rates;

  const filteredRooms = rooms.filter(room => {
    if (!search.trim()) return true;
    const rt = roomTypes.find(t => t.id === room.roomTypeId);
    const q = search.trim().toLowerCase();
    return room.roomNumber.toLowerCase().includes(q)
      || room.floor?.toLowerCase().includes(q)
      || rt?.name.toLowerCase().includes(q);
  });
  const totalPages = Math.max(1, Math.ceil(filteredRooms.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginatedRooms = filteredRooms.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  const handleAdd = async () => {
    if (!roomNumber.trim() || !roomTypeId) return;
    if (!typeHasRates && !baseTariff) return;

    const isDuplicate = rooms.some(r => r.roomNumber.trim().toLowerCase() === roomNumber.trim().toLowerCase());
    if (isDuplicate) {
      toast({ title: 'Duplicate Room Number', description: `Room ${roomNumber.trim()} already exists. Room numbers must be unique.`, variant: 'destructive' });
      return;
    }

    await createRoom({
      roomNumber: roomNumber.trim(),
      roomTypeId,
      baseTariff: Math.round(parseFloat(baseTariff || '0') * 100), // Convert rupees to paise
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
          <DuplicateRoomsBanner rooms={rooms} />

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-8 space-y-3">
            <h3 className="text-sm font-bold text-gray-700">Quick Add Room</h3>
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
                <label className="text-xs font-semibold text-gray-600">
                  Base Tariff (₹){typeHasRates && <span className="font-normal text-gray-400"> (fallback, unused)</span>}
                </label>
                <Input type="number" placeholder="1500" value={baseTariff} onChange={e => setBaseTariff(e.target.value)} className="bg-white" disabled={typeHasRates} />
              </div>
              <Button type="button" onClick={handleAdd} disabled={isPending || !roomNumber || !roomTypeId || (!typeHasRates && !baseTariff)} className="w-full md:w-auto px-8 bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" /> Add Room
              </Button>
            </div>
            {roomTypeId && <RoomTypeRatesPreview roomType={selectedType} />}
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-gray-700">Manage Rooms</h3>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search room no., type, floor..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(0); }}
                  className="pl-9 h-9"
                />
              </div>
            </div>
            {rooms.length === 0 && <div className="text-muted-foreground text-sm py-4 text-center border rounded-lg border-dashed">No rooms configured yet.</div>}
            {rooms.length > 0 && filteredRooms.length === 0 && <div className="text-muted-foreground text-sm py-4 text-center border rounded-lg border-dashed">No rooms match "{search}".</div>}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginatedRooms.map(room => {
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
                        {rt?.rates ? (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Rates</span>
                            <span className="font-bold text-emerald-700">Linked to {rt.name}</span>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Tariff</span>
                            <span className="font-bold text-gray-900">{formatINR(room.baseTariff)}</span>
                          </div>
                        )}
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

            {filteredRooms.length > PAGE_SIZE && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-gray-500">
                  Showing {currentPage * PAGE_SIZE + 1}-{Math.min((currentPage + 1) * PAGE_SIZE, filteredRooms.length)} of {filteredRooms.length}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-xs font-medium text-gray-600">Page {currentPage + 1} of {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
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
