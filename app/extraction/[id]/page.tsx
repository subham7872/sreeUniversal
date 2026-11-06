"use client";

import { useParams } from "next/navigation";
import { useDemo } from "@/lib/store";
import { fmtDateTime } from "@/lib/logic";
import { Badge, Button, Card, DemoName, Empty, PageHeader, SafetyNote, StatusBadge } from "@/components/ui";
import { TalkToPharmacist } from "@/components/TalkToPharmacist";

export default function ExtractionPage() {
  const { id } = useParams<{ id: string }>();
  const { state } = useDemo();
  const order = state.orders.find((o) => o.id === decodeURIComponent(id));

  if (!order) return <Empty>Order request not found. It may have been cleared by “Reset demo data”. <a className="text-brand-700 underline" href="/chat">Start a new one</a>.</Empty>;

  const pending = order.status === "Pending pharmacist review";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        eyebrow="Step 3 · Patient view"
        title="Draft extracted from your prescription"
        subtitle={<>Request <strong>{order.id}</strong> · {fmtDateTime(order.createdAt)}</>}
        actions={<StatusBadge status={order.status} />}
      />

      <div className="flex items-start gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
        <span className="text-2xl" aria-hidden>⏳</span>
        <div>
          <p className="font-bold text-amber-900">{pending ? "Pending pharmacist review" : `Pharmacist decision: ${order.status}`}</p>
          <p className="text-sm text-amber-900/80">
            This is an automatically generated <strong>draft</strong> (simulated AI). It is not a confirmed order and must be checked by a
            licensed pharmacist against your original file.
          </p>
        </div>
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">Extracted items</h2>
          <Badge tone="violet">Simulated AI · draft</Badge>
        </div>
        {order.draftItems.length === 0 ? (
          <Empty>No items could be matched automatically. The pharmacist will read your request: “{order.requestText}”.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">Medicine name</th>
                  <th className="py-2 pr-3">Strength</th>
                  <th className="py-2 pr-3 text-right">Quantity</th>
                  <th className="py-2 text-right">Read confidence</th>
                </tr>
              </thead>
              <tbody>
                {order.draftItems.map((it) => (
                  <tr key={it.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5 pr-3 font-medium">{it.name}</td>
                    <td className="py-2.5 pr-3">{it.strength}</td>
                    <td className="py-2.5 pr-3 text-right">{it.quantity}</td>
                    <td className="py-2.5 text-right">
                      {it.confidence !== undefined && (
                        <Badge tone={it.confidence >= 0.9 ? "green" : "amber"}>{Math.round(it.confidence * 100)}%</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Only medicine name, strength and quantity are extracted. No dosing instructions or medical guidance are generated.
        </p>
      </Card>

      <Card className="grid gap-3 text-sm sm:grid-cols-3">
        <div><p className="text-slate-500">Patient</p><p className="font-medium"><DemoName name={order.patientName} /></p></div>
        <div><p className="text-slate-500">Phone</p><p className="font-medium">{order.phone || "—"}</p></div>
        <div><p className="text-slate-500">Fulfilment</p><p className="font-medium">{order.deliveryMode}</p></div>
        <div className="sm:col-span-3"><p className="text-slate-500">Source file</p><p className="font-medium">{order.file?.name ?? (order.requestText ? `Typed/voice request: “${order.requestText}”` : "—")}</p></div>
      </Card>

      <SafetyNote />

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button href={`/order/${order.id}`} variant="secondary">Track order status</Button>
        <TalkToPharmacist patientName={order.patientName} phone={order.phone} orderId={order.id} />
        <Button href={`/pharmacist/${order.id}`} variant="ghost" className="sm:ml-auto">Presenter: open pharmacist view →</Button>
      </div>
    </div>
  );
}
