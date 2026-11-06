# Shree Universal Pharmacy: clickable sales demo

> **Demo only, sample data.** Every person, phone number, prescription, order and payment is fictional.
> No production services, no real patient data, no network calls. The "AI", WhatsApp, email and payments are all simulated in the browser.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000. State is saved in the browser's localStorage. Use **Reset demo data** in the header to go back to the seed.

## Demo flow (also listed on the home page)

| # | Page | Route |
|---|------|-------|
| 1 | Pharmacy landing page + order CTA | `/` |
| 2 | Chatbot with fake prescription upload | `/chat` |
| 3 | Simulated AI extraction draft ("Pending pharmacist review") | `/extraction/[id]` |
| 4 | Pharmacist approval: compare with the original, then approve, edit or reject | `/pharmacist`, `/pharmacist/[id]` |
| 5 | Patient order view: details, availability, total, status, Talk to pharmacist | `/order/[id]` |
| 6 | Voice assistant (Web Speech API + scripted simulation) | `/voice` |
| 7 | CRM: Leads, Appointments, Order Requests, Patient Records, Payments, Follow-ups | `/crm` |
| 8 | Payment tracking: paid, pending, balance | `/payments` |
| 9 | Follow-up timeline: WhatsApp, email, team call (simulated) | `/followups` |
| 10 | Reports: leads by source, order status, follow-ups due | `/reports` |

## Safety guardrails built in

- Extraction outputs only **medicine name, strength and quantity**. It never outputs dosing or guidance.
- Chatbot and voice assistant refuse dosing and medical questions (`lib/logic.ts` → `needsMedicalAdviceRefusal`).
- Text uploads must contain SAMPLE / FICTIONAL / DEMO. Image uploads require a "this is fictional" tick.
- Sample prescription: `public/sample-prescription-FICTIONAL.txt` / `.svg` (fictional doctor and patient).

## Code map

- `lib/seed.ts`: seed data (dates are relative to reset time)
- `lib/store.tsx`: client-side store with localStorage persistence and reset
- `lib/logic.ts`: simulated extraction, guardrail, pricing and availability helpers
- `components/Shell.tsx`: demo banner, navigation, reset button
