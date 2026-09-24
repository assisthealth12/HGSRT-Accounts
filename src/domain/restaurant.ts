import { BaseDocument } from './base';
import { Money } from './money';
import { TaxAmount } from './gst';

export interface RestaurantTable extends BaseDocument {
  tableNumber: string;
  seatingCapacity: number;
  status: 'Available' | 'Occupied' | 'Reserved' | 'Out of Service';
  active: boolean;
}

export interface MenuItem extends BaseDocument {
  categoryId: string; // e.g. 'Starters', 'Main Course', 'Beverages'
  name: string;
  description?: string;
  price: Money;
  isVegetarian: boolean;
  taxRatePercent: number; // usually 5% for restaurants without ITC in India, but configurable
  active: boolean;
}

export type KOTStatus = 'Pending' | 'Preparing' | 'Ready' | 'Served' | 'Cancelled';

export interface KOTItem {
  menuItemId: string;
  name: string;
  quantity: number;
  notes?: string; // e.g. "Less spicy"
  status: KOTStatus;
}

export interface KOT extends BaseDocument {
  orderId: string; // Links back to the main RestaurantOrder
  tableId?: string; // For dine-in
  roomId?: string; // For room service
  
  items: KOTItem[];
  status: KOTStatus;
  
  waiterId?: string; // Which employee punched the order
}

export type OrderStatus = 'Open' | 'Billed' | 'Settled' | 'Cancelled';

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: Money;
  amount: Money; // quantity * unitPrice
  taxRatePercent: number;
  taxAmount: TaxAmount;
  totalAmount: Money;
}

export interface RestaurantOrder extends BaseDocument {
  tableId?: string;
  roomId?: string; // If ordered as Room Service
  stayId?: string; // If billed to a room
  
  type: 'Dine-In' | 'Room Service' | 'Takeaway';
  
  items: OrderItem[];
  
  subtotal: Money;
  discount: Money;
  taxableTotal: Money;
  taxTotal: TaxAmount;
  grandTotal: Money;
  
  status: OrderStatus;
  
  // Settlement
  paymentId?: string; // If settled immediately via cash/card
  chargeId?: string; // If posted to room folio
  
  isVoided: boolean;
  voidReason?: string;
}
