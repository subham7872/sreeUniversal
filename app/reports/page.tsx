"use client";

import { useDemo } from "@/lib/store";
import { followUpState, fmtDateTime } from "@/lib/logic";
import type { LeadSource, OrderStatus } from "@/lib/types";
import { Badge, Card, DemoName, Empty, PageHeader, Stat, StatusBadge } from "@/components/ui";

const SOURCES: LeadSource[] = ["Website", "Chatbot", "Voice Assistant", "WhatsApp", "Walk-in", "Referral"];
const STATUSES: OrderStatus[] = ["Pending pharmacist review", "Approved", "Packed", "Out for delivery", "Delivered", "Rejected"];
const STATUS_COLOR: Record<OrderStatus, string> = {
  "Pending pharmacist review": "#f59e0b",
  Approved: "#10a37f",
  Packed: "#0ea5e9",
  "Out for delivery": "#8b5cf6",
  Delivered: "#047857",
  Rejected: "#e11d48",
};

function Bars({ data, color = "#0b8a6b" }: { data: { label: string; value: number; color?: string }[]; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label} className="grid grid-cols-[minmax(0,130px)_1fr_28px] items-center gap-3 text-sm">
          <span className="truncate text-slate-600" title={d.label}>{d.label}</span>
          <span className="block h-5 min-w-0 overflow-hidden rounded-md bg-slate-100">
            <span className="block h-full rounded-md transition-all" style={{ width: `${(d.value / max) * 100}%`, background: d.color ?? color }} />
          </span>
          <span className="text-right font-semibold tabular-nums">{d.value}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ReportsPage() {
  const { state } = useDemo();

  const bySource = SOURCES.map((s) => ({ label: s, value: state.leads.filter((l) => l.source === s).length })).sort((a, b) => b.value - a.value);
  const byStatus = STATUSES.map((s) => ({ label: s === "Pending pharmacist review" ? "Pending review" : s, value: state.orders.filter((o) => o.status === s).length, color: STATUS_COLOR[s] }));
  const due = state.followUps
    .map((f) => ({ f, st: followUpState(f) }))
    .filter(({ st }) => st === "Overdue" || st === "Due soon" || st === "Scheduled")
    .sort((a, b) => a.f.at.localeCompare(b.f.at));
  const overdue = due.filter((d) => d.st === "Overdue").length;
  const dueSoon = due.filter((d) => d.st === "Due soon").length;
  const converted = state.leads.filter((l) => l.status === "Converted").length;

  // Donut for order status
  const totalOrders = state.orders.length || 1;
  let acc = 0;
  const stops = byStatus.map((s) => {
    const start = (acc / totalOrders) * 100;
    acc += s.value;
    return `${s.color} ${start}% ${(acc / totalOrders) * 100}%`;
  }).join(", ");

  return (
    <div>
      <PageHeader eyebrow="Step 10 · Staff" title="Reports" subtitle={`Live from demo data · generated ${fmtDateTime(new Date().toISOString())}`} />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total leads" value={state.leads.length} hint={`${Math.round((converted / Math.max(1, state.leads.length)) * 100)}% converted`} />
        <Stat label="Order requests" value={state.orders.length} />
        <Stat label="Follow-ups overdue" value={overdue} tone={overdue ? "red" : "default"} />
        <Stat label="Due in next 6 hrs" value={dueSoon} tone={dueSoon ? "amber" : "default"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <h2 className="mb-4 font-bold">Leads by source</h2>
          <Bars data={bySource} />
        </Card>

        <Card>
          <h2 className="mb-4 font-bold">Order status</h2>
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <div className="relative h-36 w-36 shrink-0 rounded-full" style={{ background: `conic-gradient(${stops})` }} role="img" aria-label="Order status breakdown">
              <div className="absolute inset-5 grid place-items-center rounded-full bg-white text-center">
                <span><span className="block text-2xl font-black">{state.orders.length}</span><span className="text-xs text-slate-500">orders</span></span>
              </div>
            </div>
            <div className="w-full"><Bars data={byStatus} /></div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold">Follow-ups due</h2>
            <div className="flex gap-2"><Badge tone="red">{overdue} overdue</Badge><Badge tone="amber">{dueSoon} due soon</Badge></div>
          </div>
          {due.length === 0 ? <Empty>All follow-ups are complete.</Empty> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">When</th><th className="px-3 py-2">Channel</th><th className="px-3 py-2">Task</th><th className="px-3 py-2">Patient</th><th className="px-3 py-2">State</th>
                  </tr>
                </thead>
                <tbody>
                  {due.map(({ f, st }) => (
                    <tr key={f.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2 whitespace-nowrap">{fmtDateTime(f.at)}</td>
                      <td className="px-3 py-2">{f.channel}</td>
                      <td className="px-3 py-2">{f.title}</td>
                      <td className="px-3 py-2"><DemoName name={f.patientName} /></td>
                      <td className="px-3 py-2"><StatusBadge status={st} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
