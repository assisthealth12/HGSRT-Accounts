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
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-3">
          {roomTypes.length === 0 && <span className="text-muted-foreground text-sm">None added yet.</span>}
          {roomTypes.map(rt => (
            <Badge key={rt.id} variant="secondary" className="flex items-center gap-2 py-1.5 px-4 rounded-full text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100">
              {rt.name} · {formatINR(rt.baseRate)}
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
        <div className="flex gap-3 items-center max-w-lg">
          <Input placeholder="e.g. Executive" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Base rate (₹)" type="number" value={baseRate} onChange={(e) => setBaseRate(e.target.value)} className="w-32" />
          <Button type="button" onClick={handleAdd} disabled={isPending}>Add Type</Button>
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
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">Property Settings</h2>
        <p className="text-gray-500 mt-1">
          Manage your hotel's general information, configuration, and operational lists.
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-6 bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="general" className="rounded-lg px-6">General Info</TabsTrigger>
          <TabsTrigger value="rooms" className="rounded-lg px-6">Room Types</TabsTrigger>
          <TabsTrigger value="lookups" className="rounded-lg px-6">System Lists</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-0">
          <PropertySettingsForm onSubmit={handleSubmit} />
        </TabsContent>

        <TabsContent value="rooms" className="mt-0 space-y-6">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-gray-900 mb-1">Room Types</h3>
            <p className="text-gray-500 text-sm mb-4">
              Configure the categories of rooms available at your property and their base rates.
            </p>
          </div>
          <RoomTypesCard />
        </TabsContent>

        <TabsContent value="lookups" className="mt-0 space-y-6">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-gray-900 mb-1">System Lists</h3>
            <p className="text-gray-500 text-sm mb-4">
              Manage the dropdown options used across the app.
            </p>
          </div>
          
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
