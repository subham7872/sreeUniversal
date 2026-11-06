"use client";

import Link from "next/link";
import { STORE } from "@/lib/seed";
import { Badge, Button, Card, SafetyNote } from "@/components/ui";

const FLOW = [
  { n: 1, href: "/", title: "Pharmacy landing page", who: "Patient" },
  { n: 2, href: "/chat", title: "Chatbot + prescription upload", who: "Patient" },
  { n: 3, href: "/extraction/ORD-1008", title: "Simulated AI extraction draft", who: "Patient", note: "opens after upload" },
  { n: 4, href: "/pharmacist", title: "Pharmacist approval screen", who: "Staff" },
  { n: 5, href: "/order/ORD-1005", title: "Patient order status", who: "Patient", note: "after approval" },
  { n: 6, href: "/voice", title: "Web voice assistant", who: "Patient" },
  { n: 7, href: "/crm", title: "CRM dashboard", who: "Staff" },
  { n: 8, href: "/payments", title: "Payment tracking", who: "Staff" },
  { n: 9, href: "/followups", title: "Follow-up timeline", who: "Staff" },
  { n: 10, href: "/reports", title: "Reports", who: "Staff" },
];

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 p-6 text-white sm:p-10">
        <Badge tone="amber" className="mb-4">Demo only, sample data</Badge>
        <h1 className="max-w-2xl text-3xl font-black leading-tight sm:text-5xl">{STORE.name}</h1>
        <p className="mt-3 max-w-xl text-base text-brand-100 sm:text-lg">{STORE.tagline}. Send your medicine order request online — a licensed pharmacist reviews every request before it is packed.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/chat" className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-base font-bold text-brand-800 shadow hover:bg-brand-50">
            📄 Request a medicine order
          </Link>
          <Link href="/voice" className="inline-flex items-center justify-center rounded-xl border border-white/40 px-5 py-3 text-base font-semibold text-white hover:bg-white/10">
            🎙 Order by voice
          </Link>
        </div>
        <p className="mt-4 text-xs text-brand-100/80">Upload a prescription → pharmacist reviews → pay & collect or get it delivered.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <h2 className="font-bold text-slate-900">Store details</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div><dt className="text-slate-500">Address</dt><dd>{STORE.address}</dd></div>
            <div><dt className="text-slate-500">Phone</dt><dd>{STORE.phone}</dd></div>
            <div><dt className="text-slate-500">Email</dt><dd>{STORE.email}</dd></div>
            <div><dt className="text-slate-500">Licence</dt><dd>{STORE.licence}</dd></div>
          </dl>
        </Card>
        <Card>
          <h2 className="font-bold text-slate-900">Opening hours</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {STORE.hours.map((h) => (
              <li key={h.day} className="flex justify-between gap-2 border-b border-slate-100 pb-2"><span>{h.day}</span><span className="font-medium">{h.time}</span></li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-slate-600">Pharmacist on duty: {STORE.pharmacist}</p>
        </Card>
        <Card>
          <h2 className="font-bold text-slate-900">Services</h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {STORE.services.map((s) => (
              <li key={s} className="flex gap-2"><span className="text-brand-600">✓</span>{s}</li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { icon: "📤", t: "1. Send request", d: "Upload a prescription in chat or speak to the voice assistant." },
          { icon: "🧑‍⚕️", t: "2. Pharmacist review", d: "A pharmacist checks the draft against your original file." },
          { icon: "📦", t: "3. Pay & receive", d: "See availability and total, then pick up or get delivery." },
        ].map((s) => (
          <Card key={s.t} className="flex gap-3">
            <span className="text-2xl" aria-hidden>{s.icon}</span>
            <div><h3 className="font-semibold">{s.t}</h3><p className="text-sm text-slate-600">{s.d}</p></div>
          </Card>
        ))}
      </section>

      <SafetyNote>
        Shree Universal&apos;s online assistants only collect order requests. They do not give medical advice, dosing information or
        treatment guidance. Please consult your doctor or speak with our pharmacist.
      </SafetyNote>

      <section>
        <Card className="border-dashed bg-slate-50">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-bold text-slate-900">Presenter guide — suggested demo flow</h2>
            <span className="text-xs text-slate-500">Use “Reset demo data” in the header to start fresh.</span>
          </div>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2">
            {FLOW.map((f) => (
              <li key={f.n}>
                <Link href={f.href} className="flex items-center gap-3 rounded-xl bg-white p-3 text-sm ring-1 ring-slate-200 hover:ring-brand-500">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">{f.n}</span>
                  <span className="flex-1 font-medium">{f.title}{f.note && <span className="font-normal text-slate-500"> — {f.note}</span>}</span>
                  <Badge tone={f.who === "Staff" ? "violet" : "blue"}>{f.who}</Badge>
                </Link>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button href="/chat">Start the demo flow →</Button>
            <Button variant="secondary" href="/sample-prescription-FICTIONAL.svg">View fake sample prescription</Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
