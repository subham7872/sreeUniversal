// Devanagari → Roman (Hinglish) so an Indian-English voice can speak Hindi
// when the browser has no Hindi voice installed. Simple rule-based, good enough for speech.

const VOWELS: Record<string, string> = { "अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo", "ऋ": "ri", "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au", "ऑ": "o" };
const MATRAS: Record<string, string> = { "ा": "aa", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo", "ृ": "ri", "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ॉ": "o", "ॅ": "e" };
const CONS: Record<string, string> = {
  "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "n", "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "n",
  "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n", "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
  "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m", "य": "y", "र": "r", "ल": "l", "व": "v",
  "श": "sh", "ष": "sh", "स": "s", "ह": "h",
};
const NUKTA: Record<string, string> = { "क": "q", "ख": "kh", "ग": "g", "ज": "z", "ड": "r", "ढ": "rh", "फ": "f" };
const VIRAMA = "्";
const NUKTA_SIGN = "़";
const PRECOMPOSED: Record<string, string> = { "क़": "क़", "ख़": "ख़", "ग़": "ग़", "ज़": "ज़", "ड़": "ड़", "ढ़": "ढ़", "फ़": "फ़" };

/** One spoken unit: a consonant (may be empty) + vowel. `schwa` marks an inherent "a" that may be dropped. */
type Unit = { c: string; v: string; schwa: boolean; tail: string };

function word(w: string) {
  const s = [...w.normalize("NFD")].map((c) => PRECOMPOSED[c] ?? c).join("").normalize("NFD");
  const chars = [...s];
  const units: Unit[] = [];
  let prefix = "";
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (CONS[c]) {
      let base = CONS[c];
      if (chars[i + 1] === NUKTA_SIGN) { base = NUKTA[c] ?? base; i++; }
      const next = chars[i + 1];
      if (next === VIRAMA) { units.push({ c: prefix + base, v: "", schwa: false, tail: "" }); prefix = ""; i++; continue; }
      if (next && MATRAS[next]) { units.push({ c: prefix + base, v: MATRAS[next], schwa: false, tail: "" }); prefix = ""; i++; continue; }
      units.push({ c: prefix + base, v: "a", schwa: true, tail: "" });
      prefix = "";
      continue;
    }
    if (VOWELS[c]) { units.push({ c: prefix, v: VOWELS[c], schwa: false, tail: "" }); prefix = ""; continue; }
    const last = units[units.length - 1];
    const extra = c === "ं" || c === "ँ" ? "n" : c === "ः" ? "h" : c === "।" ? "." : c;
    if (last) last.tail += extra; else prefix += extra;
  }

  // Schwa deletion: drop the word-final inherent "a", and a medial one in the pattern  vowel · C(a) · C vowel.
  const lastIdx = units.length - 1;
  if (lastIdx > 0 && units[lastIdx].schwa && !units[lastIdx].tail) units[lastIdx].v = "";
  for (let i = lastIdx - 1; i >= 1; i--) {
    const u = units[i];
    const prev = units[i - 1];
    const next = units[i + 1];
    if (u.schwa && !u.tail && prev.v && next.c && next.v) u.v = "";
  }

  let out = units.map((u) => u.c + u.v + u.tail).join("") + prefix;
  out = out.replace(/aa$/, "a"); // "davaa" → "dava", reads better for English voices
  return out;
}

export function devanagariToRoman(text: string) {
  return text
    .replace(/।/g, ".")
    .split(/(\s+|-)/)
    .map((w) => {
      if (!/[ऀ-ॿ]/.test(w)) return w;
      const m = w.match(/^(.*?)([^ऀ-ॿ]*)$/u)!; // keep trailing punctuation out of the word
      return word(m[1]) + m[2];
    })
    .join("");
}
