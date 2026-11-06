"use client";

import Link from "next/link";
import { useState } from "react";
import { useDemo } from "@/lib/store";
import { fmtDate, followUpState } from "@/lib/logic";
import type { FollowUpChannel } from "@/lib/types";
import { Badge, Card, DemoName, PageHeader, StatusBadge, cx } from "@/components/ui";

const CHANNEL: Record<FollowUpChannel, { icon: string; dot: string; tone: "green" | "blue" | "violet" }> = {
  WhatsApp: { icon: "💬", dot: "bg-emerald-500", tone: "green" },
  Email: { icon: "✉️", dot: "bg-sky-500", tone: "blue" },
  "Team call": { icon: "📞", dot: "bg-violet-500", tone: "violet" },
};

const FILTERS = ["All", "WhatsApp", "Email", "Team call"] as const;

export default function FollowUpsPage() {
  const { state, completeFollowUp } = useDemo();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const events = [...state.followUps]
    .filter((f) => filter === "All" || f.channel === filter)
    .sort((a, b) => b.at.localeCompare(a.at));

  const groups = events.reduce<Record<string, typeof events>>((acc, f) => {
    const key = new Date(f.at).toDateString();
    (acc[key] ||= []).push(f);
    return acc;
  }, {});

  const todayKey = new Date().toDateString();
  const label = (k: string) => {
    const d = new Date(k);
    const diff = Math.round((d.getTime() - new Date(todayKey).getTime()) / 86_400_000);
    return diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : diff === -1 ? "Yesterday" : fmtDate(d.toISOString());
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Step 9 · Staff" title="Follow-up timeline" subtitle="Simulated WhatsApp, email and team call reminders — nothing is actually sent." />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cx("rounded-full px-3 py-1 text-sm font-medium ring-1", filter === f ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-700 ring-slate-300")}>
            {f !== "All" && CHANNEL[f].icon} {f}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {Object.entries(groups).map(([k, list]) => (
          <section key={k}>
            <h2 className={cx("mb-2 text-sm font-bold", k === todayKey ? "text-brand-700" : "text-slate-500")}>{label(k)}</h2>
            <ol className="relative space-y-3 border-l-2 border-slate-200 pl-5">
              {list.map((f) => {
                const st = followUpState(f);
                const c = CHANNEL[f.channel];
                return (
                  <li key={f.id} className="relative">
                    <span className={cx("absolute -left-[27px] top-4 h-3 w-3 rounded-full ring-4 ring-[#f6f8f7]", c.dot)} />
                    <Card className={cx("p-3 sm:p-4", st === "Overdue" && "border-rose-300")}>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={c.tone}>{c.icon} {f.channel}</Badge>
                        {f.channel === "Team call" ? <Badge>👤 Team task (AI reminder)</Badge> : <Badge tone="violet">🤖 Auto-sent by AI</Badge>}
                        <span className="font-semibold">{f.title}</span>
                        <span className="ml-auto text-xs text-slate-500">{new Date(f.at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{f.detail}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <DemoName name={f.patientName} />
                        {f.orderId && state.orders.some((o) => o.id === f.orderId) && (
                          <Link href={`/order/${f.orderId}`} className="text-brand-700 hover:underline">{f.orderId}</Link>
                        )}
                        <span className="ml-auto flex items-center gap-2">
                          <StatusBadge status={st} />
                          {f.status === "Scheduled" && (
                            <button onClick={() => completeFollowUp(f.id)} className="rounded-lg border border-slate-300 px-2 py-0.5 font-semibold hover:bg-slate-50">Mark done</button>
                          )}
                        </span>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
