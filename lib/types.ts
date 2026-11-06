// All data in this app is fictional sample data for a sales demo.

export type LeadSource =
  | "Website"
  | "Chatbot"
  | "Voice Assistant"
  | "WhatsApp"
  | "Walk-in"
  | "Referral";

export type LeadStatus = "New" | "Contacted" | "Converted" | "Lost";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  source: LeadSource;
  interest: string;
  status: LeadStatus;
  createdAt: string;
}

export type AppointmentType =
  | "Pharmacist call-back"
  | "Prescription pickup"
  | "Home delivery slot"
  | "Store visit";

export interface Appointment {
  id: string;
  patientName: string;
  phone: string;
  type: AppointmentType;
  at: string;
  status: "Scheduled" | "Completed" | "Cancelled";
  assignedTo: string;
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  preferredChannel: "WhatsApp" | "Email" | "Phone";
  createdAt: string;
  consent: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  strength: string;
  form: string;
  packInfo: string;
  manufacturer: string;
  unitPrice: number;
  stock: number;
}

export interface OrderItem {
  id: string;
  name: string;
  strength: string;
  quantity: number;
  confidence?: number;
}

export type OrderStatus =
  | "Pending pharmacist review"
  | "Approved"
  | "Rejected"
  | "Packed"
  | "Out for delivery"
  | "Delivered";

export interface UploadedFile {
  name: string;
  type: string;
  dataUrl?: string;
  text?: string;
}

export interface OrderRequest {
  id: string;
  patientName: string;
  phone: string;
  source: LeadSource;
  createdAt: string;
  status: OrderStatus;
  deliveryMode: "Store pickup" | "Home delivery";
  file?: UploadedFile;
  requestText?: string;
  draftItems: OrderItem[];
  finalItems?: OrderItem[];
  reviewer?: string;
  reviewedAt?: string;
  reviewNote?: string;
  edited?: boolean;
  rejectionReason?: string;
}

export interface Payment {
  id: string;
  orderId: string;
  patientName: string;
  total: number;
  paid: number;
  method: "UPI" | "Cash" | "Card" | "Not yet paid";
  updatedAt: string;
}

export type FollowUpChannel = "WhatsApp" | "Email" | "Team call";

export interface FollowUp {
  id: string;
  channel: FollowUpChannel;
  title: string;
  detail: string;
  patientName: string;
  at: string;
  status: "Sent" | "Scheduled" | "Done";
  orderId?: string;
}

export interface DemoState {
  version: number;
  seededAt: string;
  leads: Lead[];
  appointments: Appointment[];
  patients: Patient[];
  inventory: InventoryItem[];
  orders: OrderRequest[];
  payments: Payment[];
  followUps: FollowUp[];
}
