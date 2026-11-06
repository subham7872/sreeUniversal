// DEMO SEED DATA — every name, phone number and order below is fictional.
// Dates are generated relative to "now" so the demo always looks fresh.
import type {
  Appointment,
  DemoState,
  FollowUp,
  InventoryItem,
  Lead,
  OrderRequest,
  Patient,
  Payment,
} from "./types";

export const STATE_VERSION = 3;

export const STORE = {
  name: "Shree Universal Pharmacy",
  tagline: "Your neighbourhood pharmacy, now online (demo)",
  address: "12 Sample Market Road, Demo Nagar, Kolkata 700000 (sample address)",
  phone: "+91 90000 00000 (demo number)",
  email: "hello@shreeuniversal.example",
  hours: [
    { day: "Mon – Sat", time: "8:00 AM – 10:00 PM" },
    { day: "Sunday", time: "9:00 AM – 2:00 PM" },
  ],
  licence: "Drug Licence No. DEMO-0000/SAMPLE",
  pharmacist: "Ph. Anil Deshmukh (demo pharmacist)",
  services: [
    "Prescription order requests",
    "Home delivery within 5 km",
    "Store pickup in 30 minutes",
    "Pharmacist call-back",
    "Digital payment receipts",
  ],
};

export const INVENTORY: InventoryItem[] = [
  { id: "inv-1", name: "Paracetamol", strength: "500 mg", form: "Tablet", packInfo: "Strip of 10", manufacturer: "Sample Pharma Ltd (demo)", unitPrice: 2, stock: 480 },
  { id: "inv-2", name: "Cetirizine", strength: "10 mg", form: "Tablet", packInfo: "Strip of 10", manufacturer: "Demo Labs (demo)", unitPrice: 1.8, stock: 220 },
  { id: "inv-3", name: "Pantoprazole", strength: "40 mg", form: "Tablet", packInfo: "Strip of 15", manufacturer: "Sample Pharma Ltd (demo)", unitPrice: 7.5, stock: 9 },
  { id: "inv-4", name: "Vitamin D3", strength: "60000 IU", form: "Capsule", packInfo: "Pack of 4", manufacturer: "Example Healthcare (demo)", unitPrice: 32, stock: 60 },
  { id: "inv-5", name: "Amoxicillin", strength: "500 mg", form: "Capsule", packInfo: "Strip of 10", manufacturer: "Demo Labs (demo)", unitPrice: 9, stock: 0 },
  { id: "inv-6", name: "Metformin", strength: "500 mg", form: "Tablet", packInfo: "Strip of 20", manufacturer: "Example Healthcare (demo)", unitPrice: 1.6, stock: 340 },
  { id: "inv-7", name: "ORS Sachet", strength: "21 g", form: "Powder", packInfo: "Single sachet", manufacturer: "Sample Pharma Ltd (demo)", unitPrice: 22, stock: 75 },
  { id: "inv-8", name: "Azithromycin", strength: "500 mg", form: "Tablet", packInfo: "Strip of 3", manufacturer: "Demo Labs (demo)", unitPrice: 24, stock: 30 },
  { id: "inv-9", name: "Montelukast", strength: "10 mg", form: "Tablet", packInfo: "Strip of 10", manufacturer: "Example Healthcare (demo)", unitPrice: 12, stock: 45 },
  { id: "inv-10", name: "Amlodipine", strength: "5 mg", form: "Tablet", packInfo: "Strip of 15", manufacturer: "Sample Pharma Ltd (demo)", unitPrice: 3.2, stock: 150 },
];

export const SAMPLE_PRESCRIPTION_TEXT = `=====================================================
 *** SAMPLE ONLY - FICTIONAL - NOT A VALID PRESCRIPTION ***
=====================================================
Dr. Kalpana Imaginary, MBBS  (FICTIONAL DOCTOR)
Demo Health Clinic  (not a real clinic)
Reg. No: DEMO-000000

Date: 06-11-2026
Patient: Rohan Fictional-Verma  (FICTIONAL PATIENT)

Rx
1. Paracetamol 500 mg tablet ........ Qty: 10
2. Cetirizine 10 mg tablet .......... Qty: 5
3. Pantoprazole 40 mg tablet ........ Qty: 15
4. Vitamin D3 60000 IU capsule ...... Qty: 4

Typed sample for a software demo. Contains no dosing
instructions and must not be used to dispense medicine.

Signature: [DEMO - NOT SIGNED]
=====================================================`;

const id = (p: string, n: number) => `${p}-${String(n).padStart(3, "0")}`;

export function createSeed(now = new Date()): DemoState {
  const t = now.getTime();
  const H = 3600_000;
  const D = 24 * H;
  const at = (ms: number) => new Date(t + ms).toISOString();

  const people = [
    { name: "Aarav Sharma", phone: "+91 90000 10001", city: "Kolkata", email: "aarav.demo@example.com", ch: "WhatsApp" },
    { name: "Priya Nair", phone: "+91 90000 10002", city: "Howrah", email: "priya.demo@example.com", ch: "WhatsApp" },
    { name: "Rohan Mehta", phone: "+91 90000 10003", city: "Kolkata", email: "rohan.demo@example.com", ch: "Email" },
    { name: "Ananya Iyer", phone: "+91 90000 10004", city: "Salt Lake", email: "ananya.demo@example.com", ch: "WhatsApp" },
    { name: "Vikram Singh", phone: "+91 90000 10005", city: "New Town", email: "vikram.demo@example.com", ch: "Phone" },
    { name: "Sneha Patil", phone: "+91 90000 10006", city: "Kolkata", email: "sneha.demo@example.com", ch: "WhatsApp" },
    { name: "Arjun Reddy", phone: "+91 90000 10007", city: "Dum Dum", email: "arjun.demo@example.com", ch: "Email" },
    { name: "Kavya Menon", phone: "+91 90000 10008", city: "Howrah", email: "kavya.demo@example.com", ch: "WhatsApp" },
    { name: "Rahul Gupta", phone: "+91 90000 10009", city: "Kolkata", email: "rahul.demo@example.com", ch: "Phone" },
    { name: "Meera Joshi", phone: "+91 90000 10010", city: "Behala", email: "meera.demo@example.com", ch: "WhatsApp" },
  ] as const;

  const patients: Patient[] = people.map((p, i) => ({
    id: id("pat", i + 1),
    name: p.name,
    phone: p.phone,
    email: p.email,
    city: p.city,
    preferredChannel: p.ch,
    createdAt: at(-(40 - i * 3) * D),
    consent: true,
  }));

  const leadRows: [string, string, Lead["source"], string, Lead["status"], number][] = [
    ["Aarav Sharma", "+91 90000 10001", "Chatbot", "Prescription order", "Converted", -6 * D],
    ["Priya Nair", "+91 90000 10002", "WhatsApp", "Monthly refill", "Converted", -5 * D],
    ["Siddharth Banerjee", "+91 90000 10011", "Website", "Home delivery enquiry", "New", -3 * H],
    ["Pooja Das", "+91 90000 10012", "Voice Assistant", "Prescription order", "Contacted", -1 * D],
    ["Imran Qureshi", "+91 90000 10013", "Walk-in", "Store timings", "Contacted", -2 * D],
    ["Neha Kulkarni", "+91 90000 10014", "Website", "Prescription order", "New", -5 * H],
    ["Harpreet Kaur", "+91 90000 10015", "Referral", "Monthly refill", "Converted", -9 * D],
    ["Farhan Ali", "+91 90000 10016", "Chatbot", "Price enquiry", "Lost", -12 * D],
    ["Rohan Mehta", "+91 90000 10003", "Website", "Prescription order", "Converted", -4 * D],
    ["Ishita Chatterjee", "+91 90000 10017", "WhatsApp", "Pharmacist call-back", "New", -1 * H],
    ["Karthik Subramanian", "+91 90000 10018", "Chatbot", "Prescription order", "Contacted", -2 * D],
    ["Divya Agarwal", "+91 90000 10019", "Voice Assistant", "Home delivery enquiry", "New", -30 * 60_000],
    ["Vikram Singh", "+91 90000 10005", "Walk-in", "Prescription order", "Converted", -8 * D],
    ["Sanjana Bose", "+91 90000 10020", "Referral", "Price enquiry", "Contacted", -3 * D],
  ];
  const leads: Lead[] = leadRows.map(([name, phone, source, interest, status, off], i) => ({
    id: id("lead", i + 1),
    name,
    phone,
    source,
    interest,
    status,
    createdAt: at(off),
  }));

  const appointments: Appointment[] = [
    { id: id("apt", 1), patientName: "Ishita Chatterjee", phone: "+91 90000 10017", type: "Pharmacist call-back", at: at(2 * H), status: "Scheduled", assignedTo: "Ph. Anil Deshmukh" },
    { id: id("apt", 2), patientName: "Ananya Iyer", phone: "+91 90000 10004", type: "Prescription pickup", at: at(4 * H), status: "Scheduled", assignedTo: "Counter – Ritu" },
    { id: id("apt", 3), patientName: "Sneha Patil", phone: "+91 90000 10006", type: "Home delivery slot", at: at(1 * D + 3 * H), status: "Scheduled", assignedTo: "Delivery – Manoj" },
    { id: id("apt", 4), patientName: "Arjun Reddy", phone: "+91 90000 10007", type: "Store visit", at: at(2 * D), status: "Scheduled", assignedTo: "Counter – Ritu" },
    { id: id("apt", 5), patientName: "Priya Nair", phone: "+91 90000 10002", type: "Home delivery slot", at: at(-1 * D), status: "Completed", assignedTo: "Delivery – Manoj" },
    { id: id("apt", 6), patientName: "Farhan Ali", phone: "+91 90000 10016", type: "Pharmacist call-back", at: at(-2 * D), status: "Cancelled", assignedTo: "Ph. Anil Deshmukh" },
  ];

  const sampleFile = {
    name: "sample-prescription-FICTIONAL.txt",
    type: "text/plain",
    text: SAMPLE_PRESCRIPTION_TEXT,
  };

  const orders: OrderRequest[] = [
    {
      id: "ORD-1001", patientName: "Aarav Sharma", phone: "+91 90000 10001", source: "Chatbot",
      createdAt: at(-6 * D), status: "Delivered", deliveryMode: "Home delivery", file: sampleFile,
      draftItems: [
        { id: "i1", name: "Paracetamol", strength: "500 mg", quantity: 10, confidence: 0.97 },
        { id: "i2", name: "Cetirizine", strength: "10 mg", quantity: 5, confidence: 0.95 },
      ],
      finalItems: [
        { id: "i1", name: "Paracetamol", strength: "500 mg", quantity: 10 },
        { id: "i2", name: "Cetirizine", strength: "10 mg", quantity: 5 },
      ],
      reviewer: "Ph. Anil Deshmukh", reviewedAt: at(-6 * D + 2 * H),
    },
    {
      id: "ORD-1002", patientName: "Priya Nair", phone: "+91 90000 10002", source: "WhatsApp",
      createdAt: at(-5 * D), status: "Delivered", deliveryMode: "Home delivery",
      requestText: "Monthly refill – Metformin 500 mg, 40 tablets",
      draftItems: [{ id: "i1", name: "Metformin", strength: "500 mg", quantity: 40, confidence: 0.93 }],
      finalItems: [{ id: "i1", name: "Metformin", strength: "500 mg", quantity: 40 }],
      reviewer: "Ph. Anil Deshmukh", reviewedAt: at(-5 * D + 1 * H),
    },
    {
      id: "ORD-1003", patientName: "Rohan Mehta", phone: "+91 90000 10003", source: "Website",
      createdAt: at(-4 * D), status: "Out for delivery", deliveryMode: "Home delivery", file: sampleFile,
      draftItems: [
        { id: "i1", name: "Pantoprazole", strength: "40 mg", quantity: 15, confidence: 0.91 },
        { id: "i2", name: "Vitamin D3", strength: "60000 IU", quantity: 4, confidence: 0.88 },
      ],
      finalItems: [
        { id: "i1", name: "Pantoprazole", strength: "40 mg", quantity: 15 },
        { id: "i2", name: "Vitamin D3", strength: "60000 IU", quantity: 4 },
      ],
      reviewer: "Ph. Anil Deshmukh", reviewedAt: at(-4 * D + 3 * H),
    },
    {
      id: "ORD-1004", patientName: "Vikram Singh", phone: "+91 90000 10005", source: "Walk-in",
      createdAt: at(-2 * D), status: "Packed", deliveryMode: "Store pickup",
      requestText: "Amlodipine 5 mg x 30",
      draftItems: [{ id: "i1", name: "Amlodipine", strength: "5 mg", quantity: 30, confidence: 0.96 }],
      finalItems: [{ id: "i1", name: "Amlodipine", strength: "5 mg", quantity: 30 }],
      reviewer: "Ph. Anil Deshmukh", reviewedAt: at(-2 * D + 1 * H),
    },
    {
      id: "ORD-1005", patientName: "Ananya Iyer", phone: "+91 90000 10004", source: "Chatbot",
      createdAt: at(-1 * D), status: "Approved", deliveryMode: "Store pickup", file: sampleFile,
      draftItems: [
        { id: "i1", name: "Montelukast", strength: "10 mg", quantity: 10, confidence: 0.9 },
        { id: "i2", name: "Cetirizine", strength: "10 mg", quantity: 10, confidence: 0.94 },
      ],
      finalItems: [
        { id: "i1", name: "Montelukast", strength: "10 mg", quantity: 10 },
        { id: "i2", name: "Cetirizine", strength: "10 mg", quantity: 10 },
      ],
      reviewer: "Ph. Anil Deshmukh", reviewedAt: at(-20 * H), edited: true,
      reviewNote: "Quantity corrected after checking original.",
    },
    {
      id: "ORD-1006", patientName: "Farhan Ali", phone: "+91 90000 10016", source: "Chatbot",
      createdAt: at(-3 * D), status: "Rejected", deliveryMode: "Home delivery",
      requestText: "Need antibiotics without prescription",
      draftItems: [{ id: "i1", name: "Amoxicillin", strength: "500 mg", quantity: 10, confidence: 0.72 }],
      reviewer: "Ph. Anil Deshmukh", reviewedAt: at(-3 * D + 2 * H),
      rejectionReason: "Valid prescription required",
    },
    {
      id: "ORD-1007", patientName: "Pooja Das", phone: "+91 90000 10012", source: "Voice Assistant",
      createdAt: at(-2 * H), status: "Pending pharmacist review", deliveryMode: "Home delivery",
      requestText: "Paracetamol 500 mg 10 tablets and ORS 5 sachets",
      draftItems: [
        { id: "i1", name: "Paracetamol", strength: "500 mg", quantity: 10, confidence: 0.92 },
        { id: "i2", name: "ORS Sachet", strength: "21 g", quantity: 5, confidence: 0.86 },
      ],
    },
    {
      id: "ORD-1008", patientName: "Karthik Subramanian", phone: "+91 90000 10018", source: "Chatbot",
      createdAt: at(-40 * 60_000), status: "Pending pharmacist review", deliveryMode: "Store pickup", file: sampleFile,
      draftItems: [
        { id: "i1", name: "Paracetamol", strength: "500 mg", quantity: 10, confidence: 0.97 },
        { id: "i2", name: "Cetirizine", strength: "10 mg", quantity: 5, confidence: 0.95 },
        { id: "i3", name: "Pantoprazole", strength: "40 mg", quantity: 15, confidence: 0.89 },
        { id: "i4", name: "Vitamin D3", strength: "60000 IU", quantity: 4, confidence: 0.84 },
      ],
    },
  ];

  const payments: Payment[] = [
    { id: id("pay", 1), orderId: "ORD-1001", patientName: "Aarav Sharma", total: 29, paid: 29, method: "UPI", updatedAt: at(-6 * D + 5 * H) },
    { id: id("pay", 2), orderId: "ORD-1002", patientName: "Priya Nair", total: 64, paid: 64, method: "Cash", updatedAt: at(-5 * D + 4 * H) },
    { id: id("pay", 3), orderId: "ORD-1003", patientName: "Rohan Mehta", total: 240.5, paid: 100, method: "UPI", updatedAt: at(-4 * D + 4 * H) },
    { id: id("pay", 4), orderId: "ORD-1004", patientName: "Vikram Singh", total: 96, paid: 0, method: "Not yet paid", updatedAt: at(-2 * D + 1 * H) },
    { id: id("pay", 5), orderId: "ORD-1005", patientName: "Ananya Iyer", total: 138, paid: 0, method: "Not yet paid", updatedAt: at(-20 * H) },
    { id: id("pay", 6), orderId: "DEMO-INV-0991", patientName: "Harpreet Kaur", total: 450, paid: 300, method: "Card", updatedAt: at(-9 * D) },
  ];

  const fu = (
    n: number, channel: FollowUp["channel"], title: string, detail: string,
    patientName: string, off: number, status: FollowUp["status"], orderId?: string,
  ): FollowUp => ({ id: id("fu", n), channel, title, detail, patientName, at: at(off), status, orderId });

  const followUps: FollowUp[] = [
    fu(1, "WhatsApp", "Order approved message", "Template: order_approved_v1 (simulated)", "Aarav Sharma", -6 * D + 2 * H, "Sent", "ORD-1001"),
    fu(2, "Email", "Payment receipt", "Receipt for ORD-1001 emailed (simulated)", "Aarav Sharma", -6 * D + 5 * H, "Sent", "ORD-1001"),
    fu(3, "WhatsApp", "Refill reminder", "Monthly refill reminder (simulated)", "Priya Nair", -1 * D, "Sent", "ORD-1002"),
    fu(4, "Team call", "Balance payment reminder", "Call to collect ₹140.50 balance", "Rohan Mehta", -3 * H, "Scheduled", "ORD-1003"),
    fu(5, "WhatsApp", "Out-for-delivery update", "Delivery partner assigned (simulated)", "Rohan Mehta", -1 * H, "Sent", "ORD-1003"),
    fu(6, "Team call", "Ready for pickup call", "Inform order is packed", "Vikram Singh", 1 * H, "Scheduled", "ORD-1004"),
    fu(7, "Email", "Pickup reminder", "Order ORD-1005 ready for pickup (simulated)", "Ananya Iyer", 3 * H, "Scheduled", "ORD-1005"),
    fu(8, "Team call", "New lead call-back", "Website enquiry – home delivery", "Siddharth Banerjee", -30 * 60_000, "Scheduled"),
    fu(9, "WhatsApp", "Welcome message", "Lead welcome template (simulated)", "Ishita Chatterjee", -50 * 60_000, "Sent"),
    fu(10, "Team call", "Pharmacist call-back", "Patient requested to talk to pharmacist", "Ishita Chatterjee", 2 * H, "Scheduled"),
    fu(11, "Email", "Re-engagement email", "We miss you – sample campaign (simulated)", "Farhan Ali", 1 * D, "Scheduled"),
    fu(12, "WhatsApp", "Refill reminder", "Next monthly refill due (simulated)", "Priya Nair", 2 * D, "Scheduled", "ORD-1002"),
    fu(13, "Team call", "Review pending order", "Voice order awaiting pharmacist", "Pooja Das", -1 * H, "Scheduled", "ORD-1007"),
    fu(14, "Team call", "Feedback call", "Delivery feedback", "Aarav Sharma", -4 * D, "Done", "ORD-1001"),
  ];

  return {
    version: STATE_VERSION,
    seededAt: now.toISOString(),
    leads,
    appointments,
    patients,
    inventory: INVENTORY.map((x) => ({ ...x })),
    orders,
    payments,
    followUps,
  };
}
