import React, { useState } from 'react';
import { PropertySettingsForm } from '@/components/forms/PropertySettingsForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatINR } from '@/domain/money';
import { usePaymentModes, useCreatePaymentMode, useDeletePaymentMode } from '@/hooks/usePaymentModes';
import { useExpenseCategories, useCreateExpenseCategory, useDeleteExpenseCategory } from '@/hooks/useExpenseCategories';
import { useRoomTypes } from '@/hooks/useRoomTypes';
import { useCreateRoomType, useDeleteRoomType } from '@/hooks/useCreateRoomType';

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
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {items.length === 0 && <span className="text-muted-foreground text-sm">None added yet.</span>}
          {items.map(item => (
            <Badge key={item.id} variant="outline" className="flex items-center gap-2 py-1.5">
              {item.name}
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(item)}
                aria-label={`Remove ${item.name}`}
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="New name"
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
  const [baseRate, setBaseRate] = useState('');

  const handleAdd = async () => {
    if (!name.trim() || !baseRate) return;
    await createRoomType({
      name: name.trim(),
      baseRate: Math.round(parseFloat(baseRate) * 100),
      extraBedRate: 0,
      baseOccupancy: 2,
      maxOccupancy: 3,
    });
    setName('');
    setBaseRate('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Room Types</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {roomTypes.length === 0 && <span className="text-muted-foreground text-sm">None added yet.</span>}
          {roomTypes.map(rt => (
            <Badge key={rt.id} variant="outline" className="flex items-center gap-2 py-1.5">
              {rt.name} · {formatINR(rt.baseRate)}
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => deleteRoomType(rt)}
                aria-label={`Remove ${rt.name}`}
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="e.g. Executive" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Base rate (₹)" type="number" value={baseRate} onChange={(e) => setBaseRate(e.target.value)} className="max-w-[160px]" />
          <Button type="button" onClick={handleAdd} disabled={isPending}>Add</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsPage() {
  const { data: paymentModes = [] } = usePaymentModes();
  const { mutateAsync: createPaymentMode, isPending: isAddingMode } = useCreatePaymentMode();
  const { mutateAsync: deletePaymentMode } = useDeletePaymentMode();

  const { data: expenseCategories = [] } = useExpenseCategories();
  const { mutateAsync: createExpenseCategory, isPending: isAddingCategory } = useCreateExpenseCategory();
  const { mutateAsync: deleteExpenseCategory } = useDeleteExpenseCategory();

  const handleSubmit = (data: any) => {
    console.log('Settings updated:', data);
    // TODO: Wire up mutation to update property settings in Firestore
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Property Settings</h2>
        <p className="text-muted-foreground">
          Manage your hotel's general information and operational configuration.
        </p>
      </div>

      <PropertySettingsForm onSubmit={handleSubmit} />

      <div>
        <h3 className="text-xl font-semibold tracking-tight mb-1">Lists</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Manage the dropdown options used across the app. Removing one only hides it from new entries.
        </p>
      </div>

      <RoomTypesCard />

      <SimpleLookupCard
        title="Payment Modes"
        items={paymentModes}
        onAdd={createPaymentMode}
        onDelete={deletePaymentMode}
        isAdding={isAddingMode}
      />

      <SimpleLookupCard
        title="Expense Categories"
        items={expenseCategories}
        onAdd={createExpenseCategory}
        onDelete={deleteExpenseCategory}
        isAdding={isAddingCategory}
      />
    </div>
  );
}
