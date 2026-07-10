/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'customer' | 'admin' | 'kitchen' | 'superadmin' | 'owner';

export type OrderType = 'dine-in' | 'takeaway';

export type OrderStatus = 'pending' | 'cooking' | 'ready' | 'completed' | 'rejected';

export interface MenuItem {
  id: string;
  serialNumber?: string;
  name: string;
  description: string;
  category: string;
  price: number;
  vat: number; // percentage (e.g. 15 for 15%)
  discount: number; // percentage (e.g. 10 for 10%)
  image: string;
  available: boolean;
  createdAt: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface Order {
  id: string;
  tableNumber: string;
  specialNotes?: string;
  orderType: OrderType;
  items: {
    menuItemId: string;
    name: string;
    price: number;
    vat: number;
    discount: number;
    quantity: number;
    category?: string;
  }[];
  status: OrderStatus;
  timestamp: string; // ISO string
  createdAtTime: string; // HH:mm
  createdAtDate: string; // YYYY-MM-DD
  selfieUrl?: string; // base64 or file reference
  signature?: string; // canvas drawing path or signature type
  contactNumber?: string;
  rejectReason?: string;
  invoicePrinted?: boolean;
}

export interface SalesReportRow {
  itemId: string;
  orderId: string;
  itemName: string;
  category: string;
  price: number;
  vat: number;
  vatAmount: number;
  discount: number;
  discountAmount: number;
  totalPrice: number;
  tableNumber: string;
  date: string;
  contactNumber?: string;
  quantity: number;
}

export interface RevenueSummary {
  totalRevenue: number;
  totalVat: number;
  totalOrders: number;
  averageOrderValue: number;
}

export interface PasswordResetRequest {
  id: string;
  role: Role;
  username: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requestedAt: string;
  tempPasswordHash?: string;
}
