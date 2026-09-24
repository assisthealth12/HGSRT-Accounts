import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatINR } from '@/domain/money';
import { Coffee, UtensilsCrossed, MonitorPlay } from 'lucide-react';

const mockMenu = [
  { id: 'm1', name: 'Paneer Butter Masala', price: 25000, category: 'Main Course' }, // ₹250
  { id: 'm2', name: 'Garlic Naan', price: 4000, category: 'Breads' }, // ₹40
  { id: 'm3', name: 'Masala Dosa', price: 12000, category: 'South Indian' }, // ₹120
  { id: 'm4', name: 'Filter Coffee', price: 3000, category: 'Beverages' }, // ₹30
];

const mockTables = [
  { id: 't1', tableNumber: 'T1', status: 'Available' },
  { id: 't2', tableNumber: 'T2', status: 'Occupied' },
  { id: 't3', tableNumber: 'T3', status: 'Occupied' },
  { id: 't4', tableNumber: 'T4', status: 'Available' },
];

export function POSView() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [currentOrder, setCurrentOrder] = useState<{menuItem: any, quantity: number}[]>([]);

  const addToOrder = (item: any) => {
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

  const handlePunchKOT = () => {
    console.log('Punching KOT for table', selectedTable, currentOrder);
    // TODO: Call cloud function to create KOT and append to Order
    setCurrentOrder([]);
  };

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
            <div className="flex flex-wrap gap-3">
              {mockTables.map(table => (
                <Button 
                  key={table.id}
                  variant={selectedTable === table.id ? "default" : (table.status === 'Occupied' ? 'secondary' : 'outline')}
                  className={`w-20 h-20 text-lg font-bold ${table.status === 'Occupied' && selectedTable !== table.id ? 'bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-300' : ''}`}
                  onClick={() => setSelectedTable(table.id)}
                >
                  {table.tableNumber}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Menu Items */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-3 border-b">
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">All Items</TabsTrigger>
                <TabsTrigger value="main">Main Course</TabsTrigger>
                <TabsTrigger value="beverages">Beverages</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <ScrollArea className="flex-1 p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {mockMenu.map(item => (
                <Card 
                  key={item.id} 
                  className="cursor-pointer hover:border-primary transition-colors flex flex-col"
                  onClick={() => addToOrder(item)}
                >
                  <CardContent className="p-4 flex-1 flex flex-col justify-between h-32">
                    <div className="font-semibold text-sm line-clamp-2">{item.name}</div>
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-muted-foreground text-xs">{item.category}</span>
                      <span className="font-bold text-primary">{formatINR(item.price)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Right side: Current Ticket (KOT) */}
      <Card className="w-full md:w-96 flex flex-col h-full shadow-lg">
        <CardHeader className="bg-muted/50 border-b pb-4">
          <CardTitle className="flex justify-between items-center">
            <span>Current Ticket</span>
            {selectedTable && <Badge variant="default" className="text-sm">Table {mockTables.find(t=>t.id===selectedTable)?.tableNumber}</Badge>}
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
              disabled={currentOrder.length === 0 || !selectedTable}
              onClick={handlePunchKOT}
            >
              Punch KOT
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
