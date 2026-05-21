export type UserRole = 'admin' | 'employee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  approved: boolean;
}

export interface PriceHistoryRecord {
  date: string;
  vendor: string;
  price: number;
}

export interface InventoryItem {
  id: string;
  name: string;      // This will be the simple, friendly UI name (e.g. "Νερό")
  invoiceName?: string; // This will be the official invoice name (e.g. "ΝΕΡΟ EONIO 500ML (ΚΙΒ 24)")
  supplierName?: string;
  barcode?: string;
  category: string;
  stock: number;
  shelf: number;
  price: number; // cost price
  retailPrice: number;
  alertLimit: number;
  vendor: string;
  imageUrl?: string;
  expiryDate?: string;
  isOrdered: boolean;
  priceHistory?: PriceHistoryRecord[];
}

export interface Vendor {
  id: string;
  name: string;
  phone?: string;
  consistencyRating: number; // 1 to 5 stars or scale
  leadTime: number; // in days
  unfulfilledOrders: number;
  totalOrders: number;
}

export interface InvoiceItem {
  name: string;
  qty: number;
  costPrice: number;
  verified: boolean;
}

export interface Invoice {
  id: string;
  vendor: string;
  total: number;
  dateScanned: string;
  status: 'pending' | 'completed';
  paymentStatus: 'paid' | 'pending' | 'unofficial'; // parallel unrecorded payout is 'unofficial'
  imageBase64?: string;
  mimeType?: string;
  items: InvoiceItem[];
  aiMessage?: string;
}

export interface WasteLog {
  id: string;
  itemId: string;
  itemName: string;
  category: string;
  vendor: string;
  qty: number;
  cost: number;
  reason: string;
  user: string;
  date: string;
}

export interface UtilityLog {
  id: string;
  name: string; // ΔΕΗ, ΕΥΔΑΠ, κτλ
  amount: number;
  dueDate: string;
  status: 'pending' | 'completed';
  paymentDate?: string;
}

export interface ZReportExpense {
  id: string;
  name: string;
  amount: number;
}

export interface ZReport {
  id: string;
  date: string;
  cash: number;
  pos: number;
  expenses: ZReportExpense[];
  totalExpenses: number;
  netCash: number;
  totalProfit: number;
  share40: number; // Owner A
  share60: number; // Owner B
}

export interface Shift {
  id: string;
  userName: string;
  date: string;
  hours: string;
  status: 'scheduled' | 'completed' | 'active';
}

export interface ActivityAudit {
  id: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface FeedbackMessage {
  id: string;
  name: string;
  message: string;
  timestamp: string;
}
