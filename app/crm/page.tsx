"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useDemo } from "@/lib/store";
import { followUpState, fmtDateTime, inr, paymentStatus, timeAgo } from "@/lib/logic";
import type { Lead } from "@/lib/types";
import { Badge, Card, DemoName, Empty, PageHeader, Stat, StatusBadge, cx } from "@/components/ui";

const TABS = ["Leads", "Appointments", "Order Requests", "Patient Records", "Payments", "Follow-ups"] as const;
type Tab = (typeof TABS)[number];

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  if (rows.length === 0) return <Empty>No matching records.</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            {head.map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
              {r.map((c, j) => <td key={j} className="whitespace-nowrap px-3 py-2.5 align-middle">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CrmPage() {
  const { state, setLeadStatus, completeFollowUp } = useDemo();
  const [tab, setTab] = useState<Tab>("Leads");
  const [q, setQ] = useState("");

  const match = (...fields: (string | undefined)[]) => !q || fields.some((f) => f?.toLowerCase().includes(q.toLowerCase()));

  const counts: Record<Tab, number> = {
    Leads: state.leads.length,
    Appointments: state.appointments.length,
    "Order Requests": state.orders.length,
    "Patient Records": state.patients.length,
    Payments: state.payments.length,
    "Follow-ups": state.followUps.length,
  };

  const kpis = useMemo(() => {
    const newLeads = state.leads.filter((l) => l.status === "New").length;
    const pending = state.orders.filter((o) => o.status === "Pending pharmacist review").length;
    const due = state.followUps.filter((f) => ["Overdue", "Due soon"].includes(followUpState(f))).length;
    const outstanding = state.payments.reduce((s, p) => s + (p.total - p.paid), 0);
    return { newLeads, pending, due, outstanding };
  }, [state]);

  const ordersByPhone = (phone: string) => state.orders.filter((o) => o.phone === phone);

  let body: ReactNode;
  switch (tab) {
    case "Leads":
      body = (
        <Table
          head={["Name", "Phone", "Source", "Interest", "Created", "Status"]}
          rows={state.leads.filter((l) => match(l.name, l.phone, l.source, l.interest)).map((l) => [
            <DemoName key="n" name={l.name} />, l.phone, <Badge key="s" tone={l.source === "Walk-in" || l.source === "Referral" ? "slate" : "violet"} >{l.source === "Walk-in" || l.source === "Referral" ? "👤" : "🤖"} {l.source}</Badge>, l.interest, timeAgo(l.createdAt),
            <select key="st" aria-label={`Status for ${l.name}`} value={l.status} onChange={(e) => setLeadStatus(l.id, e.target.value as Lead["status"])} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs">
              {["New", "Contacted", "Converted", "Lost"].map((s) => <option key={s}>{s}</option>)}
            </select>,
          ])}
        />
      );
      break;
    case "Appointments":
      body = (
        <Table
          head={["Patient", "Type", "When", "Assigned to", "Status"]}
          rows={state.appointments.filter((a) => match(a.patientName, a.type, a.assignedTo)).sort((a, b) => a.at.localeCompare(b.at)).map((a) => [
            <DemoName key="n" name={a.patientName} />, a.type, fmtDateTime(a.at), a.assignedTo, <StatusBadge key="s" status={a.status} />,
          ])}
        />
      );
      break;
    case "Order Requests":
      body = (
        <Table
          head={["Order", "Patient", "Source", "Items", "Created", "Status", ""]}
          rows={state.orders.filter((o) => match(o.id, o.patientName, o.source, o.status)).map((o) => [
            <span key="id" className="font-semibold">{o.id}</span>, <DemoName key="n" name={o.patientName} />, o.source,
            (o.finalItems ?? o.draftItems).length, timeAgo(o.createdAt), <StatusBadge key="s" status={o.status} />,
            <Link key="l" href={o.status === "Pending pharmacist review" ? `/pharmacist/${o.id}` : `/order/${o.id}`} className="text-xs font-semibold text-brand-700 hover:underline">
              {o.status === "Pending pharmacist review" ? "Review →" : "Open →"}
            </Link>,
          ])}
        />
      );
      break;
    case "Patient Records":
      body = (
        <Table
          head={["Patient", "Phone", "City", "Preferred channel", "Orders", "Consent", "Since"]}
          rows={state.patients.filter((p) => match(p.name, p.phone, p.city)).map((p) => [
            <DemoName key="n" name={p.name} />, p.phone, p.city, p.preferredChannel, ordersByPhone(p.phone).length,
            <Badge key="c" tone={p.consent ? "green" : "slate"}>{p.consent ? "Recorded" : "Missing"}</Badge>, timeAgo(p.createdAt),
          ])}
        />
      );
      break;
    case "Payments":
      body = (
        <Table
          head={["Order", "Patient", "Total", "Paid", "Balance", "Method", "Status"]}
          rows={state.payments.filter((p) => match(p.orderId, p.patientName)).map((p) => [
            p.orderId, <DemoName key="n" name={p.patientName} />, inr(p.total), inr(p.paid), inr(p.total - p.paid), p.method, <StatusBadge key="s" status={paymentStatus(p)} />,
          ])}
        />
      );
      break;
    case "Follow-ups":
      body = (
        <Table
          head={["Channel", "Title", "Patient", "When", "State", ""]}
          rows={[...state.followUps].filter((f) => match(f.title, f.patientName, f.channel)).sort((a, b) => b.at.localeCompare(a.at)).map((f) => {
            const st = followUpState(f);
            return [
              <Badge key="c" tone={f.channel === "WhatsApp" ? "green" : f.channel === "Email" ? "blue" : "violet"}>{f.channel}</Badge>, f.title,
              <DemoName key="n" name={f.patientName} />, fmtDateTime(f.at), <StatusBadge key="s" status={st} />,
              f.status === "Scheduled" ? <button key="b" onClick={() => completeFollowUp(f.id)} className="text-xs font-semibold text-brand-700 hover:underline">Mark done</button> : null,
            ];
          })}
        />
      );
      break;
  }

  return (
    <div>
      <PageHeader eyebrow="Step 7 · Staff" title="CRM dashboard" subtitle="All records are fictional sample data stored in this browser." />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="New leads" value={kpis.newLeads} />
        <Stat label="Awaiting pharmacist" value={kpis.pending} tone={kpis.pending ? "amber" : "default"} />
        <Stat label="Follow-ups due" value={kpis.due} tone={kpis.due ? "red" : "default"} />
        <Stat label="Outstanding" value={inr(kpis.outstanding)} />
      </div>

      <Card className="p-0 sm:p-0">
        <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-slate-200 px-2 pt-2">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cx("shrink-0 rounded-t-lg border-b-2 px-3 py-2 text-sm font-semibold", tab === t ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800")}>
              {t} <span className="text-xs font-normal text-slate-400">{counts[t]}</span>
            </button>
          ))}
        </div>
        <div className="p-3 sm:p-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${tab.toLowerCase()}…`} className="mb-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm sm:max-w-xs" aria-label="Search" />
          {body}
        </div>
      </Card>
    </div>
  );
}
