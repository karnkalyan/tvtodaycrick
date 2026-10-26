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

const ENGLISH_EVENT_EXPRESSIONS: Record<CricketSpeechEvent, string[]> = {
  six: [
    "WHAT A MASSIVE SIX! Right into the crowd, that is huge!",
    "THAT IS ENORMOUS! Clears the rope with power, maximum!",
    "BOOM! Six runs! Clean strike sailing high into the stands!",
    "SPECTACULAR HIT! All the way for a sensational six!",
  ],
  four: [
    "FOUR RUNS! Cracking shot racing across the turf to the boundary!",
    "BEAUTIFULLY TIMED! Flashes through the covers for four!",
    "FOUR! Smashed away with perfection, finds the rope!",
    "PUNCHED AWAY! One bounce and over the boundary for four!",
  ],
  wicket: [
    "OUT! HE'S GONE! Timber! A massive breakthrough for the bowling side!",
    "WICKET! Up goes the finger! What a sensational delivery!",
    "CAUGHT! Gone! That is a huge dismissal, big celebration!",
    "CLEAN BOWLED! Stumps shattered, what a crucial wicket!",
  ],
  dot: [
    "Dot ball. Beaten outside off, tight bowling under pressure.",
    "No run. Defended solidly back down the track.",
    "Dot ball. Well bowled, keeping the pressure high.",
  ],
  run1: [
    "One run. Pushed into the gap, quick single taken.",
    "Sharp single taken, good rotation of strike.",
    "Tucked off the hips for a comfortable single.",
  ],
  run2: [
    "Two runs! Excellent running between the wickets.",
    "They push hard and comfortably complete the second.",
    "Driven into the deep, good hustle for two runs.",
  ],
  run3: [
    "Three runs! Outstanding hustle in the deep.",
    "Superb athletic running, they turn two into three!",
  ],
  wide: [
    "Wide ball! Straying down the leg side, extra run conceded.",
    "Wide called by the umpire. Outside the tramlines.",
  ],
  noBall: [
    "NO BALL! The bowler oversteps the crease! Free hit coming next!",
    "Overstepped, it's a no ball! Free hit signaled!",
  ],
};

const ENGLISH_EVENT_PROSODY: Record<CricketSpeechEvent, { rate: number; pitch: number; crowdVolume: number }> = {
  six: { rate: 1.08, pitch: 1.18, crowdVolume: 0.02 },
  four: { rate: 1.08, pitch: 1.12, crowdVolume: 0.03 },
  wicket: { rate: 1.12, pitch: 1.22, crowdVolume: 0.02 },
  dot: { rate: 1.02, pitch: 0.98, crowdVolume: 0.06 },
  run1: { rate: 1.05, pitch: 1.02, crowdVolume: 0.05 },
  run2: { rate: 1.06, pitch: 1.04, crowdVolume: 0.045 },
  run3: { rate: 1.08, pitch: 1.08, crowdVolume: 0.04 },
  wide: { rate: 1.06, pitch: 1.1, crowdVolume: 0.045 },
  noBall: { rate: 1.1, pitch: 1.18, crowdVolume: 0.04 },
};

export function broadcastEventVocalCue(
  event: CricketSpeechEvent,
  sequence = 0,
  preferEnglish = false,
): { text: string; rate: number; pitch: number; crowdVolume: number; lang: string } {
  if (preferEnglish) {
    const list = ENGLISH_EVENT_EXPRESSIONS[event];
    const index = Math.abs(sequence) % list.length;
    return {
      text: list[index],
      ...ENGLISH_EVENT_PROSODY[event],
      lang: "en-US",
    };
  }
  const nepaliCue = nepaliEventSpeechCue(event, sequence);
  return {
    ...nepaliCue,
    lang: "ne-NP",
  };
}

