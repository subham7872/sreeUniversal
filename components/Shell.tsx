"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useDemo } from "@/lib/store";
import { cx } from "./ui";
import { AiAgentPanel } from "./AiAgentPanel";

const NAV: { group: string; links: { href: string; label: string }[] }[] = [
  {
    group: "Patient",
    links: [
      { href: "/", label: "Home" },
      { href: "/chat", label: "Chatbot" },
      { href: "/voice", label: "Voice" },
    ],
  },
  {
    group: "Staff",
    links: [
      { href: "/pharmacist", label: "Pharmacist" },
      { href: "/crm", label: "CRM" },
      { href: "/payments", label: "Payments" },
      { href: "/followups", label: "Follow-ups" },
      { href: "/reports", label: "Reports" },
    ],
  },
];

export function DemoBanner() {
  return (
    <div role="note" className="bg-amber-400 px-4 py-1.5 text-center text-xs font-bold uppercase tracking-wide text-amber-950 sm:text-sm">
      ⚠ Demo only, sample data — fictional people, no real patients, no live services
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { ready, reset } = useDemo();
  const pathname = usePathname();
  const [toast, setToast] = useState<string | null>(null);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const onReset = () => {
    if (!window.confirm("Reset all demo data back to the original sample seed?")) return;
    reset();
    setToast("Demo data reset to seed");
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div className="min-h-dvh">
      <div className="sticky top-0 z-40">
        <DemoBanner />
        <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-lg font-black text-white">Sh</span>
              <span className="hidden leading-tight sm:block">
                <span className="block text-sm font-bold text-slate-900">Shree Universal</span>
                <span className="block text-[11px] text-slate-500">Pharmacy · sales demo</span>
              </span>
            </Link>
            <nav className="no-scrollbar -mx-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1" aria-label="Main">
              {NAV.map((g, gi) => (
                <div key={g.group} className="flex items-center gap-1">
                  {gi > 0 && <span className="mx-1 h-5 w-px shrink-0 bg-slate-200" aria-hidden />}
                  <span className="hidden shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400 lg:inline">{g.group}</span>
                  {g.links.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className={cx(
                        "shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-medium",
                        isActive(l.href) ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100",
                      )}
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
            <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-200 xl:inline-flex" title="All patient conversations, CRM entries and follow-ups are handled by the AI agent">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> AI agent active
            </span>
            <button
              onClick={onReset}
              className="shrink-0 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              title="Reset demo data to the original seed"
            >
              ↺ <span className="hidden sm:inline">Reset demo data</span><span className="sm:hidden">Reset</span>
            </button>
          </div>
        </header>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        {ready ? (
          <>
            <AiAgentPanel />
            {children}
          </>
        ) : (
          <p className="py-20 text-center text-sm text-slate-500">Loading demo data…</p>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5 text-xs text-slate-500">
          <p className="font-semibold text-slate-700">Demo only, sample data.</p>
          <p className="mt-1">
            This is a clickable sales prototype. All names, phone numbers, prescriptions and orders are fictional. AI extraction,
            WhatsApp, email and payments are simulated in the browser. Nothing is sent to any server. Not for clinical use.
          </p>
        </div>
      </footer>

      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>
      )}
    </div>
  );
}
