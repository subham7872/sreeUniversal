"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useDemo } from "@/lib/store";
import { normalizeSpeech } from "@/lib/logic";
import { devanagariToRoman } from "@/lib/translit";
import {
  INTRO,
  NO_ONE,
  STILL_THERE,
  SCRIPT,
  newCall,
  orderPlaced,
  question,
  respond,
  toEnglishLetters,
  type CallState,
  type Lang,
  type Msg,
} from "@/lib/voiceAgent";
import { Badge, Button, Card, PageHeader, SafetyNote, cx } from "@/components/ui";

type Line = { kind: "agent" | "caller" | "note"; text: string; tone?: "warn" };

// Minimal typing for the (non-standard) Web Speech recognition API.
type RecResult = { isFinal: boolean; 0: { transcript: string } };
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: { resultIndex: number; results: ArrayLike<RecResult> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};
type RecognitionCtor = new () => Recognition;

const FEMALE = /swara|kalpana|heera|neerja|ananya|aditi|lekha|kajal|veena|priya|shruti|female|woman|google/i;
const MALE = /madhur|hemant|ravi|prabhat|kunal|aarav|\bmale\b|\bman\b/i;
const SILENCE_MS = 9000;

/** Ranks voices so a natural-sounding Indian female voice comes first. */
function rankVoices(all: SpeechSynthesisVoice[], lang: Lang) {
  const want = lang === "hi" ? /^hi([-_]|$)/i : /^en[-_]IN/i;
  const score = (v: SpeechSynthesisVoice) =>
    (FEMALE.test(v.name) ? 4 : 0) + (MALE.test(v.name) ? -6 : 0) + (/natural|online|neural/i.test(v.name) ? 2 : 0);
  return all.filter((v) => want.test(v.lang)).sort((a, b) => score(b) - score(a));
}

const storage = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const words = (t: string) => normalizeSpeech(t).replace(/[^\p{L}\p{M}0-9 ]/gu, " ").split(/\s+/).filter(Boolean);

const ASK_ANYTIME = [
  "When do you close today?",
  "Where is your shop?",
  "Is home delivery free?",
  "Do you have paracetamol?",
  "How much is cetirizine?",
  "Can I talk to the pharmacist?",
];

export default function VoicePage() {
  const { state: demo, createOrderRequest, requestPharmacistCall } = useDemo();

  const [lang, setLangState] = useState<Lang>("hi");
  const [active, setActive] = useState(false);
  const [ended, setEnded] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [voiceOut, setVoiceOut] = useState(true);
  const [bargeIn, setBargeIn] = useState(true);
  const [micBlocked, setMicBlocked] = useState(false);
  const [supported, setSupported] = useState({ stt: false, tts: false });
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState("");
  const [typed, setTyped] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [call, setCall] = useState<CallState>(newCall());
  const [orderId, setOrderId] = useState<string | null>(null);

  // Live values for speech callbacks and timers (they outlive a single render).
  const r = useRef({
    lang: "hi" as Lang, active: false, simulating: false, micOn: true, micBlocked: false, voiceOut: true, bargeIn: true,
    stt: false, voice: null as SpeechSynthesisVoice | null, roman: false,
    call: newCall(), speakToken: 0, turn: 0, agentSpeaking: false, lastAgentSpoken: "", lastAgentEnd: 0,
    silenceTimer: undefined as ReturnType<typeof setTimeout> | undefined, silenceCount: 0,
  });
  const recRef = useRef<Recognition | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inventoryRef = useRef(demo.inventory);
  inventoryRef.current = demo.inventory;
  Object.assign(r.current, { voiceOut, bargeIn });

  // Hindi needs a Hindi voice. If the browser has none, speak the Hindi in English letters with an Indian-English female voice.
  const hindiVoices = rankVoices(voices, "hi");
  const roman = lang === "hi" && hindiVoices.length === 0;
  const ranked = lang === "hi" && !roman ? hindiVoices : rankVoices(voices, "en");
  const voice = ranked.find((v) => v.name === voiceName) ?? ranked[0] ?? null;
  r.current.voice = voice;
  r.current.roman = roman;

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
    const stt = !!(w.SpeechRecognition || w.webkitSpeechRecognition);
    r.current.stt = stt;
    setSupported({ stt, tts: "speechSynthesis" in window });
    const savedLang = storage.get("voice-lang");
    if (savedLang === "en" || savedLang === "hi") { setLangState(savedLang); r.current.lang = savedLang; }
    setVoiceName(storage.get("voice-name") ?? "");
    if (!("speechSynthesis" in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    const ref = r.current;
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      ref.active = false;
      ref.speakToken++;
      clearTimeout(ref.silenceTimer);
      recRef.current?.abort();
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }); }, [lines, interim]);

  const setLang = (l: Lang) => { setLangState(l); r.current.lang = l; storage.set("voice-lang", l); };
  const addLine = (l: Line) => setLines((xs) => [...xs, l]);
  const updateCall = (c: CallState) => { r.current.call = c; setCall(c); };

  /* ---------------- Speaking ---------------- */

  const speakOne = (text: string, token: number) =>
    new Promise<void>((resolve) => {
      if (token !== r.current.speakToken) return resolve();
      const u = new SpeechSynthesisUtterance(r.current.roman ? devanagariToRoman(text) : text);
      const v = r.current.voice;
      if (v) u.voice = v;
      u.lang = v?.lang ?? (r.current.lang === "hi" ? "hi-IN" : "en-IN");
      u.rate = r.current.lang === "hi" ? 0.95 : 1;
      u.pitch = 1.1;
      let finished = false;
      let started = false;
      let poll: ReturnType<typeof setInterval> | undefined;
      const done = () => { if (!finished) { finished = true; clearInterval(poll); resolve(); } };
      u.onstart = () => { started = true; };
      u.onend = done;
      u.onerror = done;
      window.speechSynthesis.speak(u);
      // Chrome's Google voices sometimes never fire "end": also finish when the engine goes quiet, or when interrupted.
      const t0 = Date.now();
      poll = setInterval(() => {
        if (token !== r.current.speakToken) return done();
        const quiet = !window.speechSynthesis.speaking && !window.speechSynthesis.pending;
        if (quiet && (started || Date.now() - t0 > 1500)) done();
      }, 200);
      setTimeout(done, text.length * 120 + 4000);
    });

  /** Speaks a few short sentences. Returns false if the caller interrupted. */
  const say = async (msgs: Msg[], tone?: "warn") => {
    const token = r.current.speakToken;
    const spoken = (m: Msg) => (r.current.lang === "hi" ? m.hi : m.en);
    r.current.agentSpeaking = true;
    r.current.lastAgentSpoken = msgs.map(spoken).join(" ");
    setSpeaking(true);
    for (const m of msgs) {
      if (token !== r.current.speakToken) break;
      addLine({ kind: "agent", text: m.en, tone });
      if (r.current.voiceOut && "speechSynthesis" in window) {
        for (const chunk of spoken(m).split(/(?<=[।.!?])\s+/).filter(Boolean)) {
          if (token !== r.current.speakToken) break;
          await speakOne(chunk, token);
        }
      } else {
        await wait(500 + m.en.length * 15);
      }
    }
    if (token !== r.current.speakToken) return false;
    r.current.agentSpeaking = false;
    r.current.lastAgentEnd = Date.now();
    setSpeaking(false);
    return true;
  };

  /** Caller started talking: Shreya stops immediately and listens. */
  const interruptAgent = () => {
    if (!r.current.agentSpeaking) return;
    r.current.speakToken++;
    r.current.agentSpeaking = false;
    r.current.lastAgentEnd = Date.now();
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    addLine({ kind: "note", text: "Caller interrupted, so Shreya stopped talking to listen" });
  };

  /** Ignore the microphone hearing Shreya's own voice from the speakers. */
  const isEcho = (heard: string) => {
    const w = words(heard);
    if (!w.length) return true;
    const agent = new Set(words(r.current.lastAgentSpoken));
    return w.filter((x) => agent.has(x)).length / w.length >= 0.5;
  };

  /* ---------------- Silence handling ---------------- */

  const clearSilence = () => clearTimeout(r.current.silenceTimer);
  const armSilence = () => {
    clearSilence();
    const c = r.current;
    if (!c.active || c.simulating || !c.stt || c.micBlocked || !c.micOn) return;
    c.silenceTimer = setTimeout(async () => {
      if (!c.active || c.agentSpeaking) return;
      c.silenceCount++;
      const my = ++c.turn;
      if (c.silenceCount <= 2) {
        const ok = await say([STILL_THERE, question(c.call.step)]);
        if (ok && my === c.turn) armSilence();
      } else {
        await say([NO_ONE]);
        if (my === c.turn) endCall();
      }
    }, SILENCE_MS);
  };

  /* ---------------- Microphone (stays on for the whole call) ---------------- */

  const startMic = () => {
    const c = r.current;
    const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor || !c.active || c.simulating || c.micBlocked || !c.micOn) return;
    recRef.current?.abort();
    const rec = new Ctor();
    rec.lang = c.lang === "hi" ? "hi-IN" : "en-IN";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const heard = res[0].transcript.trim();
        if (!heard) continue;
        const agentRecent = c.agentSpeaking || Date.now() - c.lastAgentEnd < 1200;
        if (agentRecent && isEcho(heard)) continue;
        if (c.agentSpeaking) {
          if (!c.bargeIn) continue; // interruptions switched off: ignore while Shreya talks
          if (!res.isFinal && words(heard).length < 2) continue; // wait for a real word or two, not a cough
        }
        clearSilence();
        c.silenceCount = 0;
        if (res.isFinal) {
          setInterim("");
          void runTurn(heard);
        } else {
          setInterim(toEnglishLetters(heard));
          interruptAgent();
        }
      }
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        c.micBlocked = true;
        setMicBlocked(true);
        addLine({ kind: "note", tone: "warn", text: "Microphone access is blocked. Allow the mic for this site, or type the caller's answers below." });
      } else if (e.error === "network") {
        addLine({ kind: "note", tone: "warn", text: "Speech recognition needs an internet connection. You can type the caller's answers below." });
      }
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
      // Chrome ends recognition after a pause; keep it running for the whole call.
      if (recRef.current === rec && c.active && c.micOn && !c.micBlocked && !c.simulating) setTimeout(startMic, 150);
    };
    recRef.current = rec;
    try { rec.start(); setListening(true); } catch { setListening(false); }
  };

  const stopMic = () => {
    const rec = recRef.current;
    recRef.current = null;
    rec?.abort();
    setListening(false);
    setInterim("");
  };

  /* ---------------- Conversation ---------------- */

  const runTurn = async (text: string) => {
    const c = r.current;
    if (!c.active || !text.trim()) return;
    const my = ++c.turn;
    clearSilence();
    interruptAgent();
    addLine({ kind: "caller", text: toEnglishLetters(text.trim()) });

    const res = respond(c.call, text, inventoryRef.current);
    updateCall(res.state);
    let msgs = res.msgs;
    if (res.effect === "createOrder") {
      const s = res.state;
      const id = createOrderRequest({
        patientName: s.name ?? "Voice caller",
        phone: s.phone ?? "",
        source: "Voice Assistant",
        deliveryMode: s.delivery ?? "Home delivery",
        requestText: s.requestText,
        draftItems: s.items,
      });
      setOrderId(id);
      msgs = orderPlaced(id);
    }
    if (res.effect === "callback") requestPharmacistCall(res.state.name ?? "Voice caller", res.state.phone ?? "Not provided");

    const finished = await say(msgs, msgs[0]?.en.startsWith("I'm sorry, I can't advise") ? "warn" : undefined);
    if (my !== c.turn) return; // caller spoke again; a newer turn is in charge
    if (res.end) return endCall();
    if (finished) armSilence();
  };

  const startCall = async () => {
    const c = r.current;
    c.speakToken++;
    window.speechSynthesis?.cancel();
    stopMic();
    clearSilence();
    Object.assign(c, { active: true, turn: c.turn + 1, silenceCount: 0, micBlocked: false, agentSpeaking: false });
    setMicBlocked(false);
    updateCall(newCall());
    setLines([]);
    setOrderId(null);
    setEnded(false);
    setActive(true);
    const my = c.turn;
    startMic(); // listening from the start, so the caller can interrupt the greeting too
    const ok = await say(INTRO);
    if (ok && my === c.turn) armSilence();
  };

  function endCall() {
    const c = r.current;
    c.active = false;
    c.speakToken++;
    c.agentSpeaking = false;
    clearSilence();
    stopMic();
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setActive(false);
    setEnded(true);
    setSimulating(false);
    c.simulating = false;
  }

  const simulate = async () => {
    const c = r.current;
    c.simulating = true;
    setSimulating(true);
    let pending: Promise<unknown> = startCall();
    for (const line of SCRIPT[c.lang]) {
      if (line.interruptAfterMs) await wait(line.interruptAfterMs); // caller talks over Shreya
      else { await pending; await wait(900); }
      if (!c.active || !c.simulating) return;
      pending = runTurn(line.text);
    }
    await pending;
  };

  const toggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    r.current.micOn = next;
    if (next) { startMic(); armSilence(); } else { stopMic(); clearSilence(); }
  };

  const status = !active
    ? ended ? "Call ended" : "Press Start call, or run the scripted demo"
    : speaking ? (bargeIn && listening ? "Shreya is speaking. The caller can interrupt anytime" : "Shreya is speaking")
    : listening ? "Listening… the caller can speak now"
    : !supported.stt || micBlocked || !micOn ? "Mic is off, so type the caller's answer below"
    : "Waiting…";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px] [&>*]:min-w-0">
      <div>
        <PageHeader
          eyebrow="Step 6 · Patient"
          title="AI voice agent"
          subtitle="Shreya talks with callers like a real receptionist. She speaks, pauses to listen, stops if interrupted, and answers questions at any point."
          actions={
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Spoken language</span>
              <div className="inline-flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Spoken language">
                {(["hi", "en"] as const).map((l) => (
                  <button key={l} disabled={active} onClick={() => setLang(l)}
                    className={cx("rounded-lg px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed", lang === l ? "bg-white shadow" : "text-slate-600")}>
                    {l === "hi" ? "Hindi" : "English"}
                  </button>
                ))}
              </div>
            </div>
          }
        />

        <Card className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-pink-100 text-2xl" aria-hidden>👩🏽‍💼</span>
            <div className="text-left">
              <p className="font-bold">Shreya · AI voice agent</p>
              <p className="text-xs text-slate-500">Shree Universal Pharmacy · demo · speaks {lang === "hi" ? "Hindi" : "English"}</p>
            </div>
          </div>

          <button
            onClick={toggleMic}
            disabled={!active || !supported.stt || micBlocked || simulating}
            className={cx(
              "relative grid h-28 w-28 place-items-center rounded-full text-4xl text-white shadow-lg transition",
              speaking ? "pulse-ring bg-pink-500" : listening ? "pulse-ring bg-rose-500" : "bg-brand-600",
              (!active || !micOn) && "opacity-60",
            )}
            aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
            title={micOn ? "Mute microphone" : "Unmute microphone"}
          >
            {speaking ? "🔊" : listening ? "🎙" : micOn ? "🎙" : "🔇"}
          </button>
          <p className="min-h-5 text-sm font-medium text-slate-700" aria-live="polite">{status}</p>

          <div className="flex flex-wrap justify-center gap-2">
            {active ? (
              <Button variant="danger" onClick={endCall}>📵 End call</Button>
            ) : (
              <Button onClick={() => void startCall()}>{ended ? "↺ New call" : "📞 Start call"}</Button>
            )}
            <Button variant="secondary" onClick={() => void simulate()} disabled={active}>▶ Run scripted demo</Button>
          </div>

          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-slate-600">
            <label className="flex items-center gap-2"><input type="checkbox" checked={voiceOut} onChange={(e) => setVoiceOut(e.target.checked)} /> Speak out loud</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={bargeIn} onChange={(e) => setBargeIn(e.target.checked)} /> Caller can interrupt</label>
          </div>

          {supported.tts && (
            <label className="flex w-full max-w-sm flex-col gap-1 text-left text-xs text-slate-500">
              Voice
              <select
                value={voice?.name ?? ""}
                onChange={(e) => { setVoiceName(e.target.value); storage.set("voice-name", e.target.value); }}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800"
              >
                {ranked.length === 0 && <option value="">Browser default voice</option>}
                {ranked.map((v) => <option key={v.name} value={v.name}>{toEnglishLetters(v.name.replace(/हिन्दी|हिंदी/, "Hindi"))} ({v.lang}){FEMALE.test(v.name) && !MALE.test(v.name) ? " ♀" : ""}</option>)}
              </select>
              <button
                type="button"
                disabled={speaking || active}
                onClick={() => { r.current.speakToken++; void say([INTRO[0]]).then(() => setLines([])); }}
                className="self-start rounded-lg px-1 py-0.5 text-xs font-semibold text-brand-700 hover:underline disabled:opacity-40"
              >
                🔈 Test voice
              </button>
            </label>
          )}
          {supported.tts && voices.length > 0 && roman && (
            <p className="max-w-sm rounded-lg bg-amber-50 p-2 text-left text-xs text-amber-900">
              This browser has no Hindi voice, so Shreya speaks Hindi through an Indian-English female voice. For the natural Hindi female voice,
              open this page in <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong>.
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-2 text-xs">
            <Badge tone={supported.stt && !micBlocked ? "green" : "slate"}>Speech recognition: {micBlocked ? "mic blocked" : supported.stt ? "ready" : "not supported, type instead"}</Badge>
            <Badge tone={supported.tts ? "green" : "slate"}>Voice output: {supported.tts ? "ready" : "not supported"}</Badge>
          </div>
          <p className="text-xs text-slate-500">Tip: use headphones or a headset so Shreya doesn&apos;t hear her own voice through the speakers.</p>
        </Card>

        <Card className="mt-4 p-0 sm:p-0">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Live transcript</span>
            <span>{lang === "hi" ? "Spoken in Hindi, shown in English" : "English"}</span>
          </div>
          <div ref={logRef} className="max-h-[400px] space-y-2 overflow-y-auto p-4" aria-live="polite">
            {lines.length === 0 && <p className="text-center text-sm text-slate-400">The conversation will appear here.</p>}
            {lines.map((l, i) =>
              l.kind === "note" ? (
                <p key={i} className={cx("text-center text-xs italic", l.tone === "warn" ? "text-amber-700" : "text-slate-500")}>{l.text}</p>
              ) : (
                <div key={i} className={cx("flex", l.kind === "caller" ? "justify-end" : "justify-start")}>
                  <p className={cx("max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    l.kind === "caller" ? "bg-brand-600 text-white" : l.tone === "warn" ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200" : "bg-pink-50 text-slate-800 ring-1 ring-pink-100")}>
                    <span className="mb-0.5 block text-[10px] font-semibold uppercase opacity-70">{l.kind === "caller" ? "Caller" : "🤖 Shreya (AI)"}</span>
                    {l.text}
                  </p>
                </div>
              ),
            )}
            {interim && (
              <div className="flex justify-end"><p className="max-w-[85%] rounded-2xl bg-brand-50 px-3 py-2 text-sm italic text-brand-800 ring-1 ring-brand-100">{interim}…</p></div>
            )}
          </div>
          <form className="flex gap-2 border-t border-slate-200 p-3" onSubmit={(e) => { e.preventDefault(); const v = typed; setTyped(""); void runTurn(v); }}>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} disabled={!active || simulating}
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder={active ? "Or type what the caller says" : "Start a call first"}
              aria-label="Caller answer" />
            <Button type="submit" disabled={!active || simulating}>Send</Button>
          </form>
        </Card>
      </div>

      <aside className="space-y-4 lg:pt-[76px]">
        <SafetyNote>
          Shreya only takes order requests and answers store questions. She refuses dosing and medical questions and offers a pharmacist call-back.
        </SafetyNote>
        <Card>
          <h2 className="text-sm font-bold">Captured by the AI</h2>
          <dl className="mt-2 space-y-2 text-sm">
            <div><dt className="text-slate-500">Name</dt><dd className="font-medium">{call.name ?? "—"}{call.name && <Badge tone="amber" className="ml-2">demo</Badge>}</dd></div>
            <div><dt className="text-slate-500">Phone</dt><dd className="font-medium">{call.phone ?? "—"}</dd></div>
            <div>
              <dt className="text-slate-500">Medicines</dt>
              <dd className="font-medium">
                {call.items.length ? <ul className="list-disc pl-4">{call.items.map((i) => <li key={i.id}>{i.name} {i.strength} × {i.quantity}</li>)}</ul> : call.requestText ?? "—"}
              </dd>
            </div>
            <div><dt className="text-slate-500">Delivery</dt><dd className="font-medium">{call.delivery ?? "—"}</dd></div>
          </dl>
          {orderId && (
            <div className="mt-3 space-y-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
              <p>✓ Order <strong>{orderId}</strong> created and waiting for pharmacist review. The lead was added to the CRM automatically.</p>
              <Link className="font-semibold underline" href={`/extraction/${orderId}`}>View draft →</Link>
            </div>
          )}
        </Card>
        <Card className="text-xs text-slate-600">
          <p className="font-semibold text-slate-800">Callers can ask Shreya anytime</p>
          <ul className="mt-1 list-disc space-y-1 pl-4">{ASK_ANYTIME.map((q) => <li key={q}>“{q}”</li>)}</ul>
          <p className="mt-2">She answers, then picks the order back up where she left off.</p>
        </Card>
      </aside>
    </div>
  );
}
