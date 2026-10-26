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

export type NepaliSpeechCue = {
  text: string;
  rate: number;
  pitch: number;
  crowdVolume: number;
};

const EVENT_EXPRESSIONS: Record<CricketSpeechEvent, string[]> = {
  dot: ["डट बल। कुनै रन बनेन।", "रन छैन। राम्रो बल।", "डट बल। दबाब बढ्दैछ।"],
  run1: ["एक रन। स्ट्राइक परिवर्तन।", "सजिलै एक रन।", "एक रन पूरा।"],
  run2: ["दुई रन। राम्रो दौड।", "छिटो दौडेर दुई रन।", "दुई रन पूरा। शानदार दौड।"],
  run3: ["तीन रन। शानदार दौड।", "वाह! तीन रन पूरा।", "उत्कृष्ट दौड। तीन रन।"],
  four: ["चौका! उत्कृष्ट प्रहार!", "वाह! बल सीमारेखा बाहिर। चौका!", "कस्तो प्रहार! शानदार चौका!"],
  six: ["छक्का! शानदार प्रहार!", "वाह! बल सिधै दर्शकदीर्घामा। छक्का!", "विशाल छक्का! कस्तो प्रहार!"],
  wicket: ["आउट! विकेट गयो!", "विकेट! बलिङ टोलीलाई ठूलो सफलता!", "आउट! खेलमा नयाँ मोड!"],
  wide: ["वाइड बल। एक अतिरिक्त रन।", "बल बाहिर गयो। वाइड।", "वाइड बल। बलरले फेरि गर्नुपर्नेछ।"],
  noBall: ["नो बल। फ्री हिट आउनेछ।", "नो बल! बलरले सीमा नाघे।", "नो बल। अब फ्री हिट!"],
};

const EVENT_PROSODY: Record<CricketSpeechEvent, Omit<NepaliSpeechCue, "text">> = {
  dot: { rate: 0.88, pitch: 0.82, crowdVolume: 0.065 },
  run1: { rate: 0.88, pitch: 0.88, crowdVolume: 0.06 },
  run2: { rate: 0.86, pitch: 0.91, crowdVolume: 0.055 },
  run3: { rate: 0.83, pitch: 0.95, crowdVolume: 0.045 },
  four: { rate: 0.76, pitch: 0.91, crowdVolume: 0.035 },
  six: { rate: 0.72, pitch: 0.86, crowdVolume: 0.025 },
  wicket: { rate: 0.7, pitch: 0.72, crowdVolume: 0.02 },
  wide: { rate: 0.84, pitch: 0.79, crowdVolume: 0.05 },
  noBall: { rate: 0.8, pitch: 0.76, crowdVolume: 0.045 },
};

const DEVANAGARI_DIGIT_WORDS: Record<string, string> = {
  "०": "शून्य", "१": "एक", "२": "दुई", "३": "तीन", "४": "चार",
  "५": "पाँच", "६": "छ", "७": "सात", "८": "आठ", "९": "नौ",
  "0": "शून्य", "1": "एक", "2": "दुई", "3": "तीन", "4": "चार",
  "5": "पाँच", "6": "छ", "7": "सात", "8": "आठ", "9": "नौ",
};

const SPOKEN_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bCRR\b/gi, "हालको रन रेट"], [/\bRRR\b/gi, "आवश्यक रन रेट"],
  [/\bNB\b/gi, "नो बल"], [/\bWD\b/gi, "वाइड बल"], [/\bOUT\b/gi, "आउट"],
];

/** Produces short, unambiguous Devanagari text for local browser speech engines. */
export function normalizeNepaliSpeech(input: string) {
  let text = input.normalize("NFC");
  for (const [pattern, replacement] of SPOKEN_REPLACEMENTS) text = text.replace(pattern, replacement);
  text = text.replace(/[०-९0-9]/g, (digit) => ` ${DEVANAGARI_DIGIT_WORDS[digit]} `);
  return text.replace(/[|/\\_]+/g, " ").replace(/\s+([।!?])/g, "$1").replace(/\s+/g, " ").trim();
}

export function nepaliEventSpeechCue(event: CricketSpeechEvent, sequence = 0): NepaliSpeechCue {
  const expressions = EVENT_EXPRESSIONS[event];
  const index = Math.abs(sequence) % expressions.length;
  return { text: normalizeNepaliSpeech(expressions[index]), ...EVENT_PROSODY[event] };
}

export function nepaliEventAnnouncement(event: CricketSpeechEvent) {
  return nepaliEventSpeechCue(event).text;
}
