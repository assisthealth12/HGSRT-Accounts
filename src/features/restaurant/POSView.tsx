import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatINR } from '@/domain/money';
import { Coffee, UtensilsCrossed, MonitorPlay } from 'lucide-react';
import { useMenuItems } from '@/hooks/useMenuItems';
import { useRestaurantTables } from '@/hooks/useRestaurantTables';
import { useAuthStore } from '@/store/authStore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useQueryClient } from '@tanstack/react-query';
import { MenuItem, RestaurantTable } from '@/domain/restaurant';

export function POSView() {
  const propertyId = useAuthStore((state) => state.propertyId);
  const queryClient = useQueryClient();

  const { data: menu = [], isLoading: isLoadingMenu } = useMenuItems();
  const { data: tables = [], isLoading: isLoadingTables } = useRestaurantTables();

  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [currentOrder, setCurrentOrder] = useState<{ menuItem: MenuItem; quantity: number }[]>([]);
  const [isPunching, setIsPunching] = useState(false);

  const addToOrder = (item: MenuItem) => {
    setCurrentOrder(prev => {
      const existing = prev.find(i => i.menuItem.id === item.id);
      if (existing) {
        return prev.map(i => i.menuItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const removeFromOrder = (itemId: string) => {
    setCurrentOrder(prev => {
      const existing = prev.find(i => i.menuItem.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.menuItem.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.menuItem.id !== itemId);
    });
  };

  const totalAmount = currentOrder.reduce((acc, item) => acc + (item.menuItem.price * item.quantity), 0);

  const handlePunchKOT = async () => {
    if (!propertyId || !selectedTable || currentOrder.length === 0) return;

    setIsPunching(true);
    try {
      const punchKOT = httpsCallable(functions, 'punchKOT');
      await punchKOT({
        propertyId,
        tableId: selectedTable,
        items: currentOrder,
      });
      queryClient.invalidateQueries({ queryKey: ['restaurantTables', propertyId] });
      setCurrentOrder([]);
    } catch (error) {
      console.error('Punch KOT failed:', error);
    } finally {
      setIsPunching(false);
    }
  };

  const getTableStyle = (table: RestaurantTable) =>
    table.status === 'Occupied' && selectedTable !== table.id
      ? 'bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-300'
      : '';

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-6">
      {/* Left side: Tables & Menu */}
      <div className="flex-1 flex flex-col gap-6 h-full">
        {/* Table Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5"/> Dine-In Tables
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTables ? (
              <div className="text-muted-foreground text-sm">Loading tables...</div>
            ) : tables.length === 0 ? (
              <div className="text-muted-foreground text-sm">No restaurant tables configured yet.</div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {tables.map(table => (
                  <Button
                    key={table.id}
                    variant={selectedTable === table.id ? "default" : (table.status === 'Occupied' ? 'secondary' : 'outline')}
                    className={`w-20 h-20 text-lg font-bold ${getTableStyle(table)}`}
                    onClick={() => setSelectedTable(table.id)}
                  >
                    {table.tableNumber}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Menu Items */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-3 border-b">
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">All Items</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <ScrollArea className="flex-1 p-4">
            {isLoadingMenu ? (
              <div className="text-muted-foreground text-sm">Loading menu...</div>
            ) : menu.length === 0 ? (
              <div className="text-muted-foreground text-sm">No menu items configured yet.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {menu.map(item => (
                  <Card
                    key={item.id}
                    className="cursor-pointer hover:border-primary transition-colors flex flex-col"
                    onClick={() => addToOrder(item)}
                  >
                    <CardContent className="p-4 flex-1 flex flex-col justify-between h-32">
                      <div className="font-semibold text-sm line-clamp-2">{item.name}</div>
                      <div className="mt-2 flex justify-between items-center">
                        <span className="text-muted-foreground text-xs">{item.categoryId}</span>
                        <span className="font-bold text-primary">{formatINR(item.price)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>

      {/* Right side: Current Ticket (KOT) */}
      <Card className="w-full md:w-96 flex flex-col h-full shadow-lg">
        <CardHeader className="bg-muted/50 border-b pb-4">
          <CardTitle className="flex justify-between items-center">
            <span>Current Ticket</span>
            {selectedTable && <Badge variant="default" className="text-sm">Table {tables.find(t => t.id === selectedTable)?.tableNumber}</Badge>}
          </CardTitle>
        </CardHeader>

        <ScrollArea className="flex-1 p-4">
          {currentOrder.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2 py-10">
              <Coffee className="w-12 h-12 opacity-20" />
              <p>No items added yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentOrder.map(item => (
                <div key={item.menuItem.id} className="flex justify-between items-start border-b pb-3">
                  <div className="flex-1">
                    <div className="font-medium">{item.menuItem.name}</div>
                    <div className="text-muted-foreground text-sm">{formatINR(item.menuItem.price)} x {item.quantity}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold">{formatINR(item.menuItem.price * item.quantity)}</span>
                    <div className="flex flex-col gap-1">
                      <Button variant="outline" size="icon" className="h-6 w-6 rounded-full" onClick={(e) => { e.stopPropagation(); addToOrder(item.menuItem); }}>+</Button>
                      <Button variant="outline" size="icon" className="h-6 w-6 rounded-full" onClick={(e) => { e.stopPropagation(); removeFromOrder(item.menuItem.id); }}>-</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 bg-muted/30 border-t space-y-4">
          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total Amount</span>
            <span>{formatINR(totalAmount)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="w-full"
              disabled={currentOrder.length === 0 || !selectedTable}
              onClick={() => setCurrentOrder([])}
            >
              Clear
            </Button>
            <Button
              className="w-full font-bold"
              disabled={currentOrder.length === 0 || !selectedTable || isPunching}
              onClick={handlePunchKOT}
            >
              {isPunching ? 'Punching...' : 'Punch KOT'}
            </Button>
          </div>
          <Button variant="secondary" className="w-full" disabled={!selectedTable}>
            <MonitorPlay className="w-4 h-4 mr-2"/> Settle Bill / Post to Room
          </Button>
        </div>
      </Card>
    </div>
  );
}
