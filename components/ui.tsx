"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5", className)}>{children}</div>;
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">{eyebrow}</p>}
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const TONES = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-rose-50 text-rose-700 ring-rose-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ children, tone = "slate", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", TONES[tone], className)}>
      {children}
    </span>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  "Pending pharmacist review": "amber",
  Approved: "green",
  Rejected: "red",
  Packed: "blue",
  "Out for delivery": "violet",
  Delivered: "green",
  New: "blue",
  Contacted: "amber",
  Converted: "green",
  Lost: "slate",
  Scheduled: "blue",
  Completed: "green",
  Cancelled: "slate",
  Paid: "green",
  "Partially paid": "amber",
  Pending: "red",
  Sent: "green",
  Done: "slate",
  Overdue: "red",
  "Due soon": "amber",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "slate"}>{status}</Badge>;
}

/** Shows a person's name with a visible "demo" marker so nobody mistakes it for real data. */
export function DemoName({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{name}</span>
      <span className="rounded bg-amber-100 px-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800" title="Fictional sample person">
        demo
      </span>
    </span>
  );
}

type BtnProps = {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
};

export function Button({ children, onClick, href, variant = "primary", className, disabled, type = "button" }: BtnProps) {
  const cls = cx(
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    variant === "primary" && "bg-brand-600 text-white hover:bg-brand-700",
    variant === "secondary" && "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
    variant === "danger" && "bg-rose-600 text-white hover:bg-rose-700",
    variant === "ghost" && "text-brand-700 hover:bg-brand-50",
    className,
  );
  if (href && /\.[a-z]+$/i.test(href)) return <a href={href} target="_blank" rel="noopener" className={cls}>{children}</a>;
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button type={type} className={cls} onClick={onClick} disabled={disabled}>{children}</button>;
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: "green" | "amber" | "red" | "default" }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cx("mt-1 text-2xl font-bold",
        tone === "green" && "text-emerald-700",
        tone === "amber" && "text-amber-700",
        tone === "red" && "text-rose-700",
        (!tone || tone === "default") && "text-slate-900")}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}

export function SafetyNote({ children }: { children?: ReactNode }) {
  return (
    <div className="flex gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
      <span aria-hidden>ⓘ</span>
      <p>
        {children ?? "This assistant does not give medical advice, dosing information or treatment guidance. Every request is reviewed by a licensed pharmacist."}
      </p>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{children}</p>;
}
