"use client";

import {
  Activity,
  CircleDot,
  Clock3,
  Gauge,
  MapPin,
  Radio,
  Shield,
  Sparkles,
  Swords,
  Target,
  Trophy,
  UserRound,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  return {
    ...current,
    ...incoming,
    match: { ...current.match, ...incoming.match },
    score: { ...current.score, ...incoming.score },
    live: { ...current.live, ...incoming.live },
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

function ImageWithFallback({ src, alt, className, fallback }: { src?: string; alt: string; className: string; fallback: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) return <div className={className}>{fallback}</div>;
  return <img className={className} src={src} alt={alt} onError={() => setFailed(true)} />;
}

export default function KashtrixOutput() {
  const [state, setState] = useState<BroadcastState>(DEFAULT_STATE);
  const [teams, setTeams] = useState<NplTeam[]>([]);
  const [connected, setConnected] = useState(false);
  const [event, setEvent] = useState<{ type: DeliveryEvent; key: number } | null>(null);
  const eventTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEvent = useRef({ type: "" as string, at: 0 });
  const connectedRef = useRef(false);
  const stateRef = useRef(state);
  const pollReady = useRef(false);

  useEffect(() => { stateRef.current = state; }, [state]);

  const playEvent = useCallback((type: DeliveryEvent) => {
    const now = Date.now();
    if (lastEvent.current.type === type && now - lastEvent.current.at < 1200) return;
    lastEvent.current = { type, at: now };
    if (eventTimer.current) clearTimeout(eventTimer.current);
    setEvent({ type, key: now });
    const major = type === "six" || type === "four" || type === "wicket";
    eventTimer.current = setTimeout(() => setEvent(null), major ? 3300 : 2500);
  }, []);

  const applyIncomingState = useCallback((incoming?: BroadcastState | null, inferDelivery = false) => {
    if (!incoming) return;
    const previous = stateRef.current;
    if (inferDelivery && pollReady.current && !connectedRef.current) {
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
          applyIncomingState(payload.state, false);
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
        applyIncomingState(payload.state, true);
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
    logo: dataA?.logoUrl || `/images/teams/${fallbackA.slug}/logo.png`, players: dataA?.players || [],
  };
  const teamB = {
    code: teamCodeB, name: state.match?.teamBName || dataB?.name || fallbackB.name,
    primary: dataB?.primaryColor || fallbackB.primary, secondary: dataB?.secondaryColor || fallbackB.secondary,
    logo: dataB?.logoUrl || `/images/teams/${fallbackB.slug}/logo.png`, players: dataB?.players || [],
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

  return (
    <main className={styles.output} style={theme}>
      <div className={styles.ambient} aria-hidden="true"><i /><i /><i /></div>
      <div className={styles.frame}>
        <header className={styles.header}>
          <div className={styles.brandLockup}>
            <div className={styles.brandMark}><Trophy size={28} strokeWidth={2.2} /></div>
            <div><span>NEPAL PREMIER LEAGUE</span><strong>KASHTRIX / LIVE CENTRE</strong></div>
          </div>
          <div className={styles.matchIdentity}>
            <span>{state.live?.matchLabel || "NEPAL PREMIER LEAGUE"}</span>
            <strong>{state.live?.innings || "MATCH SCHEDULED"}</strong>
          </div>
          <div className={styles.liveState}>
            <i className={connected ? styles.connected : undefined} />
            <div><span>{connected ? "LIVE DATA" : "SYNCING"}</span><strong>ON AIR</strong></div>
            <Radio size={24} />
          </div>
        </header>

        <section className={styles.heroScore}>
          <div className={styles.teamPanel}>
            <div className={styles.teamGlow} />
            <ImageWithFallback src={teamA.logo} alt={`${teamA.name} crest`} className={styles.teamLogo} fallback={<Shield size={62} />} />
            <div className={styles.teamCopy}><span>BATTING</span><strong>{teamA.name}</strong><b>{teamA.code}</b></div>
          </div>
          <div className={styles.scoreCore}>
            <div className={styles.scoreCaption}><Activity size={18} /><span>LIVE SCORE</span></div>
            <div className={styles.scoreValue}><strong>{runs}</strong><i>/</i><b>{wickets}</b></div>
            <div className={styles.overs}><span>{overs}</span> OVERS</div>
            <div className={styles.pulseLine}><i /><i /><i /><i /><i /></div>
          </div>
          <div className={`${styles.teamPanel} ${styles.teamPanelRight}`}>
            <div className={styles.teamGlow} />
            <div className={styles.teamCopy}><span>BOWLING</span><strong>{teamB.name}</strong><b>{teamB.code}</b></div>
            <ImageWithFallback src={teamB.logo} alt={`${teamB.name} crest`} className={styles.teamLogo} fallback={<Shield size={62} />} />
          </div>
        </section>

        <section className={styles.contentGrid}>
          <div className={styles.battingColumn}>
            <div className={styles.sectionHeading}><span><Swords size={17} /> AT THE CREASE</span><b>BATTERS</b></div>
            <PlayerCard
              featured name={state.live?.strikerName || "BATTER"} photo={striker?.imageUrl}
              label="ON STRIKE" primary={state.live?.strikerRuns || "0"} secondary={`${state.live?.strikerBalls || "0"} BALLS`}
              detail={striker?.role?.replace(/_/g, " ") || "BATTER"}
            />
            <PlayerCard
              name={state.live?.nonStrikerName || "NON-STRIKER"} photo={nonStriker?.imageUrl}
              label="NON-STRIKER" primary={state.live?.nonStrikerRuns || "0"} secondary={`${state.live?.nonStrikerBalls || "0"} BALLS`}
              detail={nonStriker?.role?.replace(/_/g, " ") || "BATTER"}
            />
          </div>

          <div className={styles.matchColumn}>
            <div className={styles.metricRow}>
              <Metric icon={<Gauge />} label="RUN RATE" value={rate(runs, overs)} />
              <Metric icon={<Target />} label={target > 0 ? "TARGET" : "WICKETS IN HAND"} value={target > 0 ? String(target) : String(Math.max(0, 10 - wickets))} />
              <Metric icon={<Zap />} label={required !== null ? "RUNS NEEDED" : "INNINGS"} value={required !== null ? String(required) : String(state.match?.inningsNumber || 1)} />
            </div>
            <div className={styles.thisOver}>
              <div className={styles.overHead}><span>THIS OVER</span><b>DELIVERY TRACK</b></div>
              <div className={styles.ballRail}>
                {recent.slice(-8).map((ball, index) => <Ball key={`${ball}-${index}`} value={ball} index={index} />)}
              </div>
              <div className={styles.pitchStrip}><span /><i /><b /></div>
            </div>
            <div className={styles.requirement}>
              <Target size={25} />
              <div><span>MATCH EQUATION</span><strong>{state.live?.requirement || "MATCH SCHEDULED"}</strong></div>
              <Sparkles size={22} />
            </div>
            <div className={styles.infoGrid}>
              <Info icon={<MapPin />} label="VENUE" value={state.live?.venue || "TU INTERNATIONAL CRICKET GROUND"} />
              <Info icon={<CircleDot />} label="TOSS" value={state.live?.tossText || "TOSS NOT YET RECORDED"} />
            </div>
          </div>

          <div className={styles.bowlingColumn}>
            <div className={styles.sectionHeading}><span><CircleDot size={17} /> WITH THE BALL</span><b>BOWLER</b></div>
            <div className={styles.bowlerCard}>
              <div className={styles.bowlerHalo} />
              <ImageWithFallback src={bowler?.imageUrl} alt={state.live?.bowlerName || "Bowler"} className={styles.bowlerPhoto} fallback={<UserRound size={78} />} />
              <div className={styles.bowlerInfo}>
                <span>CURRENT BOWLER</span>
                <strong>{state.live?.bowlerName || "BOWLER"}</strong>
                <small>{bowler?.role?.replace(/_/g, " ") || "BOWLER"}</small>
              </div>
              <div className={styles.bowlerFigures}>
                <div><span>FIGURES</span><strong>{state.live?.bowlerFigures || "0/0"}</strong></div>
                <div><span>OVERS</span><strong>{state.live?.bowlerOvers || "0.0"}</strong></div>
              </div>
            </div>
            <div className={styles.rateCard}>
              <div><span>MATCH PULSE</span><strong>{state.live?.rateText || `CRR ${rate(runs, overs)}`}</strong></div>
              <div className={styles.wave}><i /><i /><i /><i /><i /><i /><i /></div>
            </div>
          </div>
        </section>

        <footer className={styles.footer}>
          <div><Clock3 size={17} /><span>LIVE FROM KIRTIPUR</span></div>
          <div className={styles.ticker}><i />{state.live?.requirement || `${teamA.name} vs ${teamB.name}`}<i /></div>
          <div><span>NPL 2026</span><Shield size={17} /></div>
        </footer>
      </div>

      {event && presentation && (
        <section key={event.key} className={`${styles.stinger} ${styles[presentation.className]}`} aria-live="assertive">
          <div className={styles.stingerBackdrop} /><div className={styles.stingerSweep} />
          <div className={styles.stingerRings}><i /><i /><i /></div>
          <div className={styles.flightPath}><span className={styles.cricketBall} /></div>
          <div className={styles.wicketRig}><i /><i /><i /><b /><b /></div>
          <div className={styles.stingerTeam}>
            <ImageWithFallback src={teamA.logo} alt="" className={styles.stingerLogo} fallback={<Shield size={72} />} />
            <span>{teamA.code}</span>
          </div>
          <div className={styles.stingerCopy}>
            <span>{presentation.kicker}</span>
            <div className={styles.stingerTitle}><b>{presentation.value}</b><h1>{presentation.title}</h1></div>
            <p>{presentation.detail}</p>
            <div className={styles.stingerScore}>{runs}/{wickets}<span>{overs} OVERS</span></div>
          </div>
          <div className={styles.speedLines}>{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</div>
        </section>
      )}
    </main>
  );
}

function PlayerCard({ name, photo, label, primary, secondary, detail, featured = false }: { name: string; photo?: string; label: string; primary: string; secondary: string; detail: string; featured?: boolean }) {
  return (
    <article className={`${styles.playerCard} ${featured ? styles.featuredPlayer : ""}`}>
      <div className={styles.playerImageWrap}>
        <ImageWithFallback src={photo} alt={name} className={styles.playerPhoto} fallback={<span>{initials(name)}</span>} />
        {featured && <div className={styles.strikeBadge}><Zap size={13} fill="currentColor" /> STRIKE</div>}
      </div>
      <div className={styles.playerInfo}><span>{label}</span><strong>{name}</strong><small>{detail}</small></div>
      <div className={styles.playerScore}><strong>{primary}</strong><span>{secondary}</span></div>
    </article>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className={styles.metric}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>;
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className={styles.info}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>;
}

function Ball({ value, index }: { value: string; index: number }) {
  const cls = value === "4" ? styles.ballFour : value === "6" ? styles.ballSix : value === "W" ? styles.ballWicket : /WD|NB/.test(value) ? styles.ballExtra : "";
  return <div className={`${styles.ball} ${cls}`} style={{ "--delay": `${index * 70}ms` } as React.CSSProperties}><span>{value}</span></div>;
}
