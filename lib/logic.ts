// Simulated "AI" helpers. Nothing here calls a real model or external service.
import { INVENTORY } from "./seed";
import type { FollowUp, InventoryItem, OrderItem, Payment } from "./types";

export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const abs = Math.abs(diff);
  const m = Math.round(abs / 60_000);
  const h = Math.round(abs / 3_600_000);
  const d = Math.round(abs / 86_400_000);
  const s = m < 60 ? `${m} min` : h < 24 ? `${h} hr` : `${d} day${d > 1 ? "s" : ""}`;
  return diff >= 0 ? `${s} ago` : `in ${s}`;
}

export const uid = (p = "id") => `${p}-${Math.random().toString(36).slice(2, 8)}`;

/* ---------------- Safety guardrail ---------------- */

const MEDICAL_ADVICE_PATTERNS = [
  /\bdos(e|es|age|ing)\b/i,
  /how (many|much)\b.*\b(take|have|eat|drink|give)\b/i,
  /how often/i,
  /\bwhen (should|do|to) (i )?(take|eat|have)\b/i,
  // Hindi (Devanagari) and Hinglish
  /खुराक|डोज़|डोज|दुष्प्रभाव|साइड ?इफ़ेक्ट|साइड ?इफेक्ट|सुरक्षित|सेफ|शराब|दारू|गर्भ|प्रेग्नें|इलाज|बीमारी/,
  /कितनी (बार|गोली|गोलियाँ|गोलियां|टैबलेट)? ?(लें|ले|लेनी|लेना|खानी|खाना|खाऊँ|खाऊं|लूँ|लूं)/,
  /(ले|खा|पी) सकत[ाीे]/,
  /(लेनी|लेना|खानी|खाना) चाहिए/,
  /किस (लिए|काम)|कब (लें|लेनी|लेना|खानी|खाना)|खाली पेट|खाने (के|से) (पहले|बाद)/,
  /\b(kitni|kitne) (goli|baar|tablet)|\bkab (le|lena|khana)\b|\bkhali pet\b|\bsharab\b|\bdaru\b|\b(le|kha) sakt[ae]\b|\bsafe hai\b/i,
  /\bside[- ]?effects?\b/i,
  /\bcan i (take|have|give|use|stop|mix)\b/i,
  /\bshould i\b/i,
  /\bis it safe\b/i,
  /\bsafe (to|for|during)\b/i,
  /\bpregnan/i,
  /\balcohol\b/i,
  /\binstead of\b/i,
  /\b(cure|treat|treatment|diagnos|symptom)/i,
  /\bwhat (is|are) .* (for|used for)\b/i,
  /\b(before|after) (food|meal)/i,
  /\boverdose\b/i,
];

export function needsMedicalAdviceRefusal(text: string) {
  return MEDICAL_ADVICE_PATTERNS.some((r) => r.test(text));
}

export const REFUSAL_MESSAGE =
  "I'm sorry, I can't give medical advice, dosing information or treatment guidance. A licensed pharmacist or your doctor can help with that. I can only take your order request, and a pharmacist will review it.";

export const REFUSAL_MESSAGE_HI =
  "माफ़ कीजिए, मैं दवा की खुराक, इलाज या कोई भी मेडिकल सलाह नहीं दे सकती। इसके लिए कृपया हमारे फार्मासिस्ट या अपने डॉक्टर से बात करें। मैं सिर्फ़ आपका ऑर्डर ले सकती हूँ।";

/* ---------------- Hindi / Hinglish normalisation ---------------- */

const DEV_DIGITS: Record<string, string> = { "०": "0", "१": "1", "२": "2", "३": "3", "४": "4", "५": "5", "६": "6", "७": "7", "८": "8", "९": "9" };

/** Spoken number words (Hindi + English) → digits. Used for phone numbers and quantities. */
const NUMBER_WORDS: Record<string, string> = {
  zero: "0", oh: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
  शून्य: "0", ज़ीरो: "0", जीरो: "0", एक: "1", दो: "2", तीन: "3", चार: "4", पांच: "5", पाँच: "5", छह: "6", छः: "6", छे: "6", छह्: "6",
  सात: "7", आठ: "8", नौ: "9", दस: "10", ग्यारह: "11", बारह: "12", पंद्रह: "15", पन्द्रह: "15", बीस: "20", पच्चीस: "25", तीस: "30",
  चालीस: "40", पचास: "50", साठ: "60", सौ: "100",
  ek: "1", do: "2", teen: "3", char: "4", paanch: "5", panch: "5", chhe: "6", saat: "7", aath: "8", nau: "9", das: "10", shunya: "0",
};

/** Lower-cases, converts Devanagari digits and Hindi unit words so one parser handles both languages. */
export function normalizeSpeech(text: string) {
  let t = text.toLowerCase().replace(/[०-९]/g, (d) => DEV_DIGITS[d]);
  t = t
    .replace(/एमजी|एम जी|मिलीग्राम|मि\.ग्रा\.?|milligram(s)?/g, " mg ")
    .replace(/आईयू|आई यू/g, " iu ")
    .replace(/ग्राम/g, " g ");
  return t.replace(/\s+/g, " ").trim();
}

/** Phone numbers spoken as words ("नौ शून्य शून्य…", "double five") → digits. */
export function speechToDigits(text: string) {
  const tokens = normalizeSpeech(text).replace(/[^\p{L}\p{M}0-9 ]/gu, " ").split(/\s+/);
  let out = "";
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const next = NUMBER_WORDS[tokens[i + 1]] ?? (/^\d$/.test(tokens[i + 1] ?? "") ? tokens[i + 1] : undefined);
    if ((t === "double" || t === "डबल") && next) { out += next.repeat(2); i++; }
    else if ((t === "triple" || t === "ट्रिपल") && next) { out += next.repeat(3); i++; }
    else if (NUMBER_WORDS[t] && NUMBER_WORDS[t].length === 1) out += NUMBER_WORDS[t];
    else if (/^\d+$/.test(t)) out += t;
  }
  return out.replace(/^(91|0)(?=\d{10}$)/, "");
}

const words = (text: string) => normalizeSpeech(text).replace(/[^\p{L}\p{M}0-9 ]/gu, " ").split(/\s+/).filter(Boolean);
const YES = new Set(["yes", "yeah", "yep", "sure", "ok", "okay", "confirm", "haan", "han", "ha", "ji", "theek", "thik", "bhej", "हाँ", "हां", "हा", "जी", "ठीक", "भेज", "भेजो", "भेजिए", "भेजें", "बिल्कुल", "ज़रूर", "जरूर", "कीजिए", "करो", "चलेगा"]);
const NO = new Set(["no", "nope", "nahi", "nahin", "mat", "नहीं", "नही", "ना", "मत", "रुको", "रहने"]);

export function isNo(text: string) {
  return words(text).some((w) => NO.has(w));
}
export function isYes(text: string) {
  return !isNo(text) && words(text).some((w) => YES.has(w));
}

/** "मेरा नाम दिव्या अग्रवाल है" / "my name is Divya" → the name only. */
export function cleanSpokenName(t: string) {
  return t
    .replace(/^(hi|hello|namaste|नमस्ते|नमस्कार)[,\s]+/i, "")
    .replace(/^(my name is|this is|i am|i'm|it's|name is|mera naam|मेरा नाम|मैं|मेरा)\s+/i, "")
    .replace(/\s+(hai|है|हूँ|हूं|बोल रहा हूँ|बोल रही हूँ|बोल रहा हूं|बोल रही हूं)\s*[.!।]*$/i, "")
    .replace(/[.!।,]+$/, "")
    .trim();
}

/** Inventory names and how people (or Hindi speech recognition) commonly write them. */
export const MEDICINE_ALIASES: Record<string, { hi: string; aliases: string[] }> = {
  Paracetamol: { hi: "पैरासिटामोल", aliases: ["paracetamol", "पैरासिटामोल", "पेरासिटामोल", "पारासिटामोल", "पैरासीटामोल"] },
  Cetirizine: { hi: "सेटिरिज़ीन", aliases: ["cetirizine", "सेटिरिज़ीन", "सेटिरिजीन", "सिटरिज़िन", "सिट्रीज़ीन", "सिट्रिजिन", "सेट्रिज़िन", "सेटीरिज़िन"] },
  Pantoprazole: { hi: "पैंटोप्राज़ोल", aliases: ["pantoprazole", "पैंटोप्राज़ोल", "पैंटोप्राजोल", "पेंटोप्राजोल", "पेंटोप्राज़ोल", "पैन्टोप्राजोल"] },
  "Vitamin D3": { hi: "विटामिन डी थ्री", aliases: ["vitamin d3", "vitamin d", "विटामिन डी", "विटामिन d"] },
  Amoxicillin: { hi: "एमोक्सिसिलिन", aliases: ["amoxicillin", "एमोक्सिसिलिन", "अमोक्सिसिलिन", "एमोक्सीसिलिन"] },
  Metformin: { hi: "मेटफॉर्मिन", aliases: ["metformin", "मेटफॉर्मिन", "मेटफार्मिन", "मेटफोर्मिन"] },
  "ORS Sachet": { hi: "ओ आर एस", aliases: ["ors", "ओआरएस", "ओ आर एस", "ओ.आर.एस"] },
  Azithromycin: { hi: "एज़िथ्रोमाइसिन", aliases: ["azithromycin", "एज़िथ्रोमाइसिन", "एजिथ्रोमाइसिन", "अज़ीथ्रोमाइसिन", "अजिथ्रोमाइसिन"] },
  Montelukast: { hi: "मोंटेलुकास्ट", aliases: ["montelukast", "मोंटेलुकास्ट", "मॉन्टेलुकास्ट", "मोंटेल्यूकास्ट"] },
  Amlodipine: { hi: "एम्लोडिपिन", aliases: ["amlodipine", "एम्लोडिपिन", "एम्लोडिपीन", "अम्लोडिपिन", "अमलोडिपिन"] },
};

const isWordChar = (c: string | undefined) => !!c && /[\p{L}\p{M}\p{N}]/u.test(c);

function findWord(haystack: string, needle: string) {
  let from = 0;
  for (;;) {
    const i = haystack.indexOf(needle, from);
    if (i === -1) return -1;
    if (!isWordChar(haystack[i - 1]) && (!isWordChar(haystack[i + needle.length]) || /^[a-z]+$/.test(needle) === false)) return i;
    from = i + 1;
  }
}

/** For speech: "500 mg" → "500 एमजी" so a Hindi voice pronounces it naturally. */
export function strengthForSpeechHi(strength: string) {
  return strength.replace(/\bmg\b/i, "एमजी").replace(/\biu\b/i, "आई यू").replace(/\bg\b/i, "ग्राम").replace(/\bml\b/i, "एमएल");
}

/* ---------------- Simulated extraction ---------------- */

const STRENGTH = String.raw`(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|iu)\b`;

function titleCase(s: string) {
  return s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

function cleanName(raw: string) {
  return titleCase(
    raw
      .replace(/^(tab|tablet|cap|capsule|syp|syrup|inj)\.?\s+/i, "")
      .replace(/[.\-–:]+$/g, "")
      .trim(),
  );
}

function fakeConfidence(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return Math.round((0.82 + (h % 17) / 100) * 100) / 100; // 0.82 – 0.98
}

/** Parse a typed prescription. Returns only name, strength and quantity — never dosing. */
export function extractFromText(text: string): OrderItem[] {
  const items: OrderItem[] = [];
  const lineRe = new RegExp(String.raw`^\s*\d+\s*[.)]\s*(.+?)\s+` + STRENGTH + String.raw`.*?(?:qty|quantity|x|#)\s*[:\-]?\s*(\d+)`, "i");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(lineRe);
    if (!m) continue;
    const unit = m[3].toLowerCase() === "iu" ? "IU" : m[3].toLowerCase();
    items.push({
      id: uid("it"),
      name: cleanName(m[1]),
      strength: `${m[2]} ${unit}`,
      quantity: Number(m[4]),
      confidence: fakeConfidence(line),
    });
  }
  return items;
}

/** Match free text like "paracetamol 500 mg 10 tablets" against the demo inventory. */
/** Works for English, Hinglish and Devanagari (e.g. "पैरासिटामोल 500 एमजी 10 गोली"). */
export function extractFromFreeText(text: string): OrderItem[] {
  const lower = normalizeSpeech(text)
    .split(" ")
    .map((w) => NUMBER_WORDS[w.replace(/[.,!?।]+$/, "")] ?? w)
    .join(" ");

  // Locate every medicine mention first, so each one's strength/quantity is read only up to the next medicine.
  const hits: { inv: (typeof INVENTORY)[number]; start: number; end: number }[] = [];
  for (const inv of INVENTORY) {
    const aliases = [...(MEDICINE_ALIASES[inv.name]?.aliases ?? [inv.name.toLowerCase()])].sort((a, b) => b.length - a.length);
    for (const a of aliases) {
      const i = findWord(lower, a);
      if (i !== -1) { hits.push({ inv, start: i, end: i + a.length }); break; }
    }
  }
  hits.sort((a, b) => a.start - b.start);

  return hits.map((h, k) => {
    const tail = lower.slice(h.end, k + 1 < hits.length ? hits[k + 1].start : h.end + 60);
    const strengthM = tail.match(new RegExp(STRENGTH, "i"));
    const afterStrength = strengthM ? tail.slice((strengthM.index ?? 0) + strengthM[0].length) : tail;
    const qtyM = afterStrength.match(/(\d+)/);
    const unit = strengthM?.[2].toLowerCase();
    return {
      id: uid("it"),
      name: h.inv.name,
      strength: strengthM ? `${strengthM[1]} ${unit === "iu" ? "IU" : unit}` : h.inv.strength,
      quantity: qtyM ? Number(qtyM[1]) : 10,
      confidence: strengthM && qtyM ? fakeConfidence(h.inv.name + tail) : 0.74,
    };
  });
}

/** Preset result used for image uploads (the demo has no real OCR). */
export function presetImageExtraction(): OrderItem[] {
  return [
    { id: uid("it"), name: "Paracetamol", strength: "500 mg", quantity: 10, confidence: 0.96 },
    { id: uid("it"), name: "Cetirizine", strength: "10 mg", quantity: 5, confidence: 0.93 },
    { id: uid("it"), name: "Pantoprazole", strength: "40 mg", quantity: 15, confidence: 0.88 },
    { id: uid("it"), name: "Vitamin D3", strength: "60000 IU", quantity: 4, confidence: 0.85 },
  ];
}

/* ---------------- Inventory / pricing ---------------- */

export function findInventory(inventory: InventoryItem[], item: OrderItem) {
  const n = item.name.toLowerCase();
  return (
    inventory.find((i) => i.name.toLowerCase() === n && i.strength.toLowerCase() === item.strength.toLowerCase()) ??
    inventory.find((i) => i.name.toLowerCase() === n)
  );
}

export type Availability = { label: string; tone: "green" | "amber" | "red" | "slate"; available: number };

export function availability(inventory: InventoryItem[], item: OrderItem): Availability {
  const inv = findInventory(inventory, item);
  if (!inv) return { label: "Not stocked – pharmacist will call", tone: "slate", available: 0 };
  if (inv.stock >= item.quantity) return { label: "In stock", tone: "green", available: item.quantity };
  if (inv.stock > 0) return { label: `Only ${inv.stock} available`, tone: "amber", available: inv.stock };
  return { label: "Out of stock – arranging", tone: "red", available: 0 };
}

export function orderTotal(inventory: InventoryItem[], items: OrderItem[]) {
  return items.reduce((sum, it) => sum + (findInventory(inventory, it)?.unitPrice ?? 0) * it.quantity, 0);
}

/* ---------------- Payments / follow-ups ---------------- */

export function paymentStatus(p: Payment): "Paid" | "Partially paid" | "Pending" {
  if (p.paid >= p.total) return "Paid";
  if (p.paid > 0) return "Partially paid";
  return "Pending";
}

export function followUpState(f: FollowUp): "Sent" | "Done" | "Overdue" | "Due soon" | "Scheduled" {
  if (f.status !== "Scheduled") return f.status;
  const diff = new Date(f.at).getTime() - Date.now();
  if (diff < 0) return "Overdue";
  if (diff < 6 * 3_600_000) return "Due soon";
  return "Scheduled";
}
