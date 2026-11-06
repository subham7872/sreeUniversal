"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { useDemo } from "@/lib/store";
import { cx } from "./ui";

type Info = { title: string; summary: string; does: string[]; human: string };

/** Plain-language explanation, for the pharmacy owner, of what the AI agent does on each page. */
const PAGES: { match: (p: string) => boolean; info: Info }[] = [
  {
    match: (p) => p === "/",
    info: {
      title: "Your AI agent runs the front desk 24×7",
      summary: "In short: the AI talks to customers day and night, takes orders and records everything in the CRM by itself.",
      does: ["Answers website visitors in Hindi & English, day and night", "Turns every enquiry into a CRM lead automatically", "Sends each order request to the pharmacist queue"],
      human: "Your pharmacist approves every order. The AI never gives medical advice.",
    },
  },
  {
    match: (p) => p.startsWith("/chat"),
    info: {
      title: "AI chat agent is handling this conversation",
      summary: "In short: the AI reads the prescription, drafts medicine, strength and quantity, and creates the lead, order and WhatsApp message itself.",
      does: ["Reads the uploaded prescription and drafts medicine, strength and quantity", "Creates the lead, the order request and a WhatsApp confirmation by itself", "Refuses dosing and medical questions, and hands over to the pharmacist"],
      human: "Nothing is final until a pharmacist approves it.",
    },
  },
  {
    match: (p) => p.startsWith("/voice"),
    info: {
      title: "AI voice agent answers calls in Hindi",
      summary: "In short: Shreya, the AI voice agent, talks to callers in Hindi, takes their name, number and order, and creates the order by herself.",
      does: ["Talks like a real receptionist in Hindi or English, with an Indian female voice", "Listens while she speaks and stops as soon as the caller interrupts", "Answers questions at any point (timings, delivery, price, stock), then continues the order", "Creates the lead and order request, then informs the pharmacist"],
      human: "No staff needed to pick up routine order calls. Medical questions go to the pharmacist.",
    },
  },
  {
    match: (p) => p.startsWith("/extraction"),
    info: {
      title: "AI read this prescription in seconds",
      summary: "In short: the AI read the prescription in seconds and made this draft. Lines it is less sure about are highlighted.",
      does: ["Extracts medicine name, strength and quantity only", "Scores its confidence and flags unclear lines for checking", "Keeps the patient informed that review is pending"],
      human: "The draft waits for pharmacist approval. No dosing is ever generated.",
    },
  },
  {
    match: (p) => p.startsWith("/pharmacist"),
    info: {
      title: "AI prepared this work. Your pharmacist decides.",
      summary: "In short: the AI has prepared the draft, stock and bill. The pharmacist only checks it and taps Approve, Edit or Reject.",
      does: ["Pre-fills the draft and checks stock and price for every item", "Calculates the order total automatically", "On approval: sends WhatsApp, creates the invoice and schedules follow-up calls"],
      human: "Approve, edit or reject is always a human decision.",
    },
  },
  {
    match: (p) => p.startsWith("/order"),
    info: {
      title: "AI keeps the patient updated automatically",
      summary: "In short: every order update, payment reminder and pharmacist hand-off is handled by the AI automatically.",
      does: ["Shows live order status, availability and total", "Sends status updates and payment reminders on its own", "Books a pharmacist call-back in one tap"],
      human: "Patients can always reach a real pharmacist.",
    },
  },
  {
    match: (p) => p.startsWith("/crm"),
    info: {
      title: "AI fills this CRM for you, with no manual data entry",
      summary: "In short: every chat, call and WhatsApp becomes a lead automatically, and statuses update by themselves when orders are approved.",
      does: ["Every chat, call and WhatsApp becomes a lead automatically", "Lead status changes to Converted when an order is approved", "Appointments and follow-ups are created by the agent"],
      human: "Your team just reviews and calls. The AI does the typing.",
    },
  },
  {
    match: (p) => p.startsWith("/payments"),
    info: {
      title: "AI tracks every rupee",
      summary: "In short: as soon as an order is approved, the AI creates the bill, sends reminders for dues and shows what is pending.",
      does: ["Creates the invoice the moment an order is approved", "Sends reminders for pending and balance amounts", "Shows paid, pending and balance at a glance"],
      human: "Staff only record cash or UPI received at the counter.",
    },
  },
  {
    match: (p) => p.startsWith("/followups"),
    info: {
      title: "AI schedules and sends follow-ups",
      summary: "In short: the AI sends WhatsApp and email updates itself, and only reminds the team about calls they need to make.",
      does: ["Sends WhatsApp and email updates by itself (simulated here)", "Creates call reminders for your team at the right time", "Sends refill reminders so patients come back"],
      human: "Team members mark calls done. Everything else is automatic.",
    },
  },
  {
    match: (p) => p.startsWith("/reports"),
    info: {
      title: "AI builds your reports live, with no Excel",
      summary: "In short: lead, order and follow-up reports update live, every moment, with no manual work.",
      does: ["Leads by source, order status and follow-ups due update instantly", "Highlights overdue follow-ups", "Ready to show any time, on mobile too"],
      human: "You see the whole business in one screen.",
    },
  },
];

export function AiAgentPanel() {
  const pathname = usePathname();
  const { state } = useDemo();
  const [open, setOpen] = useState(false);
  const info = PAGES.find((p) => p.match(pathname))?.info;
  if (!info) return null;

  const dayAgo = Date.now() - 24 * 3_600_000;
  const recent = (iso: string) => new Date(iso).getTime() >= dayAgo && new Date(iso).getTime() <= Date.now();
  const stats = [
    { label: "leads captured", value: state.leads.filter((l) => recent(l.createdAt)).length },
    { label: "orders drafted", value: state.orders.filter((o) => recent(o.createdAt)).length },
    { label: "messages sent", value: state.followUps.filter((f) => f.status === "Sent" && f.channel !== "Team call" && recent(f.at)).length },
    { label: "reminders set", value: state.followUps.filter((f) => f.status === "Scheduled").length },
  ];

  return (
    <section aria-label="What the AI agent does on this page" className="mb-6 overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-pink-50">
      <div className="flex items-start gap-3 p-3 sm:p-4">
        <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-600 text-xl text-white" aria-hidden>
          🤖
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-violet-700">AI agent at work · fully automatic</p>
          <h2 className="text-sm font-bold text-slate-900 sm:text-base">{info.title}</h2>
          <p className="mt-0.5 text-sm text-slate-700">{info.summary}</p>
          <div className={cx("mt-3 gap-3 md:grid md:grid-cols-[1fr_auto]", open ? "grid" : "hidden")}>
            <ul className="space-y-1 text-sm text-slate-700">
              {info.does.map((d) => (
                <li key={d} className="flex gap-2"><span className="text-violet-600">✦</span>{d}</li>
              ))}
              <li className="flex gap-2 font-medium text-emerald-800"><span>🛡</span>{info.human}</li>
            </ul>
            <div className="grid grid-cols-2 gap-2 self-start md:w-64">
              {stats.map((s) => (
                <div key={s.label} className="rounded-xl bg-white/80 p-2 text-center ring-1 ring-violet-100">
                  <p className="text-lg font-black text-violet-700">{s.value}</p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">{s.label}</p>
                </div>
              ))}
              <p className="col-span-2 text-center text-[10px] text-slate-400">AI activity, last 24 hrs (demo data)</p>
            </div>
          </div>
          <button onClick={() => setOpen((o) => !o)} className="mt-2 text-xs font-semibold text-violet-700 md:hidden">
            {open ? "Hide details ▲" : "What does the AI do here? ▼"}
          </button>
        </div>
      </div>
    </section>
  );
}
