"use client";

import { useState } from "react";
import { useDemo } from "@/lib/store";
import { STORE } from "@/lib/seed";
import { Button } from "./ui";

export function TalkToPharmacist({ patientName, phone, orderId, className, label = "🧑‍⚕️ Talk to pharmacist" }: {
  patientName?: string;
  phone?: string;
  orderId?: string;
  className?: string;
  label?: string;
}) {
  const { requestPharmacistCall } = useDemo();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [name, setName] = useState(patientName ?? "");
  const [ph, setPh] = useState(phone ?? "");

  const submit = () => {
    requestPharmacistCall(name.trim() || "Website visitor", ph.trim() || "Not provided", orderId);
    setDone(true);
  };

  return (
    <>
      <Button className={className} onClick={() => { setOpen(true); setDone(false); }}>{label}</Button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-slate-900/40 p-0 sm:place-items-center sm:p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Talk to pharmacist">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Demo only, sample data</p>
                <h2 className="text-lg font-bold">Talk to a pharmacist</h2>
              </div>
              <button className="rounded-lg px-2 text-xl text-slate-500 hover:bg-slate-100" onClick={() => setOpen(false)} aria-label="Close">×</button>
            </div>
            {done ? (
              <div className="space-y-3 text-sm">
                <p className="rounded-xl bg-emerald-50 p-3 text-emerald-800">
                  ✓ Call-back requested. {STORE.pharmacist} will call you within about 15 minutes (simulated). It now appears in CRM → Appointments and in the Follow-up timeline.
                </p>
                <Button variant="secondary" className="w-full" onClick={() => setOpen(false)}>Close</Button>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <p className="text-slate-600">Our pharmacist can answer questions about your order and medicines. In this demo no real call is placed.</p>
                <p className="rounded-xl bg-slate-50 p-3">Store line: <strong>{STORE.phone}</strong></p>
                {!patientName && (
                  <label className="block">
                    <span className="text-slate-600">Your name</span>
                    <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="e.g. Neha Kulkarni (demo)" />
                  </label>
                )}
                {!phone && (
                  <label className="block">
                    <span className="text-slate-600">Phone</span>
                    <input value={ph} onChange={(e) => setPh(e.target.value)} inputMode="tel" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="+91 90000 12345 (demo)" />
                  </label>
                )}
                <Button className="w-full" onClick={submit}>Request a call-back</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
