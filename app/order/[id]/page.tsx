"use client";

import { useParams } from "next/navigation";
import { useDemo } from "@/lib/store";
import { availability, findInventory, fmtDateTime, inr, orderTotal, paymentStatus } from "@/lib/logic";
import type { OrderStatus } from "@/lib/types";
import { Badge, Button, Card, DemoName, Empty, PageHeader, SafetyNote, StatusBadge, cx } from "@/components/ui";
import { TalkToPharmacist } from "@/components/TalkToPharmacist";

const FLOW: OrderStatus[] = ["Pending pharmacist review", "Approved", "Packed", "Out for delivery", "Delivered"];

export default function OrderStatusPage() {
  const { id } = useParams<{ id: string }>();
  const { state, setOrderStatus } = useDemo();
  const order = state.orders.find((o) => o.id === decodeURIComponent(id));
  if (!order) return <Empty>Order not found — it may have been cleared by a demo reset.</Empty>;

  const flow = order.deliveryMode === "Store pickup" ? FLOW.map((s) => (s === "Out for delivery" ? "Ready for pickup" : s === "Delivered" ? "Collected" : s)) : FLOW;
  const idx = FLOW.indexOf(order.status);
  const rejected = order.status === "Rejected";
  const pending = order.status === "Pending pharmacist review";
  const items = order.finalItems ?? [];
  const total = orderTotal(state.inventory, items);
  const payment = state.payments.find((p) => p.orderId === order.id);
  const next = idx >= 1 && idx < FLOW.length - 1 ? FLOW[idx + 1] : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        eyebrow="Step 5 · Patient view"
        title={`Your order ${order.id}`}
        subtitle={<>For <DemoName name={order.patientName} /> · {order.deliveryMode}</>}
        actions={<StatusBadge status={order.status} />}
      />

      {/* Status tracker */}
      <Card>
        {rejected ? (
          <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-900">
            <p className="font-bold">The pharmacist could not approve this request.</p>
            <p className="mt-1">Reason: {order.rejectionReason}. Our team will call you to explain the next steps.</p>
          </div>
        ) : (
          <ol className="grid grid-cols-5 gap-1">
            {flow.map((s, i) => (
              <li key={s} className="flex flex-col items-center text-center">
                <span className={cx("grid h-8 w-8 place-items-center rounded-full text-xs font-bold",
                  i < idx ? "bg-brand-600 text-white" : i === idx ? "bg-brand-600 text-white ring-4 ring-brand-100" : "bg-slate-200 text-slate-500")}>
                  {i < idx ? "✓" : i + 1}
                </span>
                <span className={cx("mt-1.5 text-[11px] leading-tight sm:text-xs", i <= idx ? "font-semibold text-slate-900" : "text-slate-500")}>
                  {s === "Pending pharmacist review" ? "Pharmacist review" : s}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {pending && (
        <Card className="border-amber-300 bg-amber-50 text-sm text-amber-900">
          Your request is <strong>pending pharmacist review</strong>. Medicine details, availability and the order total will appear here once a
          pharmacist approves it.
        </Card>
      )}

      {!pending && !rejected && (
        <>
          <Card className="p-0 sm:p-0">
            <div className="flex items-center justify-between px-4 pt-4 sm:px-5">
              <h2 className="font-bold">Medicines</h2>
              <Badge tone="green">Pharmacist approved</Badge>
            </div>
            <ul className="divide-y divide-slate-100">
              {items.map((it) => {
                const inv = findInventory(state.inventory, it);
                const av = availability(state.inventory, it);
                return (
                  <li key={it.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
                    <div className="flex-1">
                      <p className="font-semibold">{it.name} {it.strength}</p>
                      <p className="text-xs text-slate-500">
                        {inv ? `${inv.form} · ${inv.packInfo} · ${inv.manufacturer}` : "Details to be confirmed by pharmacist"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-slate-600">Qty {it.quantity}</span>
                      <Badge tone={av.tone}>{av.label}</Badge>
                      <span className="w-20 text-right font-medium">{inv ? inr(inv.unitPrice * it.quantity) : "—"}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 sm:px-5">
              <span className="text-sm text-slate-600">Order total (demo prices, incl. taxes)</span>
              <span className="text-xl font-black">{inr(total)}</span>
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="text-sm">
              <p className="text-slate-500">Payment</p>
              {payment ? (
                <>
                  <div className="mt-1 flex items-center gap-2"><StatusBadge status={paymentStatus(payment)} /><span>{inr(payment.paid)} paid of {inr(payment.total)}</span></div>
                  <p className="mt-1 text-xs text-slate-500">Pay at the counter or via UPI on delivery (simulated — no real payment).</p>
                </>
              ) : <p className="mt-1">Not yet generated</p>}
            </Card>
            <Card className="text-sm">
              <p className="text-slate-500">Reviewed by</p>
              <p className="mt-1 font-medium">{order.reviewer}</p>
              {order.reviewedAt && <p className="text-xs text-slate-500">{fmtDateTime(order.reviewedAt)}</p>}
            </Card>
          </div>
        </>
      )}

      <SafetyNote>
        This page shows order information only. For questions about how to take your medicines, please talk to our pharmacist or your doctor.
      </SafetyNote>

      <div className="flex flex-col gap-2 sm:flex-row">
        <TalkToPharmacist patientName={order.patientName} phone={order.phone} orderId={order.id} className="sm:flex-1" />
        <Button variant="secondary" href={`/extraction/${order.id}`}>View original draft</Button>
      </div>

      {next && (
        <Card className="border-dashed bg-slate-50">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Presenter controls (not visible to patients)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setOrderStatus(order.id, next)}>
              Advance to “{flow[FLOW.indexOf(next)]}”
            </Button>
            <Button variant="ghost" href="/payments">Open payments →</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
