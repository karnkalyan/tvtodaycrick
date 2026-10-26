export type CricketSpeechEvent =
  | "dot"
  | "run1"
  | "run2"
  | "run3"
  | "four"
  | "six"
  | "wicket"
  | "wide"
  | "noBall";

const EVENT_ANNOUNCEMENTS: Record<CricketSpeechEvent, string> = {
  dot: "डट बल। कुनै रन बनेन।",
  run1: "एक रन।",
  run2: "दुई रन। राम्रो दौड।",
  run3: "तीन रन। शानदार दौड।",
  four: "चौका! उत्कृष्ट प्रहार!",
  six: "छक्का! शानदार प्रहार!",
  wicket: "आउट! विकेट गयो!",
  wide: "वाइड बल। एक अतिरिक्त रन।",
  noBall: "नो बल। फ्री हिट आउनेछ।",
};

const DEVANAGARI_DIGIT_WORDS: Record<string, string> = {
  "०": "शून्य", "१": "एक", "२": "दुई", "३": "तीन", "४": "चार",
  "५": "पाँच", "६": "छ", "७": "सात", "८": "आठ", "९": "नौ",
  "0": "शून्य", "1": "एक", "2": "दुई", "3": "तीन", "4": "चार",
  "5": "पाँच", "6": "छ", "7": "सात", "8": "आठ", "9": "नौ",
};

const SPOKEN_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bCRR\b/gi, "हालको रन रेट"],
  [/\bRRR\b/gi, "आवश्यक रन रेट"],
  [/\bNB\b/gi, "नो बल"],
  [/\bWD\b/gi, "वाइड बल"],
  [/\bOUT\b/gi, "आउट"],
];

/** Produces short, unambiguous Devanagari text for local browser speech engines. */
export function normalizeNepaliSpeech(input: string) {
  let text = input.normalize("NFC");
  for (const [pattern, replacement] of SPOKEN_REPLACEMENTS) text = text.replace(pattern, replacement);
  text = text.replace(/[०-९0-9]/g, (digit) => ` ${DEVANAGARI_DIGIT_WORDS[digit]} `);
  return text
    .replace(/[|/\\_]+/g, " ")
    .replace(/\s+([।!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function nepaliEventAnnouncement(event: CricketSpeechEvent) {
  return normalizeNepaliSpeech(EVENT_ANNOUNCEMENTS[event]);
}
