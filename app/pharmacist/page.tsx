"use client";

import Link from "next/link";
import { useState } from "react";
import { useDemo } from "@/lib/store";
import { timeAgo } from "@/lib/logic";
import { Badge, Card, DemoName, Empty, PageHeader, StatusBadge, cx } from "@/components/ui";

const TABS = ["Pending", "Reviewed"] as const;

export default function PharmacistQueue() {
  const { state } = useDemo();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Pending");
  const pending = state.orders.filter((o) => o.status === "Pending pharmacist review");
  const reviewed = state.orders.filter((o) => o.status !== "Pending pharmacist review");
  const list = tab === "Pending" ? pending : reviewed;

  return (
    <div>
      <PageHeader eyebrow="Step 4 · Staff" title="Pharmacist review queue" subtitle="Compare each AI draft with the original file, then approve, edit or reject." />
      <div className="mb-4 inline-flex rounded-xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cx("rounded-lg px-4 py-1.5 text-sm font-semibold", tab === t ? "bg-white shadow" : "text-slate-600")}>
            {t} <span className="ml-1 text-xs text-slate-500">({t === "Pending" ? pending.length : reviewed.length})</span>
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <Empty>No requests here. Create one from the <Link className="text-brand-700 underline" href="/chat">chatbot</Link> or <Link className="text-brand-700 underline" href="/voice">voice assistant</Link>.</Empty>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((o) => (
            <Link key={o.id} href={`/pharmacist/${o.id}`}>
              <Card className="h-full transition hover:ring-2 hover:ring-brand-500">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{o.id}</p>
                    <p className="text-sm"><DemoName name={o.patientName} /></p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {o.draftItems.length} item(s): {o.draftItems.map((i) => i.name).join(", ") || "free-text request"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Badge tone="blue">{o.source}</Badge>
                  <Badge>{o.file ? "📎 file attached" : "no file"}</Badge>
                  <Badge>{o.deliveryMode}</Badge>
                  <span className="ml-auto text-slate-500">{timeAgo(o.createdAt)}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
