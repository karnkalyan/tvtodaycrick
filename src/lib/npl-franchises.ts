/**
 * Canonical Nepal Premier League (NPL) franchise brand specifications.
 * Reflects authentic team crests, official logos, brand primary/secondary colors,
 * slogans, and identity systems.
 */

export interface FranchiseBrand {
  name: string;
  code: string;
  shortName: string;
  city: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  softColor: string;
  textColor: string;
  themeName: string;
  slogan: string;
  website: string;
  logoFallback: string;
  ownerName: string;
}

export const NPL_FRANCHISE_BRANDS: Record<string, FranchiseBrand> = {
  "Kathmandu Gurkhas": {
    name: "Kathmandu Gurkhas",
    code: "KAG",
    shortName: "KG",
    city: "Kathmandu",
    primaryColor: "#101418", // Broadcast black from the Gurkhas identity
    secondaryColor: "#10B8B0", // Kit cyan / teal
    accentColor: "#F3CF52", // Shoulder gold accent
    softColor: "#123D40",
    textColor: "#FFFFFF",
    themeName: "Gurkha Black & Cyan",
    slogan: "Courage, Honor, Glory",
    website: "https://kathmandugurkhas.com/",
    logoFallback: "https://kathmandugurkhas.com/images/logo.png",
    ownerName: "Kathmandu Sports Development Venture",
  },
  "Janakpur Bolts": {
    name: "Janakpur Bolts",
    code: "JAB",
    shortName: "JB",
    city: "Janakpur",
    primaryColor: "#F20B78", // Hot pink match jersey
    secondaryColor: "#102A5C", // Deep bolt blue
    accentColor: "#F6C916", // Collar lightning yellow
    softColor: "#5B123F",
    textColor: "#FFFFFF",
    themeName: "Bolts Pink & Blue",
    slogan: "Strike with Speed",
    website: "https://boltsjanakpur.com/",
    logoFallback: "https://boltsjanakpur.com/assets/logo.png",
    ownerName: "Dream Sports",
  },
  "Chitwan Rhinos": {
    name: "Chitwan Rhinos",
    code: "CHR",
    shortName: "CR",
    city: "Chitwan",
    primaryColor: "#4A241A", // Deep rhino brown
    secondaryColor: "#F16B2B", // Kit orange
    accentColor: "#F5B18B", // Warm orange highlight
    softColor: "#241A18",
    textColor: "#FFFFFF",
    themeName: "Rhinos Deep Brown & Orange",
    slogan: "Charge Together",
    website: "https://www.chitwanrhinos.com/",
    logoFallback: "https://www.chitwanrhinos.com/images/logo.png",
    ownerName: "Chitwan Medical College",
  },
  "Karnali Yaks": {
    name: "Karnali Yaks",
    code: "KAY",
    shortName: "KY",
    city: "Karnali",
    primaryColor: "#123E8A", // Royal blue match jersey
    secondaryColor: "#F05A45", // Coral sleeve accent
    accentColor: "#D8B85A", // Crest gold
    softColor: "#172B58",
    textColor: "#FFFFFF",
    themeName: "Yaks Royal Blue & Coral",
    slogan: "Built for Altitude",
    website: "https://karnaliyaks.com/",
    logoFallback: "https://karnaliyaks.com/logo.png",
    ownerName: "Himalayan Builders",
  },
  "Lumbini Lions": {
    name: "Lumbini Lions",
    code: "LUL",
    shortName: "LL",
    city: "Lumbini",
    primaryColor: "#F04422", // Lion orange-red kit
    secondaryColor: "#E7B747", // Royal lion gold
    accentColor: "#FFB04A", // Warm orange highlight
    softColor: "#6E2018",
    textColor: "#FFFFFF",
    themeName: "Lions Orange & Gold",
    slogan: "Roar for Every Run",
    website: "https://www.lumbinilions.com.np/",
    logoFallback: "https://www.lumbinilions.com.np/logo.png",
    ownerName: "Fortuna Health Care",
  },
  "Pokhara Avengers": {
    name: "Pokhara Avengers",
    code: "POA",
    shortName: "PA",
    city: "Pokhara",
    primaryColor: "#6E202B", // Deep brown-red sleeves
    secondaryColor: "#E63739", // Avengers red body
    accentColor: "#FF8C76", // Coral edge highlight
    softColor: "#351319",
    textColor: "#FFFFFF",
    themeName: "Avengers Brown Red",
    slogan: "Attack from the First Ball",
    website: "https://www.pokharaavengers.com/",
    logoFallback: "https://www.pokharaavengers.com/images/logo.png",
    ownerName: "Nepal T20 Pvt Ltd",
  },
  "Biratnagar Kings": {
    name: "Biratnagar Kings",
    code: "BIK",
    shortName: "BK",
    city: "Biratnagar",
    primaryColor: "#123B7A", // Deep royal blue kit
    secondaryColor: "#F2C51C", // Monarch yellow
    accentColor: "#E8EEF9", // Frost Blue
    softColor: "#285EC4",
    textColor: "#FFFFFF",
    themeName: "Kings Royal Blue & Yellow",
    slogan: "Rule the Crease",
    website: "https://biratkings.com/",
    logoFallback: "https://biratkings.com/images/logo.png",
    ownerName: "MAD Dream Sports",
  },
  "Sudurpaschim Royals": {
    name: "Sudurpaschim Royals",
    code: "SPR",
    shortName: "SR",
    city: "Dhangadhi",
    primaryColor: "#F4C900", // Royal yellow match jersey
    secondaryColor: "#1547A8", // Blue kit piping
    accentColor: "#E95322", // Red-orange edge accent
    softColor: "#6B5900",
    textColor: "#111827",
    themeName: "Royals Yellow & Blue",
    slogan: "Play Royal. Finish Strong.",
    website: "https://sudurpaschimroyals.com/",
    logoFallback: "https://sudurpaschimroyals.com/assets/logo.png",
    ownerName: "Empire Sports",
  },
};

// Aliases lookup map (handles spelling variants like "Kathmandu Gorkhas" vs "Kathmandu Gurkhas")
const ALIAS_MAP: Record<string, string> = {
  "kathmandu gorkhas": "Kathmandu Gurkhas",
  "kathmandu gurkhas": "Kathmandu Gurkhas",
  "kag": "Kathmandu Gurkhas",
  "kg": "Kathmandu Gurkhas",
  "janakpur bolts": "Janakpur Bolts",
  "jab": "Janakpur Bolts",
  "jb": "Janakpur Bolts",
  "chitwan rhinos": "Chitwan Rhinos",
  "chr": "Chitwan Rhinos",
  "cr": "Chitwan Rhinos",
  "karnali yaks": "Karnali Yaks",
  "kay": "Karnali Yaks",
  "ky": "Karnali Yaks",
  "lumbini lions": "Lumbini Lions",
  "lul": "Lumbini Lions",
  "ll": "Lumbini Lions",
  "pokhara avengers": "Pokhara Avengers",
  "poa": "Pokhara Avengers",
  "pa": "Pokhara Avengers",
  "biratnagar kings": "Biratnagar Kings",
  "bik": "Biratnagar Kings",
  "bk": "Biratnagar Kings",
  "sudurpaschim royals": "Sudurpaschim Royals",
  "spr": "Sudurpaschim Royals",
  "sr": "Sudurpaschim Royals",
};

/**
 * Returns authentic franchise branding details by team name, code, or alias.
 */
export function getFranchiseBrand(nameOrCode?: string | null): FranchiseBrand {
  if (!nameOrCode) {
    return NPL_FRANCHISE_BRANDS["Kathmandu Gurkhas"];
  }

  const cleaned = nameOrCode.trim().toLowerCase();

  // Direct alias match
  if (ALIAS_MAP[cleaned] && NPL_FRANCHISE_BRANDS[ALIAS_MAP[cleaned]]) {
    return NPL_FRANCHISE_BRANDS[ALIAS_MAP[cleaned]];
  }

  // Substring match
  for (const [key, canonical] of Object.entries(ALIAS_MAP)) {
    if (cleaned.includes(key) || key.includes(cleaned)) {
      return NPL_FRANCHISE_BRANDS[canonical];
    }
  }

  // Exact key in dictionary
  if (NPL_FRANCHISE_BRANDS[nameOrCode]) {
    return NPL_FRANCHISE_BRANDS[nameOrCode];
  }

  // Fallback defaults
  return {
    name: nameOrCode,
    code: nameOrCode.slice(0, 3).toUpperCase(),
    shortName: nameOrCode.slice(0, 2).toUpperCase(),
    city: "Nepal",
    primaryColor: "#1E293B",
    secondaryColor: "#D7AA3D",
    accentColor: "#F1F5F9",
    softColor: "#334155",
    textColor: "#FFFFFF",
    themeName: "NPL Team",
    slogan: "Nepal Premier League",
    website: "",
    logoFallback: "",
    ownerName: "Franchise Ownership",
  };
}

export const ALL_NPL_TEAMS = Object.values(NPL_FRANCHISE_BRANDS);
