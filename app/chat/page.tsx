"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDemo } from "@/lib/store";
import { SAMPLE_PRESCRIPTION_TEXT, STORE } from "@/lib/seed";
import {
  cleanSpokenName,
  extractFromFreeText,
  extractFromText,
  needsMedicalAdviceRefusal,
  presetImageExtraction,
  REFUSAL_MESSAGE,
  REFUSAL_MESSAGE_HI,
  speechToDigits,
} from "@/lib/logic";
import type { OrderItem, OrderRequest, UploadedFile } from "@/lib/types";
import { Card, PageHeader, SafetyNote, cx } from "@/components/ui";
import { TalkToPharmacist } from "@/components/TalkToPharmacist";

type Msg = { from: "bot" | "user"; text: string; file?: UploadedFile; link?: { href: string; label: string }; tone?: "warn" };
type Step = "menu" | "upload" | "freeText" | "name" | "phone" | "delivery" | "processing" | "done";

const MAX_BYTES = 1_500_000;

const hasHindi = (t: string) => /[ऀ-ॿ]/.test(t);
const INTENT = {
  upload: /upload|prescription|\brx\b|parcha|parchi|पर्चा|पर्ची|प्रिस्क्रिप्शन|प्रिसक्रिप्शन/i,
  order: /type|order|medicine|dawa|dawai|chahiye|ऑर्डर|आर्डर|दवा|दवाई|चाहिए/i,
  timings: /timing|hour|open|close|address|location|kab khul|samay|समय|टाइम|खुल|पता|कहाँ|कहां/i,
  pharmacist: /pharmacist|human|person|talk|call me|फार्मासिस्ट|बात|कॉल/i,
  greet: /^(hi+|hello|hey|namaste|namaskar|नमस्ते|नमस्कार)([\s!,.]|$)/i,
  home: /home|deliver|ghar|घर|डिलीवरी|डिलिवरी/i,
  pickup: /pick ?up|store|shop|collect|khud|dukan|दुकान|स्टोर|पिकअप|आकर/i,
};

const QUICK: Record<Step, string[]> = {
  menu: ["📄 Upload prescription", "📝 Type my order", "🕘 Store timings", "🧪 Try a dosing question"],
  upload: [],
  freeText: ["Paracetamol 500 mg 10 tablets and ORS 5 sachets"],
  name: ["Neha Kulkarni"],
  phone: ["90000 10014"],
  delivery: ["Store pickup", "Home delivery"],
  processing: [],
  done: ["Start a new request"],
};

const PROMPTS: Partial<Record<Step, string>> = {
  menu: "How can I help you today?",
  upload: "Please upload a clearly FAKE typed sample prescription (.txt or image). Don't upload a real prescription in this demo — use the sample below.",
  freeText: "Type the medicine names, strength and quantity you need.",
  name: "Thanks! What name should we put on the order? (Use a demo name.)",
  phone: "And a 10-digit mobile number for order updates? (Use a demo number.)",
  delivery: "Would you like store pickup or home delivery?",
};

const PROMPTS_HI: Partial<Record<Step, string>> = {
  menu: "आज मैं आपकी क्या मदद कर सकती हूँ?",
  upload: "कृपया सिर्फ़ नकली (FAKE) टाइप किया हुआ सैंपल पर्चा अपलोड करें (.txt या इमेज)। इस डेमो में असली पर्चा अपलोड न करें — नीचे दिया सैंपल इस्तेमाल करें।",
  freeText: "दवा का नाम, स्ट्रेंथ और मात्रा लिखिए।",
  name: "धन्यवाद! ऑर्डर किस नाम से बनाऊँ? (डेमो नाम लिखें)",
  phone: "ऑर्डर अपडेट के लिए 10 अंकों का मोबाइल नंबर बताइए। (डेमो नंबर लिखें)",
  delivery: "आप दुकान से लेंगे या घर पर डिलीवरी चाहिए?",
};

const QUICK_HI: Record<Step, string[]> = {
  menu: ["📄 पर्चा अपलोड करें", "📝 दवा लिखकर ऑर्डर", "🕘 स्टोर का समय", "🧪 खुराक का सवाल पूछें"],
  upload: [],
  freeText: ["पैरासिटामोल 500 एमजी 10 गोली और ओआरएस 5 पैकेट"],
  name: ["नेहा कुलकर्णी"],
  phone: ["90000 10014"],
  delivery: ["दुकान से लूँगा", "घर पर डिलीवरी"],
  processing: [],
  done: ["नई रिक्वेस्ट"],
};

export default function ChatPage() {
  const router = useRouter();
  const { createOrderRequest } = useDemo();
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: "bot", text: `Namaste! 🙏 I'm Shreya, the AI assistant of ${STORE.name} (demo). Aap Hindi ya English mein likh sakte hain. I can take a medicine order request and pass it to our pharmacist. I can't give medical advice.` },
    { from: "bot", text: PROMPTS.menu! },
  ]);
  const [step, setStep] = useState<Step>("menu");
  const [input, setInput] = useState("");
  const [confirmFake, setConfirmFake] = useState(false);
  const [typing, setTyping] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  // Replies stay in English on screen (Hindi typed by customers is still understood). Flip setHindi(true) to re-enable Hindi replies.
  const [hindi, setHindiState] = useState(false);
  const hiRef = useRef(false);
  const setHindi = (v: boolean) => { hiRef.current = v; setHindiState(v); };
  /** Pick the English or Hindi version of a reply, following the customer's language. */
  const L = (en: string, hi: string) => (hiRef.current ? hi : en);
  const prompt = (s: Step) => (hiRef.current ? PROMPTS_HI : PROMPTS)[s];
  const draft = useRef<{ file?: UploadedFile; requestText?: string; items: OrderItem[]; name?: string; phone?: string }>({ items: [] });
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [msgs, typing]);

  const bot = (text: string, extra: Partial<Msg> = {}, delay = 450) =>
    new Promise<void>((res) => {
      setTyping(true);
      setTimeout(() => { setTyping(false); setMsgs((m) => [...m, { from: "bot", text, ...extra }]); res(); }, delay);
    });

  const goto = async (s: Step) => { setStep(s); const p = prompt(s); if (p) await bot(p); };

  const restart = () => {
    draft.current = { items: [] };
    setConfirmFake(false);
    void goto("menu");
  };

  /** Runs one user action at a time so double-clicks / fast typing can't break the flow. */
  const exclusive = async (fn: () => Promise<unknown>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try { await fn(); } finally { busyRef.current = false; setBusy(false); }
  };

  const handleText = (raw: string) => exclusive(() => respond(raw));

  const respond = async (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    setInput("");
    setMsgs((m) => [...m, { from: "user", text }]);

    if (needsMedicalAdviceRefusal(text) || text.startsWith("🧪")) {
      if (text.startsWith("🧪")) setMsgs((m) => [...m.slice(0, -1), { from: "user", text: L("How many tablets should I take, and can I take it with alcohol?", "मुझे कितनी गोली लेनी चाहिए? क्या शराब के साथ ले सकता हूँ?") }]);
      await bot(L(REFUSAL_MESSAGE, REFUSAL_MESSAGE_HI), { tone: "warn" });
      const p = prompt(step);
      if (p) await bot(p);
      return;
    }

    const itemList = (items: OrderItem[]) => items.map((i) => `${i.name} ${i.strength} × ${i.quantity}`).join(", ");

    switch (step) {
      case "menu":
      case "done":
      {
        if (/new request|नई रिक्वेस्ट/i.test(text)) return restart();
        if (INTENT.upload.test(text)) return goto("upload");
        // A message that already names medicines is treated as the order itself.
        const items = extractFromFreeText(text);
        if (items.length) {
          draft.current = { requestText: text, items };
          await bot(L(`Got it — I noted ${itemList(items)}. The pharmacist will confirm everything.`, `ठीक है — मैंने नोट किया: ${itemList(items)}। फार्मासिस्ट सब कुछ जाँच कर कन्फ़र्म करेंगे।`));
          return goto("name");
        }
        if (INTENT.timings.test(text)) {
          await bot(L(
            `We're open ${STORE.hours.map((h) => `${h.day}: ${h.time}`).join(" · ")}. Address: ${STORE.address}.`,
            `हमारा समय: सोम–शनि सुबह 8 से रात 10 बजे, रविवार सुबह 9 से दोपहर 2 बजे। पता: ${STORE.address}।`,
          ));
          return goto("menu");
        }
        if (INTENT.pharmacist.test(text)) {
          await bot(L("Sure — tap the “🧑‍⚕️ Pharmacist” button at the top of this chat and our pharmacist will call you back (simulated).", "ज़रूर — इस चैट के ऊपर “🧑‍⚕️ Pharmacist” बटन दबाइए, हमारे फार्मासिस्ट आपको कॉल करेंगे (डेमो)।"));
          return;
        }
        if (INTENT.order.test(text)) return goto("freeText");
        if (INTENT.greet.test(text)) return bot(L("Namaste! 🙏 How can I help? Choose an option below.", "नमस्ते! 🙏 मैं आपकी दवा का ऑर्डर लेने में मदद कर सकती हूँ। नीचे से कोई विकल्प चुनिए।"));
        await bot(L(
          "I can help with medicine order requests and store information only. Choose an option below, or just type the medicines you need.",
          "मैं सिर्फ़ दवा के ऑर्डर और स्टोर की जानकारी में मदद कर सकती हूँ। नीचे से कोई विकल्प चुनिए या दवा का नाम लिखिए।",
        ));
        return;
      }
      case "upload":
        await bot(L("Please use the upload button below, or tap “Use sample prescription”.", "कृपया नीचे अपलोड बटन दबाइए, या “Use sample prescription” चुनिए।"));
        return;
      case "freeText": {
        const items = extractFromFreeText(text);
        draft.current = { requestText: text, items };
        await bot(items.length
          ? L(`Got it — I noted ${itemList(items)}. The pharmacist will confirm everything.`, `ठीक है — मैंने नोट किया: ${itemList(items)}। फार्मासिस्ट सब कुछ जाँच कर कन्फ़र्म करेंगे।`)
          : L("Noted. I couldn't match the items automatically; the pharmacist will read your message.", "नोट कर लिया। दवा अपने-आप पहचान नहीं पाई, फार्मासिस्ट आपका मैसेज पढ़ लेंगे।"));
        return goto("name");
      }
      case "name": {
        const name = cleanSpokenName(text.replace(/\s*\(demo\)\s*$/i, ""));
        if (name.length < 2 || /\d/.test(name)) return bot(L("Please enter your name (letters only, at least 2).", "कृपया अपना नाम लिखिए (सिर्फ़ अक्षर)।"));
        draft.current.name = name;
        return goto("phone");
      }
      case "phone": {
        const digits = speechToDigits(text);
        if (digits.length !== 10) return bot(L("That doesn't look like a 10-digit mobile number. Please try again (demo number is fine).", "यह 10 अंकों का मोबाइल नंबर नहीं लग रहा। कृपया दोबारा लिखिए (डेमो नंबर चलेगा)।"));
        draft.current.phone = `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
        return goto("delivery");
      }
      case "delivery": {
        const home = INTENT.home.test(text);
        if (!home && !INTENT.pickup.test(text)) return bot(L("Please choose “Store pickup” or “Home delivery”.", "कृपया चुनिए: “दुकान से लूँगा” या “घर पर डिलीवरी”।"));
        const mode: OrderRequest["deliveryMode"] = home ? "Home delivery" : "Store pickup";
        setStep("processing");
        await bot(draft.current.file
          ? L("🔍 AI is reading the sample prescription…", "🔍 AI सैंपल पर्चा पढ़ रही है…")
          : L("🔍 AI is preparing your draft order…", "🔍 AI आपका ड्राफ्ट ऑर्डर तैयार कर रही है…"), {}, 300);
        await new Promise((r) => setTimeout(r, 1600));
        const d = draft.current;
        const id = createOrderRequest({
          patientName: d.name ?? "Website visitor",
          phone: d.phone ?? "",
          source: "Chatbot",
          deliveryMode: mode,
          draftItems: d.items,
          file: d.file,
          requestText: d.requestText,
        });
        setStep("done");
        await bot(L(
          `Your request ${id} is created and is now “Pending pharmacist review”. You'll see a draft below — nothing is final until the pharmacist approves it.`,
          `आपकी रिक्वेस्ट ${id} बन गई है और अभी “फार्मासिस्ट की जाँच बाकी” है। ड्राफ्ट अगले पेज पर दिखेगा — फार्मासिस्ट के Approve करने तक कुछ भी फ़ाइनल नहीं है।`,
        ), {
          link: { href: `/extraction/${id}`, label: L("View extracted draft →", "ड्राफ्ट देखें →") },
        });
        setTimeout(() => router.push(`/extraction/${id}`), 1400);
        return;
      }
    }
  };

  const acceptFile = (file: UploadedFile, items: OrderItem[]) => exclusive(async () => {
    if (step !== "upload") return;
    draft.current = { file, items };
    setMsgs((m) => [...m, { from: "user", text: `Uploaded: ${file.name}`, file }]);
    await bot(L("Thanks — file received. I'll extract a draft after a couple of details.", "धन्यवाद — फ़ाइल मिल गई। दो-तीन जानकारी के बाद मैं ड्राफ्ट तैयार कर दूँगी।"));
    await goto("name");
  });

  const onFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_BYTES) { void bot("That file is too large for the demo (max 1.5 MB).", { tone: "warn" }); return; }
    const reader = new FileReader();
    if (f.type.startsWith("text/") || f.name.endsWith(".txt")) {
      reader.onload = () => {
        const text = String(reader.result ?? "");
        if (!/SAMPLE|FICTIONAL|DEMO/i.test(text)) {
          void bot("For this demo, only the clearly fake typed sample prescription is accepted (it must say SAMPLE / FICTIONAL). Please don't upload real prescriptions.", { tone: "warn" });
          return;
        }
        const items = extractFromText(text);
        void acceptFile({ name: f.name, type: "text/plain", text }, items.length ? items : presetImageExtraction());
      };
      reader.readAsText(f);
    } else if (f.type.startsWith("image/")) {
      if (!confirmFake) { void bot("Please tick “This is a fictional sample, not a real prescription” before uploading an image.", { tone: "warn" }); return; }
      reader.onload = () => void acceptFile({ name: f.name, type: f.type, dataUrl: String(reader.result) }, presetImageExtraction());
      reader.readAsDataURL(f);
    } else {
      void bot("Please upload a .txt or image file.", { tone: "warn" });
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const useSample = () =>
    acceptFile({ name: "sample-prescription-FICTIONAL.txt", type: "text/plain", text: SAMPLE_PRESCRIPTION_TEXT }, extractFromText(SAMPLE_PRESCRIPTION_TEXT));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px] [&>*]:min-w-0">
      <div>
        <PageHeader eyebrow="Step 2 · Patient" title="Website chatbot" subtitle="AI chat agent — understands English, Hindi and Hinglish. Collects order requests only." />
        <Card className="flex h-[min(70dvh,640px)] flex-col p-0 sm:p-0">
          <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pink-100 text-lg" aria-hidden>👩🏽‍💼</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">Shreya · AI chat agent</p>
              <p className="flex items-center gap-1 text-xs text-slate-500"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Online 24×7 · no medical advice</p>
            </div>
            <TalkToPharmacist label="🧑‍⚕️ Pharmacist" className="px-2.5 py-1.5 text-xs" />
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-3 py-4 sm:px-4" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={cx("flex", m.from === "user" ? "justify-end" : "justify-start")}>
                <div className={cx(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
                  m.from === "user" ? "rounded-br-sm bg-brand-600 text-white" : "rounded-bl-sm bg-white text-slate-800 ring-1 ring-slate-200",
                  m.tone === "warn" && "bg-amber-50 text-amber-900 ring-amber-200",
                )}>
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {m.file?.dataUrl && <img src={m.file.dataUrl} alt="Uploaded fictional sample" className="mt-2 max-h-40 rounded-lg bg-white" />}
                  {m.file?.text && <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-white/90 p-2 text-[10px] leading-tight text-slate-700">{m.file.text}</pre>}
                  {m.link && <Link href={m.link.href} className="mt-2 inline-block font-semibold text-brand-700 underline">{m.link.label}</Link>}
                </div>
              </div>
            ))}
            {typing && (
              <div className="typing flex w-14 justify-center gap-1 rounded-2xl bg-white px-3 py-3 ring-1 ring-slate-200">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /><span className="h-1.5 w-1.5 rounded-full bg-slate-400" /><span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              </div>
            )}
            <div ref={endRef} />
          </div>

          {step === "upload" && (
            <div className="space-y-2 border-t border-slate-200 bg-white p-3">
              <div className="flex flex-wrap gap-2">
                <button onClick={useSample} disabled={busy} className="disabled:opacity-50rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700">Use sample prescription</button>
                <button onClick={() => fileRef.current?.click()} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">📎 Upload file</button>
                <input ref={fileRef} type="file" accept=".txt,text/plain,image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" checked={confirmFake} onChange={(e) => setConfirmFake(e.target.checked)} />
                This is a fictional sample, not a real prescription (required for images)
              </label>
              <p className="text-xs text-slate-500">
                Download the fake sample: <a className="text-brand-700 underline" href="/sample-prescription-FICTIONAL.txt" download>.txt</a> ·{" "}
                <a className="text-brand-700 underline" href="/sample-prescription-FICTIONAL.svg" download>image (.svg)</a>
              </p>
            </div>
          )}

          {(hindi ? QUICK_HI : QUICK)[step].length > 0 && (
            <div className="no-scrollbar flex gap-2 overflow-x-auto border-t border-slate-200 bg-white px-3 pt-3">
              {(hindi ? QUICK_HI : QUICK)[step].map((q) => (
                <button key={q} disabled={busy} onClick={() => handleText(q)} className="shrink-0 disabled:opacity-50 rounded-full border border-brand-500/40 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-800 hover:bg-brand-100">{q}</button>
              ))}
            </div>
          )}

          <form className="flex gap-2 bg-white p-3" onSubmit={(e) => { e.preventDefault(); void handleText(input); }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={step === "processing"}
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder={step === "processing" ? "Please wait…" : "Type in English or Hindi…"}
              aria-label="Message"
            />
            <button type="submit" disabled={step === "processing" || busy} className="rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50">Send</button>
          </form>
        </Card>
      </div>

      <aside className="space-y-4 lg:pt-[76px]">
        <SafetyNote />
        <Card>
          <h2 className="text-sm font-bold">Need a human?</h2>
          <p className="mt-1 text-sm text-slate-600">Questions about medicines go to our pharmacist.</p>
          <TalkToPharmacist className="mt-3 w-full" />
        </Card>
        <Card>
          <h2 className="text-sm font-bold">Fake sample prescription</h2>
          <a href="/sample-prescription-FICTIONAL.svg" target="_blank" rel="noopener">
            <img src="/sample-prescription-FICTIONAL.svg" alt="Typed fictional sample prescription" className="mt-2 w-full rounded-lg ring-1 ring-slate-200" />
          </a>
          <p className="mt-2 text-xs text-slate-500">Fictional doctor & patient. For demo upload only.</p>
        </Card>
      </aside>
    </div>
  );
}
