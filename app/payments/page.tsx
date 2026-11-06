"use client";

import Link from "next/link";
import { useState } from "react";
import { useDemo } from "@/lib/store";
import { fmtDateTime, inr, paymentStatus } from "@/lib/logic";
import type { Payment } from "@/lib/types";
import { Badge, Button, Card, DemoName, PageHeader, Stat, StatusBadge, cx } from "@/components/ui";

const FILTERS = ["All", "Paid", "Partially paid", "Pending"] as const;

export default function PaymentsPage() {
  const { state, recordPayment } = useDemo();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [editing, setEditing] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Payment["method"]>("UPI");

  const billed = state.payments.reduce((s, p) => s + p.total, 0);
  const paid = state.payments.reduce((s, p) => s + p.paid, 0);
  const pending = state.payments.filter((p) => paymentStatus(p) === "Pending").reduce((s, p) => s + p.total, 0);
  const balance = state.payments.filter((p) => paymentStatus(p) === "Partially paid").reduce((s, p) => s + (p.total - p.paid), 0);
  const list = state.payments.filter((p) => filter === "All" || paymentStatus(p) === filter);

  const save = (p: Payment) => {
    const n = Number(amount);
    if (!n || n <= 0) return;
    recordPayment(p.id, n, method);
    setEditing(null);
    setAmount("");
  };

  return (
    <div>
      <PageHeader eyebrow="Step 8 · Staff" title="Payment tracking" subtitle="Simulated payments only — no payment gateway is connected." />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total billed" value={inr(billed)} hint={`${state.payments.length} invoices`} />
        <Stat label="Paid" value={inr(paid)} tone="green" hint="Received" />
        <Stat label="Pending" value={inr(pending)} tone="red" hint="Invoices with no payment yet" />
        <Stat label="Balance due" value={inr(balance)} tone="amber" hint="Remaining on part-paid invoices" />
      </div>

      <Card className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Collection progress</p>
        <div className="mt-2 flex h-4 overflow-hidden rounded-full bg-slate-100">
          <div className="bg-emerald-500" style={{ width: `${(paid / billed) * 100 || 0}%` }} title="Paid" />
          <div className="bg-amber-400" style={{ width: `${(balance / billed) * 100 || 0}%` }} title="Balance" />
          <div className="bg-rose-400" style={{ width: `${(pending / billed) * 100 || 0}%` }} title="Pending" />
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />Paid {Math.round((paid / billed) * 100 || 0)}%</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" />Balance {Math.round((balance / billed) * 100 || 0)}%</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-400" />Pending {Math.round((pending / billed) * 100 || 0)}%</span>
        </div>
      </Card>

      <div className="mb-3 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cx("rounded-full px-3 py-1 text-sm font-medium ring-1", filter === f ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-700 ring-slate-300")}>{f}</button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {list.map((p) => {
          const st = paymentStatus(p);
          const pct = Math.round((p.paid / p.total) * 100);
          return (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold"><DemoName name={p.patientName} /></p>
                  <p className="text-xs text-slate-500">
                    {state.orders.some((o) => o.id === p.orderId) ? <Link href={`/order/${p.orderId}`} className="hover:underline">{p.orderId}</Link> : p.orderId} · updated {fmtDateTime(p.updatedAt)}
                  </p>
                </div>
                <StatusBadge status={st} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-lg bg-slate-50 p-2"><p className="text-xs text-slate-500">Total</p><p className="font-bold">{inr(p.total)}</p></div>
                <div className="rounded-lg bg-emerald-50 p-2"><p className="text-xs text-emerald-700">Paid</p><p className="font-bold text-emerald-800">{inr(p.paid)}</p></div>
                <div className="rounded-lg bg-amber-50 p-2"><p className="text-xs text-amber-700">Balance</p><p className="font-bold text-amber-800">{inr(p.total - p.paid)}</p></div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
              <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                <Badge>{p.method}</Badge>
                {st !== "Paid" && editing !== p.id && (
                  <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => { setEditing(p.id); setAmount(String(Math.round((p.total - p.paid) * 100) / 100)); }}>+ Record payment</Button>
                )}
              </div>
              {editing === p.id && (
                <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-slate-50 p-3">
                  <label className="text-xs text-slate-600">Amount (₹)
                    <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 block w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                  </label>
                  <label className="text-xs text-slate-600">Method
                    <select value={method} onChange={(e) => setMethod(e.target.value as Payment["method"])} className="mt-1 block rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
                      <option>UPI</option><option>Cash</option><option>Card</option>
                    </select>
                  </label>
                  <Button className="py-1.5" onClick={() => save(p)}>Save (simulated)</Button>
                  <Button variant="secondary" className="py-1.5" onClick={() => setEditing(null)}>Cancel</Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
