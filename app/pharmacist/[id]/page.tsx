"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useDemo } from "@/lib/store";
import { availability, fmtDateTime, inr, orderTotal, uid } from "@/lib/logic";
import type { OrderItem } from "@/lib/types";
import { Badge, Button, Card, DemoName, Empty, PageHeader, StatusBadge } from "@/components/ui";

const REJECT_REASONS = [
  "Valid prescription required",
  "File unclear / unreadable",
  "Prescription details do not match",
  "Item not supplied by this pharmacy",
  "Other – pharmacist will call patient",
];

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, approveOrder, rejectOrder } = useDemo();
  const order = state.orders.find((o) => o.id === decodeURIComponent(id));

  const [items, setItems] = useState<OrderItem[]>(() => (order?.finalItems ?? order?.draftItems ?? []).map((i) => ({ ...i })));
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState(REJECT_REASONS[0]);

  if (!order) return <Empty>Order not found — it may have been cleared by a demo reset.</Empty>;

  const pending = order.status === "Pending pharmacist review";
  const setItem = (i: number, patch: Partial<OrderItem>) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const valid = items.length > 0 && items.every((i) => i.name.trim() && i.strength.trim() && i.quantity > 0);

  const approve = () => {
    approveOrder(order.id, items.map(({ confidence: _c, ...rest }) => rest), note || undefined);
    router.push(`/order/${order.id}`);
  };

  const reject = () => {
    rejectOrder(order.id, reason);
    setRejecting(false);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Step 4 · Staff · Pharmacist approval"
        title={`Review ${order.id}`}
        subtitle={<><DemoName name={order.patientName} /> · {order.phone} · {order.source} · {fmtDateTime(order.createdAt)}</>}
        actions={<StatusBadge status={order.status} />}
      />

      <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Original file</h2>
            <Badge tone="amber">Fictional sample</Badge>
          </div>
          {order.file?.dataUrl ? (
            <img src={order.file.dataUrl} alt="Original uploaded fictional sample" className="w-full rounded-xl ring-1 ring-slate-200" />
          ) : order.file?.text ? (
            <pre className="max-h-[520px] overflow-auto rounded-xl bg-amber-50/50 p-4 font-mono text-xs leading-relaxed text-slate-800 ring-1 ring-amber-200">{order.file.text}</pre>
          ) : (
            <div className="rounded-xl bg-slate-50 p-4 text-sm">
              <p className="text-slate-500">No file attached. Patient&apos;s typed / spoken request:</p>
              <p className="mt-2 font-medium">“{order.requestText ?? "—"}”</p>
            </div>
          )}
          {order.file && <p className="mt-2 text-xs text-slate-500">{order.file.name}</p>}
        </Card>

        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold">{pending ? "AI draft (editable)" : order.status === "Rejected" ? "Draft (rejected)" : "Approved items"}</h2>
            {pending && (
              <Button variant="ghost" className="px-2 py-1" onClick={() => setEditing((e) => !e)}>{editing ? "Done editing" : "✎ Edit draft"}</Button>
            )}
          </div>

          <div className="space-y-2">
            {items.map((it, i) => {
              const av = availability(state.inventory, it);
              const orig = order.draftItems.find((d) => d.id === it.id);
              const changed = !orig || orig.name !== it.name || orig.strength !== it.strength || orig.quantity !== it.quantity;
              return (
                <div key={it.id} className="rounded-xl border border-slate-200 p-3">
                  {editing && pending ? (
                    <div className="grid grid-cols-[1fr_90px] gap-2 sm:grid-cols-[1fr_110px_80px_auto]">
                      <input aria-label="Medicine name" className="col-span-2 rounded-lg border border-slate-300 px-2 py-1.5 text-sm sm:col-span-1" value={it.name} onChange={(e) => setItem(i, { name: e.target.value })} />
                      <input aria-label="Strength" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={it.strength} onChange={(e) => setItem(i, { strength: e.target.value })} />
                      <input aria-label="Quantity" type="number" min={1} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={it.quantity} onChange={(e) => setItem(i, { quantity: Math.max(0, Number(e.target.value)) })} />
                      <button className="col-span-2 rounded-lg px-2 py-1 text-sm text-rose-600 hover:bg-rose-50 sm:col-span-1" onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))}>Remove</button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{it.name}</span>
                      <span className="text-slate-600">{it.strength}</span>
                      <span className="text-slate-600">× {it.quantity}</span>
                      {it.confidence !== undefined && pending && (
                        <Badge tone={it.confidence >= 0.9 ? "green" : "amber"}>AI {Math.round(it.confidence * 100)}%</Badge>
                      )}
                      {changed && <Badge tone="violet">edited</Badge>}
                    </div>
                  )}
                  <div className="mt-1.5 text-xs"><Badge tone={av.tone}>{av.label}</Badge></div>
                </div>
              );
            })}
            {editing && pending && (
              <Button variant="secondary" className="w-full" onClick={() => setItems((xs) => [...xs, { id: uid("it"), name: "", strength: "", quantity: 1 }])}>+ Add item</Button>
            )}
            {items.length === 0 && <Empty>No items. Add items or reject the request.</Empty>}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 text-sm">
            <span className="text-slate-600">Estimated total (demo prices)</span>
            <span className="text-lg font-bold">{inr(orderTotal(state.inventory, items))}</span>
          </div>

          {pending ? (
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="text-slate-600">Pharmacist note (internal, optional)</span>
                <input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="e.g. Verified against original" />
              </label>
              <label className="flex items-start gap-2 text-xs text-slate-600">
                <input type="checkbox" defaultChecked readOnly className="mt-0.5" />
                I have compared this draft with the original file (demo checklist)
              </label>
              <div className="grid gap-2 sm:grid-cols-3">
                <Button onClick={approve} disabled={!valid}>✓ Approve</Button>
                <Button variant="secondary" onClick={() => setEditing(true)}>✎ Edit</Button>
                <Button variant="danger" onClick={() => setRejecting(true)}>✕ Reject</Button>
              </div>
              {rejecting && (
                <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <label className="block text-sm font-medium text-rose-900">
                    Rejection reason
                    <select value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded-lg border border-rose-300 bg-white px-2 py-2 font-normal">
                      {REJECT_REASONS.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </label>
                  <div className="flex gap-2">
                    <Button variant="danger" onClick={reject}>Confirm reject</Button>
                    <Button variant="secondary" onClick={() => setRejecting(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-2 text-sm">
              <p className="text-slate-600">
                Reviewed by {order.reviewer} {order.reviewedAt && `· ${fmtDateTime(order.reviewedAt)}`}
                {order.edited && " · draft was edited"}
              </p>
              {order.reviewNote && <p className="rounded-lg bg-slate-50 p-2">Note: {order.reviewNote}</p>}
              {order.rejectionReason && <p className="rounded-lg bg-rose-50 p-2 text-rose-800">Rejected: {order.rejectionReason}</p>}
              <Button href={`/order/${order.id}`} variant="secondary">View patient order page →</Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
