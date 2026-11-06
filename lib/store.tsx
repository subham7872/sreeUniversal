"use client";

// Demo state lives only in this browser's localStorage. No server, no network calls.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createSeed, STATE_VERSION } from "./seed";
import { orderTotal, uid } from "./logic";
import type { DemoState, FollowUp, Lead, OrderItem, OrderRequest, OrderStatus, Payment } from "./types";

const KEY = "shree-universal-demo-state";

type NewOrderInput = Pick<OrderRequest, "patientName" | "phone" | "source" | "deliveryMode" | "draftItems"> &
  Partial<Pick<OrderRequest, "file" | "requestText">>;

interface StoreApi {
  state: DemoState;
  ready: boolean;
  reset: () => void;
  createOrderRequest: (input: NewOrderInput) => string;
  approveOrder: (id: string, items: OrderItem[], note?: string) => void;
  rejectOrder: (id: string, reason: string) => void;
  setOrderStatus: (id: string, status: OrderStatus) => void;
  setLeadStatus: (id: string, status: Lead["status"]) => void;
  recordPayment: (id: string, amount: number, method: Payment["method"]) => void;
  completeFollowUp: (id: string) => void;
  requestPharmacistCall: (patientName: string, phone: string, orderId?: string) => void;
}

const Ctx = createContext<StoreApi | null>(null);

const REVIEWER = "Ph. Anil Deshmukh";

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(() => createSeed());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DemoState;
        if (parsed.version === STATE_VERSION) setState(parsed);
      }
    } catch {
      /* storage unavailable — fall back to fresh seed */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* quota or private mode — demo keeps working in memory */
    }
  }, [state, ready]);

  const update = useCallback((fn: (s: DemoState) => DemoState) => setState((s) => fn(s)), []);

  const api = useMemo<StoreApi>(() => {
    const now = () => new Date().toISOString();
    const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

    const addFollowUps = (s: DemoState, items: Omit<FollowUp, "id">[]): FollowUp[] => [
      ...items.map((f) => ({ ...f, id: uid("fu") })),
      ...s.followUps,
    ];

    return {
      state,
      ready,
      reset: () => {
        const fresh = createSeed();
        setState(fresh);
      },

      createOrderRequest: (input) => {
        const maxN = Math.max(1000, ...state.orders.map((o) => Number(o.id.replace(/\D/g, "")) || 0));
        const id = `ORD-${maxN + 1}`;
        update((s) => {
          const order: OrderRequest = { ...input, id, createdAt: now(), status: "Pending pharmacist review" };
          const lead: Lead = {
            id: uid("lead"),
            name: input.patientName,
            phone: input.phone,
            source: input.source,
            interest: input.file ? "Prescription order" : "Order request",
            status: "New",
            createdAt: now(),
          };
          return {
            ...s,
            orders: [order, ...s.orders],
            leads: [lead, ...s.leads],
            followUps: addFollowUps(s, [
              { channel: "WhatsApp", title: "Request received message", detail: `Order ${id} received – pending pharmacist review (simulated)`, patientName: input.patientName, at: now(), status: "Sent", orderId: id },
              { channel: "Team call", title: "Review new order request", detail: `Pharmacist to review ${id}`, patientName: input.patientName, at: inHours(0.5), status: "Scheduled", orderId: id },
            ]),
          };
        });
        return id;
      },

      approveOrder: (id, items, note) =>
        update((s) => {
          const order = s.orders.find((o) => o.id === id);
          if (!order) return s;
          const edited = JSON.stringify(items.map(({ name, strength, quantity }) => [name, strength, quantity])) !==
            JSON.stringify(order.draftItems.map(({ name, strength, quantity }) => [name, strength, quantity]));
          const total = Math.round(orderTotal(s.inventory, items) * 100) / 100;
          const payments = s.payments.some((p) => p.orderId === id)
            ? s.payments.map((p) => (p.orderId === id ? { ...p, total, updatedAt: now() } : p))
            : [{ id: uid("pay"), orderId: id, patientName: order.patientName, total, paid: 0, method: "Not yet paid" as const, updatedAt: now() }, ...s.payments];
          return {
            ...s,
            orders: s.orders.map((o) =>
              o.id === id
                ? { ...o, status: "Approved", finalItems: items, reviewer: REVIEWER, reviewedAt: now(), reviewNote: note, edited, rejectionReason: undefined }
                : o,
            ),
            leads: s.leads.map((l) => (l.phone === order.phone && l.status !== "Converted" ? { ...l, status: "Converted" } : l)),
            payments,
            followUps: addFollowUps(
              { ...s, followUps: s.followUps.map((f) => (f.orderId === id && f.title === "Review new order request" ? { ...f, status: "Done" } : f)) },
              [
                { channel: "WhatsApp", title: "Order approved message", detail: `${id} approved by pharmacist (simulated)`, patientName: order.patientName, at: now(), status: "Sent", orderId: id },
                { channel: "Email", title: "Payment link reminder", detail: `Demo payment reminder for ${id}`, patientName: order.patientName, at: inHours(4), status: "Scheduled", orderId: id },
                { channel: "Team call", title: order.deliveryMode === "Home delivery" ? "Confirm delivery address" : "Ready-for-pickup call", detail: `Call patient about ${id}`, patientName: order.patientName, at: inHours(1), status: "Scheduled", orderId: id },
              ],
            ),
          };
        }),

      rejectOrder: (id, reason) =>
        update((s) => {
          const order = s.orders.find((o) => o.id === id);
          if (!order) return s;
          return {
            ...s,
            orders: s.orders.map((o) => (o.id === id ? { ...o, status: "Rejected", rejectionReason: reason, reviewer: REVIEWER, reviewedAt: now() } : o)),
            followUps: addFollowUps(s, [
              { channel: "Team call", title: "Explain rejected request", detail: `Reason: ${reason}`, patientName: order.patientName, at: inHours(1), status: "Scheduled", orderId: id },
            ]),
          };
        }),

      setOrderStatus: (id, status) =>
        update((s) => ({ ...s, orders: s.orders.map((o) => (o.id === id ? { ...o, status } : o)) })),

      setLeadStatus: (id, status) =>
        update((s) => ({ ...s, leads: s.leads.map((l) => (l.id === id ? { ...l, status } : l)) })),

      recordPayment: (id, amount, method) =>
        update((s) => ({
          ...s,
          payments: s.payments.map((p) =>
            p.id === id ? { ...p, paid: Math.min(p.total, Math.round((p.paid + amount) * 100) / 100), method, updatedAt: now() } : p,
          ),
        })),

      completeFollowUp: (id) =>
        update((s) => ({ ...s, followUps: s.followUps.map((f) => (f.id === id ? { ...f, status: "Done" } : f)) })),

      requestPharmacistCall: (patientName, phone, orderId) =>
        update((s) => ({
          ...s,
          appointments: [
            { id: uid("apt"), patientName, phone, type: "Pharmacist call-back", at: inHours(0.25), status: "Scheduled", assignedTo: REVIEWER },
            ...s.appointments,
          ],
          followUps: addFollowUps(s, [
            { channel: "Team call", title: "Talk to pharmacist request", detail: "Patient asked to speak with a pharmacist", patientName, at: inHours(0.25), status: "Scheduled", orderId },
          ]),
        })),
    };
  }, [state, ready, update]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useDemo() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDemo must be used inside DemoStoreProvider");
  return ctx;
}
