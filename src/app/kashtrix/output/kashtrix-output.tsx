"use client";

import {
  CircleDot,
  Clock3,
  Gauge,
  MapPin,
  Radio,
  Shield,
  Sparkles,
  Target,
  UserRound,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { broadcastEventVocalCue } from "@/lib/nepali-tts";
import { playCricketSfx, unlockAudioContext } from "@/lib/cricket-sfx";
import styles from "./output.module.css";

type BroadcastState = {
  match?: {
    teamA?: string;
    teamB?: string;
    teamAName?: string;
    teamBName?: string;
    inningsNumber?: number;
  };
  score?: {
    runs?: number;
    wickets?: number;
    overs?: string;
    recent?: string[];
    target?: number | null;
  };
  live?: {
    innings?: string;
    rateText?: string;
    strikerName?: string;
    strikerRuns?: string;
    strikerBalls?: string;
    nonStrikerName?: string;
    nonStrikerRuns?: string;
    nonStrikerBalls?: string;
    bowlerName?: string;
    bowlerFigures?: string;
    bowlerOvers?: string;
    requirement?: string;
    matchLabel?: string;
    venue?: string;
    tossText?: string;
    target?: string | number;
  };
};

type NplPlayer = {
  name: string;
  displayName: string;
  role?: string;
  jerseyNumber?: number;
  imageUrl?: string;
};

type NplTeam = {
  code: string;
  name: string;
  slug: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  players: NplPlayer[];
};

type DeliveryEvent =
  | "dot"
  | "run1"
  | "run2"
  | "run3"
  | "four"
  | "six"
  | "wicket"
  | "wide"
  | "noBall";

type EventPresentation = {
  kicker: string;
  title: string;
  detail: string;
  className: string;
  value: string;
};

const DEFAULT_STATE: BroadcastState = {
  match: { teamA: "LUL", teamB: "SPR", teamAName: "Lumbini Lions", teamBName: "Sudurpaschim Royals", inningsNumber: 1 },
  score: { runs: 0, wickets: 0, overs: "0.0", recent: ["-", "-", "-", "-", "-", "-"] },
  live: {
    innings: "MATCH SCHEDULED",
    rateText: "MATCH NOT STARTED",
    strikerName: "BATTER",
    strikerRuns: "0",
    strikerBalls: "0",
    nonStrikerName: "NON-STRIKER",
    nonStrikerRuns: "0",
    nonStrikerBalls: "0",
    bowlerName: "BOWLER",
    bowlerFigures: "0/0",
    bowlerOvers: "0.0",
    requirement: "MATCH SCHEDULED",
    matchLabel: "NEPAL PREMIER LEAGUE",
    venue: "TU INTERNATIONAL CRICKET GROUND, KIRTIPUR",
    tossText: "TOSS NOT YET RECORDED",
    target: "-",
  },
};

const TEAM_FALLBACKS: Record<string, { name: string; primary: string; secondary: string; slug: string }> = {
  KAG: { name: "Kathmandu Gurkhas", primary: "#101418", secondary: "#10b8b0", slug: "kathmandu-gurkhas" },
  JAB: { name: "Janakpur Bolts", primary: "#f20b78", secondary: "#102a5c", slug: "janakpur-bolts" },
  CHR: { name: "Chitwan Rhinos", primary: "#4a241a", secondary: "#f16b2b", slug: "chitwan-rhinos" },
  KAY: { name: "Karnali Yaks", primary: "#123e8a", secondary: "#f05a45", slug: "karnali-yaks" },
  LUL: { name: "Lumbini Lions", primary: "#f04422", secondary: "#e7b747", slug: "lumbini-lions" },
  POA: { name: "Pokhara Avengers", primary: "#6e202b", secondary: "#e63739", slug: "pokhara-avengers" },
  BIK: { name: "Biratnagar Kings", primary: "#123b7a", secondary: "#f2c51c", slug: "biratnagar-kings" },
  SPR: { name: "Sudurpaschim Royals", primary: "#f4c900", secondary: "#1547a8", slug: "sudurpaschim-royals" },
};

const EVENTS: Record<DeliveryEvent, EventPresentation> = {
  dot: { kicker: "PRESSURE BALL", title: "DOT BALL", detail: "No run scored", className: "dot", value: "0" },
  run1: { kicker: "ROTATE THE STRIKE", title: "ONE RUN", detail: "Sharp running between the wickets", className: "run", value: "1" },
  run2: { kicker: "GOOD RUNNING", title: "TWO RUNS", detail: "Comfortably back for the second", className: "run", value: "2" },
  run3: { kicker: "EXCELLENT RUNNING", title: "THREE RUNS", detail: "All the way back for three", className: "run", value: "3" },
  four: { kicker: "FINDS THE ROPE", title: "FOUR", detail: "Timed beautifully to the boundary", className: "four", value: "4" },
  six: { kicker: "INTO THE STANDS", title: "SIX", detail: "Maximum — clean and powerful", className: "six", value: "6" },
  wicket: { kicker: "BREAKTHROUGH", title: "WICKET", detail: "The bowling side strikes", className: "wicket", value: "W" },
  wide: { kicker: "EXTRA RUN", title: "WIDE", detail: "Outside the batter's reach", className: "wide", value: "WD" },
  noBall: { kicker: "OVERSTEPPED", title: "NO BALL", detail: "Free hit coming next", className: "noBall", value: "NB" },
};

const TOKEN_EVENT: Record<string, DeliveryEvent> = {
  "0": "dot", "1": "run1", "2": "run2", "3": "run3", "4": "four", "6": "six", W: "wicket", WD: "wide", NB: "noBall",
};

function mergeState(current: BroadcastState, incoming?: BroadcastState | null): BroadcastState {
  if (!incoming) return current;
  const isReset =
    incoming.score &&
    Number(incoming.score.runs ?? 0) === 0 &&
    Number(incoming.score.wickets ?? 0) === 0 &&
    (incoming.score.overs === "0.0" || incoming.score.overs === "0");
  const resetLiveOverrides = isReset
    ? {
        strikerRuns: "0",
        strikerBalls: "0",
        nonStrikerRuns: "0",
        nonStrikerBalls: "0",
        bowlerFigures: "0/0",
        bowlerOvers: "0.0",
        rateText: "MATCH NOT STARTED",
      }
    : {};
  return {
    ...current,
    ...incoming,
    match: { ...current.match, ...incoming.match },
    score: { ...current.score, ...incoming.score },
    live: { ...current.live, ...resetLiveOverrides, ...incoming.live },
  };
}

function websocketUrl() {
  const configured = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (configured) return configured;
  const secure = window.location.protocol === "https:";
  if (secure) return `wss://${window.location.host}/ws`;
  const port = window.location.port === "3211" ? "3212" : window.location.port === "3000" ? "3001" : "3212";
  return `ws://${window.location.hostname || "localhost"}:${port}`;
}

function normalizeEvent(value: unknown): DeliveryEvent | null {
  const normalized = String(value || "").replace(/[-_\s]/g, "").toLowerCase();
  const map: Record<string, DeliveryEvent> = {
    dot: "dot", run1: "run1", one: "run1", run2: "run2", two: "run2", run3: "run3", three: "run3",
    four: "four", six: "six", wicket: "wicket", wide: "wide", noball: "noBall", nb: "noBall",
  };
  return map[normalized] || null;
}

function initials(name?: string) {
  return (name || "PLAYER").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function rate(runs: number, overs: string) {
  const [whole, part] = String(overs || "0.0").split(".").map(Number);
  const balls = (whole || 0) * 6 + (part || 0);
  return balls ? (runs * 6 / balls).toFixed(2) : "0.00";
}

function ImageWithFallback({ src, alt, className, fallback }: { src?: string | string[]; alt: string; className: string; fallback: React.ReactNode }) {
  const sources = Array.isArray(src) ? src.filter(Boolean) : src ? [src] : [];
  const sourceKey = sources.join("|");
  const [sourceIndex, setSourceIndex] = useState(0);
  useEffect(() => setSourceIndex(0), [sourceKey]);
  if (!sources[sourceIndex]) return <div className={className}>{fallback}</div>;
  return <img className={className} src={sources[sourceIndex]} alt={alt} onError={() => setSourceIndex((index) => index + 1)} />;
}

function playerImageSources(team: { slug: string }, player: NplPlayer | undefined, name?: string) {
  const playerSlug = String(name || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return Array.from(new Set([
    player?.imageUrl,
    playerSlug ? `/images/teams/${team.slug}/players/${playerSlug}.webp` : undefined,
    playerSlug ? `/images/teams/${team.slug}/players/${playerSlug}.png` : undefined,
  ].filter((value): value is string => Boolean(value))));
}

export default function KashtrixOutput({ variant = "arena" }: { variant?: "arena" | "editorial" }) {
  const [state, setState] = useState<BroadcastState>(DEFAULT_STATE);
  const [teams, setTeams] = useState<NplTeam[]>([]);
  const [connected, setConnected] = useState(false);
  const [event, setEvent] = useState<{ type: DeliveryEvent; key: number } | null>(null);
  const eventTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEvent = useRef({ type: "" as string, at: 0 });
  const connectedRef = useRef(false);
  const stateRef = useRef(state);
  const pollReady = useRef(false);
  const crowdAudio = useRef<HTMLAudioElement | null>(null);
  const announcementSequence = useRef(0);

  useEffect(() => { stateRef.current = state; }, [state]);

  const announceEvent = useCallback((type: DeliveryEvent) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const voices = window.speechSynthesis.getVoices();
    const voicePriority = ["ne-np", "ne", "hi-in", "hi", "mr-in", "mr"];
    const indicVoice = voicePriority
      .map((language) => voices.find((voice) => voice.lang.toLowerCase() === language || voice.lang.toLowerCase().startsWith(`${language}-`)))
      .find(Boolean) || null;

    // Bold expressions: use Indic voice if available, otherwise bold punchy English broadcast commentary
    const cue = broadcastEventVocalCue(type, announcementSequence.current++, !indicVoice);
    const utterance = new SpeechSynthesisUtterance(cue.text);

    if (indicVoice) {
      utterance.voice = indicVoice;
      utterance.lang = indicVoice.lang;
    } else {
      utterance.voice = voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) || null;
      utterance.lang = utterance.voice?.lang || "en-US";
    }

    utterance.rate = cue.rate;
    utterance.pitch = cue.pitch;
    utterance.volume = 1;

    const restoreCrowd = () => { if (crowdAudio.current) crowdAudio.current.volume = 0.22; };
    if (crowdAudio.current) crowdAudio.current.volume = cue.crowdVolume;
    utterance.onend = restoreCrowd;
    utterance.onerror = restoreCrowd;
    window.speechSynthesis.speak(utterance);
  }, []);

  const playEvent = useCallback((type: DeliveryEvent) => {
    const now = Date.now();
    if (lastEvent.current.type === type && now - lastEvent.current.at < 1200) return;
    lastEvent.current = { type, at: now };
    if (eventTimer.current) clearTimeout(eventTimer.current);
    setEvent({ type, key: now });

    // 1. Synthesize bold, distinctive broadcast stadium sound effect
    playCricketSfx(type);

    // 2. Announce energetic vocal commentary
    announceEvent(type);

    const major = type === "six" || type === "four" || type === "wicket";
    eventTimer.current = setTimeout(() => setEvent(null), major ? 3300 : 2500);
  }, [announceEvent]);

  // Default enable audio: starts automatically and unlocks seamlessly without visual prompt
  useEffect(() => {
    const audio = crowdAudio.current;
    if (audio) {
      audio.muted = false;
      audio.volume = 0.22;
      void audio.play().catch(() => {});
    }

    const unlock = () => {
      unlockAudioContext();
      if (crowdAudio.current) {
        crowdAudio.current.muted = false;
        void crowdAudio.current.play().catch(() => {});
      }
    };

    const resumeVisible = () => { if (!document.hidden) unlock(); };

    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock, { passive: true });
    window.addEventListener("click", unlock, { passive: true });
    window.addEventListener("touchstart", unlock, { passive: true });
    document.addEventListener("visibilitychange", resumeVisible);

    return () => {
      document.removeEventListener("visibilitychange", resumeVisible);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("click", unlock);
      window.removeEventListener("touchstart", unlock);
      audio?.pause();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const applyIncomingState = useCallback((incoming?: BroadcastState | null, inferDelivery = false) => {
    if (!incoming) {
      stateRef.current = DEFAULT_STATE;
      setState(DEFAULT_STATE);
      return;
    }
    const previous = stateRef.current;

    const inRuns = Number(incoming.score?.runs ?? 0);
    const inWickets = Number(incoming.score?.wickets ?? 0);
    const inOvers = String(incoming.score?.overs ?? "0.0");
    const isResetIncoming = inRuns === 0 && inWickets === 0 && (inOvers === "0.0" || inOvers === "0");
    const hadPreviousData = Number(previous.score?.runs ?? 0) > 0 || Number(previous.score?.wickets ?? 0) > 0 || (previous.score?.overs && previous.score.overs !== "0.0");

    // Clean game reset detection: wipe previous match numbers and player cards
    if (isResetIncoming && hadPreviousData) {
      const cleanReset: BroadcastState = {
        ...DEFAULT_STATE,
        match: { ...DEFAULT_STATE.match, ...(incoming.match || {}) },
        score: { runs: 0, wickets: 0, overs: "0.0", recent: ["-", "-", "-", "-", "-", "-"] },
        live: {
          ...DEFAULT_STATE.live,
          ...(incoming.live || {}),
          strikerRuns: "0",
          strikerBalls: "0",
          nonStrikerRuns: "0",
          nonStrikerBalls: "0",
          bowlerFigures: "0/0",
          bowlerOvers: "0.0",
          rateText: "MATCH NOT STARTED",
        },
      };
      stateRef.current = cleanReset;
      setState(cleanReset);
      pollReady.current = true;
      return;
    }

    if (inferDelivery && pollReady.current && !connectedRef.current && !isResetIncoming) {
      const oldRecent = previous.score?.recent || [];
      const nextRecent = incoming.score?.recent || [];
      const changed = JSON.stringify(oldRecent) !== JSON.stringify(nextRecent);
      if (changed && nextRecent.length) {
        const inferred = TOKEN_EVENT[nextRecent[nextRecent.length - 1]];
        if (inferred) playEvent(inferred);
      } else if (Number(incoming.score?.wickets || 0) > Number(previous.score?.wickets || 0)) {
        playEvent("wicket");
      } else {
        const runDelta = Number(incoming.score?.runs || 0) - Number(previous.score?.runs || 0);
        const oversChanged = incoming.score?.overs !== previous.score?.overs;
        const inferred = runDelta === 6 ? "six" : runDelta === 4 ? "four" : runDelta === 3 ? "run3" : runDelta === 2 ? "run2" : runDelta === 1 && oversChanged ? "run1" : runDelta === 1 ? "wide" : null;
        if (inferred) playEvent(inferred);
      }
    }
    const merged = mergeState(previous, incoming);
    stateRef.current = merged;
    setState(merged);
    pollReady.current = true;
  }, [playEvent]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [stateResponse, dataResponse] = await Promise.all([
          fetch("/api/broadcast/state", { cache: "no-store" }),
          fetch("/api/broadcast/npl-data", { cache: "no-store" }),
        ]);
        if (!cancelled && stateResponse.ok) {
          const payload = await stateResponse.json();
          if (payload.isReset || !payload.state) {
            const clean = payload.state ? mergeState(DEFAULT_STATE, payload.state) : DEFAULT_STATE;
            stateRef.current = clean;
            setState(clean);
          } else {
            applyIncomingState(payload.state, false);
          }
        }
        if (!cancelled && dataResponse.ok) {
          const payload = await dataResponse.json();
          setTeams(Array.isArray(payload.teams) ? payload.teams : []);
        }
      } catch { /* The fixed fallback state remains visible. */ }
    };
    load();
    return () => { cancelled = true; };
  }, [applyIncomingState]);

  // Listen to cross-tab BroadcastChannel for instant match resets
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("npl-gfx-v8-cues");
      channel.onmessage = (e) => {
        const msg = e.data;
        if (!msg) return;
        const action = msg.action || msg.type;
        if (action === "reset" || action === "resetMatch" || action === "clearMatch") {
          const resetState = msg.state ? mergeState(DEFAULT_STATE, msg.state) : DEFAULT_STATE;
          stateRef.current = resetState;
          setState(resetState);
        }
      };
    } catch {}
    return () => { channel?.close(); };
  }, []);

  useEffect(() => {
    let active = true;
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    const connect = () => {
      if (!active) return;
      try {
        socket = new WebSocket(websocketUrl());
        socket.onopen = () => {
          connectedRef.current = true;
          setConnected(true);
        };
        socket.onmessage = (message) => {
          try {
            const packet = JSON.parse(message.data);
            const action = packet.action || packet.type;
            if (action === "reset" || action === "resetMatch" || action === "clearMatch") {
              const resetState = packet.state ? mergeState(DEFAULT_STATE, packet.state) : DEFAULT_STATE;
              stateRef.current = resetState;
              setState(resetState);
              return;
            }
            if (action === "init" && packet.state) applyIncomingState(packet.state, false);
            if (action === "action") {
              const type = normalizeEvent(packet.name || packet.data?.name);
              if (type) playEvent(type);
            }
            if (action === "stinger") {
              const type = normalizeEvent(packet.event || packet.data?.event);
              if (type) playEvent(type);
            }
            if (action === "scoreUpdate") applyIncomingState({ score: packet.data || packet.payload }, false);
            if (action === "updateData" || action === "dataUpdated") applyIncomingState(packet.payload || packet.data, false);
          } catch { /* Ignore malformed broadcast packets. */ }
        };
        socket.onclose = () => {
          connectedRef.current = false;
          setConnected(false);
          if (active) retry = setTimeout(connect, 2000);
        };
        socket.onerror = () => socket?.close();
      } catch {
        retry = setTimeout(connect, 3000);
      }
    };
    connect();
    return () => {
      active = false;
      if (retry) clearTimeout(retry);
      socket?.close();
    };
  }, [applyIncomingState, playEvent]);

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const response = await fetch("/api/broadcast/state", { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        if (payload.isReset || !payload.state) {
          const clean = payload.state ? mergeState(DEFAULT_STATE, payload.state) : DEFAULT_STATE;
          stateRef.current = clean;
          setState(clean);
        } else {
          applyIncomingState(payload.state, true);
        }
      } catch { /* WebSocket or the last persisted state continues to render. */ }
    }, 1500);
    return () => clearInterval(timer);
  }, [applyIncomingState]);

  useEffect(() => () => { if (eventTimer.current) clearTimeout(eventTimer.current); }, []);

  const teamCodeA = String(state.match?.teamA || "LUL").toUpperCase();
  const teamCodeB = String(state.match?.teamB || "SPR").toUpperCase();
  const getTeam = (code: string) => teams.find((team) => team.code === code);
  const dataA = getTeam(teamCodeA);
  const dataB = getTeam(teamCodeB);
  const fallbackA = TEAM_FALLBACKS[teamCodeA] || TEAM_FALLBACKS.LUL;
  const fallbackB = TEAM_FALLBACKS[teamCodeB] || TEAM_FALLBACKS.SPR;
  const teamA = {
    code: teamCodeA, name: state.match?.teamAName || dataA?.name || fallbackA.name,
    primary: dataA?.primaryColor || fallbackA.primary, secondary: dataA?.secondaryColor || fallbackA.secondary,
    logo: dataA?.logoUrl || `/images/teams/${fallbackA.slug}/logo.png`, slug: dataA?.slug || fallbackA.slug, players: dataA?.players || [],
  };
  const teamB = {
    code: teamCodeB, name: state.match?.teamBName || dataB?.name || fallbackB.name,
    primary: dataB?.primaryColor || fallbackB.primary, secondary: dataB?.secondaryColor || fallbackB.secondary,
    logo: dataB?.logoUrl || `/images/teams/${fallbackB.slug}/logo.png`, slug: dataB?.slug || fallbackB.slug, players: dataB?.players || [],
  };
  const findPlayer = (team: typeof teamA, name?: string) => team.players.find((player) => player.name === name || player.displayName.toUpperCase() === String(name || "").toUpperCase());
  const striker = findPlayer(teamA, state.live?.strikerName);
  const nonStriker = findPlayer(teamA, state.live?.nonStrikerName);
  const bowler = findPlayer(teamB, state.live?.bowlerName);
  const runs = Number(state.score?.runs || 0);
  const wickets = Number(state.score?.wickets || 0);
  const overs = String(state.score?.overs || "0.0");
  const target = Number(state.score?.target || state.live?.target || 0);
  const required = target > 0 ? Math.max(0, target - runs) : null;
  const recent = state.score?.recent?.length ? state.score.recent : ["-", "-", "-", "-", "-", "-"];
  const presentation = event ? EVENTS[event.type] : null;
  const theme = useMemo(() => ({
    "--team-a": teamA.primary,
    "--team-a-accent": teamA.secondary,
    "--team-b": teamB.primary,
    "--team-b-accent": teamB.secondary,
  }) as React.CSSProperties, [teamA.primary, teamA.secondary, teamB.primary, teamB.secondary]);

  const audioBed = <audio ref={crowdAudio} src="/audio/kashtrix/stadium-crowd.ogg" autoPlay loop preload="auto" playsInline aria-hidden="true" />;

  if (variant === "editorial") {
    return (
      <main className={styles.editorialOutput} style={theme}>
        {audioBed}
        <div className={styles.editorialTexture} aria-hidden="true" />
        <div className={styles.editorialPitch} aria-hidden="true"><i /><i /><i /><b /><b /></div>
        <header className={styles.editorialHeader}>
          <div className={styles.editorialBrand}>
            <img src="/images/npl-logo.png" alt="Nepal Premier League" className={styles.nplBrandLogo} />
            <div><small>NEPAL PREMIER LEAGUE</small><strong>KASHTRIX MATCHBOARD</strong></div>
          </div>
          <div className={styles.editorialInnings}>{state.live?.innings || "MATCH SCHEDULED"}</div>
          <div className={styles.editorialLive}><i className={connected ? styles.connected : undefined} /> {connected ? "LIVE" : "SYNCING"} <Radio /></div>
        </header>

        <section className={styles.editorialTeams}>
          <div className={styles.editorialTeamA}><ImageWithFallback src={teamA.logo} alt={`${teamA.name} crest`} className={styles.editorialLogo} fallback={<Shield />} /><span>BATTING · {teamA.code}</span><strong>{teamA.name}</strong></div>
          <div className={styles.editorialVersus}>MATCH<br />CENTRE</div>
          <div className={styles.editorialTeamB}><span>BOWLING · {teamB.code}</span><strong>{teamB.name}</strong><ImageWithFallback src={teamB.logo} alt={`${teamB.name} crest`} className={styles.editorialLogo} fallback={<Shield />} /></div>
        </section>

        <section className={`${styles.editorialPlayer} ${styles.editorialBatter}`}>
          <div className={styles.editorialPlayerNumber}>01</div>
          <ImageWithFallback src={playerImageSources(teamA, striker, state.live?.strikerName)} alt={state.live?.strikerName || "Striker"} className={styles.editorialPlayerImage} fallback={<div className={styles.editorialFallback}><UserRound /><b>{initials(state.live?.strikerName)}</b></div>} />
          <div className={styles.editorialPlayerCopy}><span><Zap /> ON STRIKE</span><strong>{state.live?.strikerName || "BATTER"}</strong><small>{striker?.role?.replace(/_/g, " ") || "BATTER"}</small><div><b>{state.live?.strikerRuns || "0"}<em>RUNS</em></b><b>{state.live?.strikerBalls || "0"}<em>BALLS</em></b></div></div>
        </section>

        <section className={styles.editorialScore}>
          <div className={styles.editorialScoreLabel}><CircleDot /> LIVE SCORE <b>{teamA.code}</b></div>
          <div className={styles.editorialScoreValue}><strong>{runs}</strong><span>/</span><b>{wickets}</b></div>
          <div className={styles.editorialOvers}>{overs} <span>OVERS</span></div>
          <div className={styles.editorialMetrics}><StatPill icon={<Gauge />} label="CRR" value={rate(runs, overs)} /><StatPill icon={<Target />} label={target > 0 ? "TARGET" : "INN"} value={target > 0 ? String(target) : String(state.match?.inningsNumber || 1)} /><StatPill icon={<Zap />} label={required !== null ? "NEED" : "IN HAND"} value={required !== null ? String(required) : String(Math.max(0, 10 - wickets))} /></div>
          <div className={styles.editorialRecent}><span>THIS OVER</span><div>{recent.slice(-8).map((ball, index) => <Ball key={`${ball}-${index}`} value={ball} index={index} />)}</div></div>
        </section>

        <section className={`${styles.editorialPlayer} ${styles.editorialBowler}`}>
          <div className={styles.editorialPlayerNumber}>02</div>
          <ImageWithFallback src={playerImageSources(teamB, bowler, state.live?.bowlerName)} alt={state.live?.bowlerName || "Bowler"} className={styles.editorialPlayerImage} fallback={<div className={styles.editorialFallback}><UserRound /><b>{initials(state.live?.bowlerName)}</b></div>} />
          <div className={styles.editorialPlayerCopy}><span><CircleDot /> CURRENT BOWLER</span><strong>{state.live?.bowlerName || "BOWLER"}</strong><small>{bowler?.role?.replace(/_/g, " ") || "BOWLER"}</small><div><b>{state.live?.bowlerFigures || "0/0"}<em>FIGURES</em></b><b>{state.live?.bowlerOvers || "0.0"}<em>OVERS</em></b></div></div>
        </section>

        <section className={styles.editorialTicker}>
          <div><span>NON-STRIKER</span><strong>{state.live?.nonStrikerName || "NON-STRIKER"} · {state.live?.nonStrikerRuns || "0"} ({state.live?.nonStrikerBalls || "0"})</strong></div>
          <div><span>MATCH EQUATION</span><strong>{state.live?.requirement || "MATCH SCHEDULED"}</strong></div>
          <div><span>MATCH PULSE</span><strong>{state.live?.rateText || `CRR ${rate(runs, overs)}`}</strong></div>
        </section>
        <footer className={styles.editorialFooter}><span><MapPin /> {state.live?.venue || "TU INTERNATIONAL CRICKET GROUND"}</span><span><Clock3 /> {state.live?.tossText || "TOSS NOT YET RECORDED"}</span><b>NPL 2026</b></footer>
        <EventStinger event={event} presentation={presentation} team={teamA} runs={runs} wickets={wickets} overs={overs} />
      </main>
    );
  }

  return (
    <main className={styles.output} style={theme}>
      {audioBed}
      <div className={styles.virtualSet} aria-hidden="true" />
      <div className={styles.setShade} aria-hidden="true" />
      <div className={styles.lightBeams} aria-hidden="true"><i /><i /><i /></div>

      <header className={styles.topBar}>
        <div className={styles.brandLockup}>
          <img src="/images/npl-logo.png" alt="Nepal Premier League" className={styles.nplBrandLogoArena} />
          <div><small>NEPAL PREMIER LEAGUE</small><strong>KASHTRIX VIRTUAL ARENA</strong></div>
        </div>
        <div className={styles.matchIdentity}>
          <span>{state.live?.matchLabel || "NEPAL PREMIER LEAGUE"}</span>
          <strong>{state.live?.innings || "MATCH SCHEDULED"}</strong>
        </div>
        <div className={styles.liveState}>
          <i className={connected ? styles.connected : undefined} />
          <div><small>{connected ? "LIVE DATA" : "SYNCING"}</small><strong>ON AIR</strong></div>
          <Radio size={21} />
        </div>
      </header>

      <section className={styles.teamFlagLeft}>
        <ImageWithFallback src={teamA.logo} alt={`${teamA.name} crest`} className={styles.flagLogo} fallback={<Shield size={50} />} />
        <div><span>BATTING</span><strong>{teamA.name}</strong></div>
      </section>
      <section className={styles.teamFlagRight}>
        <div><span>BOWLING</span><strong>{teamB.name}</strong></div>
        <ImageWithFallback src={teamB.logo} alt={`${teamB.name} crest`} className={styles.flagLogo} fallback={<Shield size={50} />} />
      </section>

      <section className={styles.scorePod}>
        <div className={styles.scorePodTop}><span><CircleDot size={14} /> LIVE SCORE</span><b>{teamA.code}</b></div>
        <div className={styles.scoreValue}><strong>{runs}</strong><i>/</i><b>{wickets}</b></div>
        <div className={styles.overs}><strong>{overs}</strong><span>OVERS</span></div>
        <div className={styles.scoreMetrics}>
          <StatPill icon={<Gauge />} label="CRR" value={rate(runs, overs)} />
          <StatPill icon={<Target />} label={target > 0 ? "TARGET" : "INN"} value={target > 0 ? String(target) : String(state.match?.inningsNumber || 1)} />
          <StatPill icon={<Zap />} label={required !== null ? "NEED" : "IN HAND"} value={required !== null ? String(required) : String(Math.max(0, 10 - wickets))} />
        </div>
      </section>

      <section className={`${styles.heroPlayer} ${styles.strikerStage}`}>
        <div className={styles.playerAura} />
        <ImageWithFallback src={playerImageSources(teamA, striker, state.live?.strikerName)} alt={state.live?.strikerName || "Striker"} className={styles.heroPlayerImage} fallback={<div className={styles.heroFallback}><span>{initials(state.live?.strikerName)}</span><UserRound size={82} /></div>} />
        <div className={styles.playerPlate}>
          <div className={styles.roleTag}><Zap size={13} fill="currentColor" /> ON STRIKE</div>
          <strong>{state.live?.strikerName || "BATTER"}</strong>
          <small>{striker?.role?.replace(/_/g, " ") || "BATTER"}</small>
          <div className={styles.heroStats}>
            <b>{state.live?.strikerRuns || "0"}<span>RUNS</span></b>
            <b>{state.live?.strikerBalls || "0"}<span>BALLS</span></b>
          </div>
        </div>
      </section>

      <section className={`${styles.heroPlayer} ${styles.bowlerStage}`}>
        <div className={styles.playerAura} />
        <ImageWithFallback src={playerImageSources(teamB, bowler, state.live?.bowlerName)} alt={state.live?.bowlerName || "Bowler"} className={styles.heroPlayerImage} fallback={<div className={styles.heroFallback}><span>{initials(state.live?.bowlerName)}</span><UserRound size={82} /></div>} />
        <div className={styles.playerPlate}>
          <div className={styles.roleTag}><CircleDot size={13} /> CURRENT BOWLER</div>
          <strong>{state.live?.bowlerName || "BOWLER"}</strong>
          <small>{bowler?.role?.replace(/_/g, " ") || "BOWLER"}</small>
          <div className={styles.heroStats}>
            <b>{state.live?.bowlerFigures || "0/0"}<span>FIGURES</span></b>
            <b>{state.live?.bowlerOvers || "0.0"}<span>OVERS</span></b>
          </div>
        </div>
      </section>

      <section className={styles.nonStrikerDock}>
        <div className={styles.miniPhotoWrap}>
          <ImageWithFallback src={playerImageSources(teamA, nonStriker, state.live?.nonStrikerName)} alt={state.live?.nonStrikerName || "Non-striker"} className={styles.miniPhoto} fallback={<span>{initials(state.live?.nonStrikerName)}</span>} />
        </div>
        <div className={styles.miniCopy}><span>NON-STRIKER</span><strong>{state.live?.nonStrikerName || "NON-STRIKER"}</strong></div>
        <div className={styles.miniScore}><b>{state.live?.nonStrikerRuns || "0"}</b><span>{state.live?.nonStrikerBalls || "0"} BALLS</span></div>
      </section>

      <div className={styles.floorMotion} aria-hidden="true">
        <div className={styles.floorOrbit}><i /></div>
        <div className={styles.deliveryBall} />
        <div className={styles.floorWickets}><i /><i /><i /><b /><b /></div>
        <div className={styles.pitchPulse}><i /><i /><i /></div>
      </div>

      <section className={styles.lowerDeck}>
        <div className={styles.equation}>
          <Target size={21} /><div><span>MATCH EQUATION</span><strong>{state.live?.requirement || "MATCH SCHEDULED"}</strong></div><Sparkles size={19} />
        </div>
        <div className={styles.overTrack}>
          <span>THIS OVER</span>
          <div className={styles.ballRail}>{recent.slice(-8).map((ball, index) => <Ball key={`${ball}-${index}`} value={ball} index={index} />)}</div>
        </div>
        <div className={styles.matchPulse}><span>MATCH PULSE</span><strong>{state.live?.rateText || `CRR ${rate(runs, overs)}`}</strong><div className={styles.wave}><i /><i /><i /><i /><i /></div></div>
      </section>

      <footer className={styles.footer}>
        <div><MapPin size={15} /><span>{state.live?.venue || "TU INTERNATIONAL CRICKET GROUND"}</span></div>
        <div><Clock3 size={15} /><span>{state.live?.tossText || "TOSS NOT YET RECORDED"}</span></div>
        <div><Shield size={15} /><span>NPL 2026</span></div>
      </footer>

      <EventStinger event={event} presentation={presentation} team={teamA} runs={runs} wickets={wickets} overs={overs} />
    </main>
  );
}

function EventStinger({ event, presentation, team, runs, wickets, overs }: { event: { type: DeliveryEvent; key: number } | null; presentation: EventPresentation | null; team: { logo: string; code: string }; runs: number; wickets: number; overs: string }) {
  if (!event || !presentation) return null;
  return <section key={event.key} className={`${styles.stinger} ${styles[presentation.className]}`} aria-live="assertive">
    <div className={styles.stingerBackdrop} /><div className={styles.stingerSweep} />
    <div className={styles.stingerRings}><i /><i /><i /></div>
    <div className={styles.flightPath}><span className={styles.cricketBall} /></div>
    <div className={styles.wicketRig}><i /><i /><i /><b /><b /></div>
    <div className={styles.stingerTeam}><ImageWithFallback src={team.logo} alt="" className={styles.stingerLogo} fallback={<Shield size={72} />} /><span>{team.code}</span></div>
    <div className={styles.stingerCopy}><span>{presentation.kicker}</span><div className={styles.stingerTitle}><b>{presentation.value}</b><h1>{presentation.title}</h1></div><p>{presentation.detail}</p><div className={styles.stingerScore}>{runs}/{wickets}<span>{overs} OVERS</span></div></div>
    <div className={styles.speedLines}>{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</div>
  </section>;
}

function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className={styles.statPill}><span>{icon}</span><small>{label}</small><strong>{value}</strong></div>;
}

function Ball({ value, index }: { value: string; index: number }) {
  const cls = value === "4" ? styles.ballFour : value === "6" ? styles.ballSix : value === "W" ? styles.ballWicket : /WD|NB/.test(value) ? styles.ballExtra : "";
  return <div className={`${styles.ball} ${cls}`} style={{ "--delay": `${index * 70}ms` } as React.CSSProperties}><span>{value}</span></div>;
}
