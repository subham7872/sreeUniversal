// Conversation brain for the demo voice agent "Shreya".
// Pure functions: given what the caller said, decide what Shreya says next.
// Every line exists in Hindi (spoken) and English (shown on screen). No real AI service is called.
import {
  cleanSpokenName,
  extractFromFreeText,
  findInventory,
  isNo,
  isYes,
  MEDICINE_ALIASES,
  needsMedicalAdviceRefusal,
  normalizeSpeech,
  speechToDigits,
  strengthForSpeechHi,
} from "./logic";
import { devanagariToRoman } from "./translit";
import type { InventoryItem, OrderItem } from "./types";

export type Lang = "hi" | "en";
export type Msg = { hi: string; en: string };
export type Step = "name" | "phone" | "request" | "delivery" | "confirm" | "wrapup";

export interface CallState {
  step: Step;
  name?: string; // shown on screen / saved to CRM (English letters)
  nameSpoken?: string; // as the caller said it (used in spoken Hindi)
  phone?: string;
  requestText?: string;
  items: OrderItem[];
  delivery?: "Home delivery" | "Store pickup";
}

export interface Turn {
  state: CallState;
  msgs: Msg[];
  effect?: "createOrder" | "callback";
  end?: boolean;
}

export const newCall = (): CallState => ({ step: "name", items: [] });

const hasDevanagari = (t: string) => /[ऀ-ॿ]/.test(t);
const titleCase = (s: string) => s.replace(/\S+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
/** Anything the caller said, in English letters for the screen and CRM. */
export const toEnglishLetters = (t: string) => (hasDevanagari(t) ? devanagariToRoman(t) : t);

/* ---------------- What Shreya says ---------------- */

export const INTRO: Msg[] = [
  { hi: "नमस्ते! मैं श्रेया हूँ, श्री यूनिवर्सल फार्मेसी से।", en: "Namaste! I'm Shreya from Shree Universal Pharmacy." },
  { hi: "मैं आपकी दवा का ऑर्डर लेने में मदद करूँगी। पहले, आपका नाम जान सकती हूँ?", en: "I'll help you place your medicine order. First, may I know your name?" },
];

const QUESTION: Record<Step, Msg> = {
  name: { hi: "आपका नाम क्या है?", en: "May I know your name?" },
  phone: { hi: "अपना दस अंकों का मोबाइल नंबर बताइए।", en: "Could you tell me your 10-digit mobile number?" },
  request: { hi: "आपको कौन-सी दवाइयाँ चाहिए?", en: "Which medicines do you need?" },
  delivery: { hi: "डिलीवरी घर पर चाहिए, या आप दुकान से लेंगे?", en: "Would you like home delivery, or will you pick it up from the store?" },
  confirm: { hi: "क्या मैं यह ऑर्डर फार्मासिस्ट को जाँच के लिए भेज दूँ?", en: "Shall I send this order to our pharmacist for review?" },
  wrapup: { hi: "और कुछ मदद कर सकती हूँ?", en: "Is there anything else I can help you with?" },
};
export const question = (s: Step) => QUESTION[s];

const RESUME: Msg = { hi: "अब आपके ऑर्डर पर वापस आते हैं।", en: "Now, coming back to your order." };
export const GOODBYE: Msg = { hi: "श्री यूनिवर्सल फार्मेसी को कॉल करने के लिए धन्यवाद। आपका दिन शुभ हो!", en: "Thank you for calling Shree Universal Pharmacy. Have a nice day!" };
const REFUSAL: Msg = {
  hi: "माफ़ कीजिए, दवा कैसे या कितनी लेनी है, यह मैं नहीं बता सकती। इसके लिए हमारे फार्मासिस्ट या अपने डॉक्टर से बात कीजिए।",
  en: "I'm sorry, I can't advise on how to take a medicine or how much. Please ask our pharmacist or your doctor.",
};
export const STILL_THERE: Msg = { hi: "क्या आप लाइन पर हैं?", en: "Are you still there?" };
export const NO_ONE: Msg = { hi: "लगता है लाइन पर कोई नहीं है। मैं कॉल समाप्त कर रही हूँ। धन्यवाद!", en: "It seems no one is on the line, so I'll end the call now. Thank you!" };

export function orderPlaced(id: string): Msg[] {
  return [
    { hi: `हो गया! आपका ऑर्डर फार्मासिस्ट को भेज दिया है। ऑर्डर नंबर है ${id.replace("ORD-", "ओ आर डी ")}।`, en: `Done! Your order has been sent to our pharmacist. Your order number is ${id}.` },
    { hi: "फार्मासिस्ट के जाँचने के बाद आपको व्हाट्सऐप पर अपडेट मिल जाएगा।", en: "You'll get an update on WhatsApp once the pharmacist checks it." },
    QUESTION.wrapup,
  ];
}

const UNIT: Record<string, { en: string; hi: string }> = {
  Tablet: { en: "tablets", hi: "गोली" },
  Capsule: { en: "capsules", hi: "कैप्सूल" },
  Powder: { en: "sachets", hi: "पैकेट" },
};

function itemsSummary(items: OrderItem[], inventory: InventoryItem[]): Msg {
  const parts = items.map((i) => {
    const unit = UNIT[findInventory(inventory, i)?.form ?? "Tablet"] ?? UNIT.Tablet;
    return {
      en: `${i.name} ${i.strength}, ${i.quantity} ${unit.en}`,
      hi: `${MEDICINE_ALIASES[i.name]?.hi ?? i.name} ${strengthForSpeechHi(i.strength)}, ${i.quantity} ${unit.hi}`,
    };
  });
  const join = (xs: string[], and: string) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ${and} ${xs[xs.length - 1]}`);
  return { en: join(parts.map((p) => p.en), "and"), hi: join(parts.map((p) => p.hi), "और") };
}

/* ---------------- Understanding the caller ---------------- */

const RX = {
  repeat: /\b(repeat|again|pardon|dobara|phir se)\b|दोबारा|फिर से|क्या कहा|समझ नहीं|samjha nahi/i,
  cancel: /\bcancel\b|rehne do|रहने दो|कैंसल|order mat|ऑर्डर मत|order nahi karna|ऑर्डर नहीं करना/i,
  timings: /\b(time|timing|timings|open|close|closing|hours)\b|kab tak|khul|samay|समय|टाइम|खुल|कब तक/i,
  address: /\b(address|location|where)\b|kahan hai|kaha hai|पता क्या|पता बताइए|पता बताओ|कहाँ है|कहां है|एड्रेस|लोकेशन/i,
  delivery: /deliver|delivery|डिलीवरी|डिलिवरी/i,
  asking: /\?|\b(kya|hai kya|milegi|milega|charge|charges|free|do you|can you|is there|how|what)\b|क्या|मिलेगी|मिलेगा|चार्ज|फ्री|होती है|करते हैं/i,
  payment: /\b(pay|payment|upi|cash|card|gpay|paytm|phonepe)\b|पेमेंट|यूपीआई|कैश|कार्ड/i,
  staff: /pharmacist|फार्मासिस्ट|फार्मेसिस्ट|\b(human|person|someone|kisi)\b|इंसान|किसी/i,
  talk: /\b(baat|talk|speak|call|callback)\b|बात|कॉल/i,
  who: /who are you|are you (a )?(robot|bot|human|real)|aap kaun|kaun ho|आप कौन|कौन हो|रोबोट/i,
  price: /\b(price|cost|costs|rate|kitne|daam|kimat|keemat)\b|कीमत|दाम|कितने का|कितने की|कितना है|रेट|प्राइस/i,
  stock: /\b(available|availability|stock|have|milegi|milega)\b|hai kya|मिलेगी|मिलेगा|है क्या|उपलब्ध|स्टॉक/i,
  home: /\b(home|ghar|deliver|delivery)\b|घर|डिलीवरी|डिलिवरी/i,
  pickup: /pick ?up|\b(store|shop|collect|khud|dukan|myself)\b|दुकान|स्टोर|पिकअप|आकर|खुद/i,
  done: /\b(thank|thanks|that's all|thats all|nothing|bas|bye|dhanyavaad|dhanyavad|shukriya)\b|धन्यवाद|शुक्रिया|बस|बाय/i,
};

function stockAnswer(items: OrderItem[], inventory: InventoryItem[]): Msg {
  const parts = items.slice(0, 2).map((i) => {
    const inv = findInventory(inventory, i);
    const hiName = MEDICINE_ALIASES[i.name]?.hi ?? i.name;
    if (!inv || inv.stock === 0) return { en: `${i.name} is out of stock right now, but we can arrange it`, hi: `${hiName} अभी स्टॉक में नहीं है, पर हम मँगवा सकते हैं` };
    if (inv.stock < 20) return { en: `only ${inv.stock} of ${i.name} are left in stock`, hi: `${hiName} की सिर्फ़ ${inv.stock} बची हैं` };
    return { en: `${i.name} ${inv.strength} is in stock`, hi: `${hiName} ${strengthForSpeechHi(inv.strength)} स्टॉक में है` };
  });
  const en = parts.map((p) => p.en).join(", and ");
  return { en: `Let me check. ${en[0].toUpperCase()}${en.slice(1)}.`, hi: `जी, मैंने चेक किया। ${parts.map((p) => p.hi).join(", और ")}।` };
}

function priceAnswer(items: OrderItem[], inventory: InventoryItem[]): Msg {
  const parts = items.slice(0, 2).map((i) => {
    const inv = findInventory(inventory, i);
    const hiName = MEDICINE_ALIASES[i.name]?.hi ?? i.name;
    if (!inv) return { en: `I don't have the price of ${i.name}, the pharmacist will confirm it`, hi: `${hiName} की कीमत फार्मासिस्ट बता देंगे` };
    const unit = UNIT[inv.form] ?? UNIT.Tablet;
    const unitEn = unit.en.replace(/s$/, "");
    return {
      en: `${inv.name} ${inv.strength} is ${inv.unitPrice} rupees per ${unitEn}`,
      hi: `${hiName} ${strengthForSpeechHi(inv.strength)} एक ${unit.hi} ${inv.unitPrice} रुपये की है`,
    };
  });
  return { en: `${parts.map((p) => p.en).join(", and ")}. These are demo prices.`, hi: `${parts.map((p) => p.hi).join(", और ")}। ये डेमो कीमतें हैं।` };
}

/** Questions the caller can ask at any moment. Returns null if it isn't one. */
function answerQuestion(text: string, step: Step, inventory: InventoryItem[]): { msg: Msg; effect?: Turn["effect"] } | null {
  const t = normalizeSpeech(text);
  const meds = extractFromFreeText(text);
  if (RX.staff.test(t) && RX.talk.test(t)) {
    return { msg: { hi: "ज़रूर। मैंने फार्मासिस्ट से कॉल-बैक बुक कर दिया है, वे पंद्रह मिनट में आपको कॉल करेंगे।", en: "Sure. I've booked a call-back, and our pharmacist will call you within 15 minutes." }, effect: "callback" };
  }
  if (RX.who.test(t)) return { msg: { hi: "मैं श्रेया हूँ, श्री यूनिवर्सल फार्मेसी की AI असिस्टेंट। मैं ऑर्डर लेती हूँ, और हर ऑर्डर हमारे फार्मासिस्ट जाँचते हैं।", en: "I'm Shreya, the AI assistant of Shree Universal Pharmacy. I take orders, and our pharmacist checks every one of them." } };
  if (meds.length && RX.price.test(t)) return { msg: priceAnswer(meds, inventory) };
  if (meds.length && RX.stock.test(t) && RX.asking.test(t)) return { msg: stockAnswer(meds, inventory) };
  if (RX.timings.test(t)) return { msg: { hi: "हम सोमवार से शनिवार सुबह आठ से रात दस बजे तक, और रविवार सुबह नौ से दोपहर दो बजे तक खुले रहते हैं।", en: "We're open Monday to Saturday from 8 AM to 10 PM, and on Sunday from 9 AM to 2 PM." } };
  if (RX.address.test(t)) return { msg: { hi: "हमारी दुकान सैंपल मार्केट रोड, डेमो नगर, कोलकाता में है।", en: "Our store is on Sample Market Road, Demo Nagar, Kolkata." } };
  if (RX.payment.test(t)) return { msg: { hi: "आप यूपीआई, कैश या कार्ड, किसी से भी पेमेंट कर सकते हैं।", en: "You can pay by UPI, cash or card, whichever you like." } };
  if (RX.delivery.test(t) && RX.asking.test(t) && step !== "delivery") {
    return { msg: { hi: "जी हाँ, पाँच किलोमीटर के अंदर होम डिलीवरी फ्री है, और दुकान से तीस मिनट में पिकअप भी कर सकते हैं।", en: "Yes, home delivery is free within 5 kilometres, and store pickup is ready in about 30 minutes." } };
  }
  return null;
}

/* ---------------- The conversation ---------------- */

export function respond(prev: CallState, text: string, inventory: InventoryItem[]): Turn {
  const state: CallState = { ...prev, items: [...prev.items] };
  const s = state.step;
  const t = normalizeSpeech(text);
  const say = (...msgs: Msg[]): Turn => ({ state, msgs });

  if (needsMedicalAdviceRefusal(text)) return say(REFUSAL, question(s));

  if (s !== "wrapup" && RX.cancel.test(t)) {
    return { state, msgs: [{ hi: "ठीक है, मैंने ऑर्डर रद्द कर दिया।", en: "Okay, I've cancelled the order." }, GOODBYE], end: true };
  }
  if (RX.repeat.test(t)) return say({ hi: "ज़रूर।", en: "Sure." }, question(s));

  // In the delivery step, "home"/"pickup" is the answer, not a question about delivery.
  const deliveryAnswer = s === "delivery" && !RX.asking.test(t) && (RX.home.test(t) || RX.pickup.test(t));
  if (!deliveryAnswer) {
    const q = answerQuestion(text, s, inventory);
    if (q) {
      const follow = s === "wrapup" ? [question("wrapup")] : [RESUME, question(s)];
      return { state, msgs: [q.msg, ...follow], effect: q.effect };
    }
  }

  switch (s) {
    case "name": {
      // Caller jumped straight to the medicines: note them, then still ask for the name.
      const meds = extractFromFreeText(text);
      if (meds.length) {
        state.items = meds;
        state.requestText = toEnglishLetters(text);
        const sum = itemsSummary(meds, inventory);
        return say({ hi: `ठीक है, ${sum.hi}, नोट कर लिया।`, en: `Okay, I've noted ${sum.en}.` }, { hi: "पहले, आपका नाम जान सकती हूँ?", en: "First, may I know your name?" });
      }
      const name = cleanSpokenName(text);
      if (name.length < 2 || /\d/.test(name) || name.split(/\s+/).length > 4) {
        return say({ hi: "माफ़ कीजिए, नाम ठीक से सुनाई नहीं दिया। एक बार फिर बताइए?", en: "Sorry, I didn't catch your name. Could you say it once more?" });
      }
      state.nameSpoken = name;
      state.name = titleCase(toEnglishLetters(name));
      state.step = "phone";
      return say({ hi: `धन्यवाद, ${name} जी।`, en: `Thank you, ${state.name}.` }, { hi: "अब अपना दस अंकों का मोबाइल नंबर बताइए।", en: "Now, could you tell me your 10-digit mobile number?" });
    }
    case "phone": {
      const d = speechToDigits(text);
      if (d.length !== 10) {
        return say({ hi: "माफ़ कीजिए, मुझे पूरा दस अंकों का नंबर चाहिए। एक-एक अंक करके बोलिए।", en: "Sorry, I need the full 10-digit number. Please say it digit by digit." });
      }
      state.phone = `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
      const ack: Msg = { hi: "बढ़िया, नंबर नोट कर लिया।", en: "Great, I've noted your number." };
      if (state.items.length) {
        state.step = "delivery";
        const sum = itemsSummary(state.items, inventory);
        return say(ack, { hi: `आपने ${sum.hi} बताई थीं।`, en: `You asked for ${sum.en}.` }, question("delivery"));
      }
      state.step = "request";
      return say(ack, { hi: "अब बताइए, आपको कौन-सी दवाइयाँ चाहिए?", en: "Now tell me, which medicines do you need?" });
    }
    case "request": {
      const meds = extractFromFreeText(text);
      state.items = meds;
      state.requestText = toEnglishLetters(text);
      state.step = "delivery";
      if (!meds.length) {
        return say({ hi: "ठीक है, मैंने आपकी रिक्वेस्ट नोट कर ली है, फार्मासिस्ट इसे ध्यान से पढ़ लेंगे।", en: "Okay, I've noted your request, and the pharmacist will go through it carefully." }, question("delivery"));
      }
      const sum = itemsSummary(meds, inventory);
      return say({ hi: `ठीक है, मैंने नोट किया: ${sum.hi}।`, en: `Okay, I've noted ${sum.en}.` }, question("delivery"));
    }
    case "delivery": {
      const home = RX.home.test(t);
      if (!home && !RX.pickup.test(t)) return say({ hi: "घर पर डिलीवरी, या दुकान से पिकअप?", en: "Home delivery, or store pickup?" });
      state.delivery = home ? "Home delivery" : "Store pickup";
      state.step = "confirm";
      return say(
        home ? { hi: "ठीक है, घर पर डिलीवरी हो जाएगी।", en: "Okay, we'll deliver it to your home." } : { hi: "ठीक है, आप दुकान से ले लीजिएगा।", en: "Okay, you can collect it from the store." },
        { hi: "तो क्या मैं यह ऑर्डर फार्मासिस्ट को जाँच के लिए भेज दूँ?", en: "So, shall I send this order to our pharmacist for review?" },
      );
    }
    case "confirm": {
      if (isYes(text)) {
        state.step = "wrapup";
        return { state, msgs: [], effect: "createOrder" }; // the page adds orderPlaced(id)
      }
      if (isNo(text)) {
        state.step = "request";
        state.items = [];
        return say({ hi: "कोई बात नहीं।", en: "No problem." }, { hi: "फिर से बताइए, कौन-सी दवाइयाँ चाहिए?", en: "Tell me again, which medicines do you need?" });
      }
      return say({ hi: "बस हाँ या ना बोल दीजिए।", en: "Just say yes or no, please." });
    }
    case "wrapup": {
      if (isNo(text) || RX.done.test(t)) return { state, msgs: [GOODBYE], end: true };
      if (isYes(text)) return say({ hi: "ज़रूर, बताइए।", en: "Sure, go ahead." });
      return say(
        { hi: "माफ़ कीजिए, इस बारे में मुझे जानकारी नहीं है। चाहें तो मैं फार्मासिस्ट से कॉल-बैक करवा सकती हूँ।", en: "Sorry, I don't have information on that. If you like, I can arrange a call-back from our pharmacist." },
        question("wrapup"),
      );
    }
  }
}

/* ---------------- Scripted demo calls (shown in English letters) ---------------- */

export type ScriptLine = { text: string; interruptAfterMs?: number };

export const SCRIPT: Record<Lang, ScriptLine[]> = {
  hi: [
    { text: "Mera naam Divya Agarwal hai" },
    { text: "Aapki dukaan kab tak khuli rehti hai?" },
    { text: "nau shunya shunya shunya shunya ek shunya shunya ek nau" },
    { text: "Kya paracetamol sharab ke saath lena safe hai?" },
    { text: "Mujhe paracetamol 500 mg 10 goli aur cetirizine 10 mg 5 goli chahiye" },
    { text: "Ghar par, ghar par delivery", interruptAfterMs: 2500 },
    { text: "Haan, bhej dijiye" },
    { text: "Home delivery ka koi charge hai kya?" },
    { text: "Nahi, bas itna hi. Dhanyavaad" },
  ],
  en: [
    { text: "My name is Divya Agarwal" },
    { text: "What time do you close today?" },
    { text: "nine zero zero zero zero one zero zero one nine" },
    { text: "Is it safe to take paracetamol with alcohol?" },
    { text: "I need paracetamol 500 mg 10 tablets and cetirizine 10 mg 5 tablets" },
    { text: "Home delivery please", interruptAfterMs: 2500 },
    { text: "Yes, please send it" },
    { text: "Is there any charge for home delivery?" },
    { text: "No, that's all. Thank you!" },
  ],
};
