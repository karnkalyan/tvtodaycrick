"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Award,
  Check,
  ChevronRight,
  Flame,
  Radio,
  RefreshCw,
  Search,
  Sliders,
  Tv,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  EmptyState,
  ErrorBox,
  Overs,
  PageHeader,
  Spinner,
  StatusPill,
  TeamMark,
  humanRole,
} from "@/components/common";
import { api, jsonBody } from "@/lib/client-api";
import type { Match, Player, PlayerStat } from "@/types/models";

type InnForm = {
  teamId: string;
  runs: string;
  wickets: string;
  balls: string;
  extras: string;
  target: string;
  status: string;
};

type StatForm = {
  teamId: string;
  playerId: string;
  innings: string;
  runs: string;
  ballsFaced: string;
  fours: string;
  sixes: string;
  wickets: string;
  ballsBowled: string;
  runsConceded: string;
  maidens: string;
  catches: string;
  stumpings: string;
  runOuts: string;
  isOut: boolean;
  dismissal: string;
};

const blankStat: StatForm = {
  teamId: "",
  playerId: "",
  innings: "1",
  runs: "0",
  ballsFaced: "0",
  fours: "0",
  sixes: "0",
  wickets: "0",
  ballsBowled: "0",
  runsConceded: "0",
  maidens: "0",
  catches: "0",
  stumpings: "0",
  runOuts: "0",
  isOut: false,
  dismissal: "",
};

const toInn = (match: Match, n: number): InnForm => {
  const i = match.innings?.find((x) => x.inningsNumber === n);
  const teamId = i?.teamId || (n === 1 ? match.homeTeamId : match.awayTeamId);
  return {
    teamId: String(teamId),
    runs: String(i?.runs ?? 0),
    wickets: String(i?.wickets ?? 0),
    balls: String(i?.balls ?? 0),
    extras: String(i?.extras ?? 0),
    target: i?.target ? String(i.target) : "",
    status:
      i?.status ??
      (n === 1 && match.status === "LIVE" ? "LIVE" : "NOT_STARTED"),
  };
};

export default function ScoreEntryPage() {
  const [mounted, setMounted] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"score" | "players">("score");
  const [inn1, setInn1] = useState<InnForm | null>(null);
  const [inn2, setInn2] = useState<InnForm | null>(null);
  const [stat, setStat] = useState<StatForm>(blankStat);
  const [toast, setToast] = useState("");

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [teamFilter, setTeamFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [teams, setTeams] = useState<{ id: number; name: string }[]>([]);

  // Active scoring selections
  const [activeInnings, setActiveInnings] = useState<1 | 2>(1);
  const [strikerId, setStrikerId] = useState<string>("");
  const [nonStrikerId, setNonStrikerId] = useState<string>("");
  const [bowlerId, setBowlerId] = useState<string>("");

  // WebSocket sync connection
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Connect WebSocket to live broadcast server
  useEffect(() => {
    let ws: WebSocket;
    let timer: NodeJS.Timeout;

    function connect() {
      try {
        const envWs = process.env.NEXT_PUBLIC_WS_URL;
        let wsUrl: string;
        if (envWs && envWs.trim()) {
          wsUrl = envWs;
        } else if (typeof window !== "undefined") {
          const isHttps = window.location.protocol === "https:";
          if (isHttps) {
            wsUrl = `wss://${window.location.host}/ws`;
          } else {
            const host = window.location.hostname || "localhost";
            const port = window.location.port === "3211" ? "3212" : (window.location.port === "3000" ? "3001" : "3212");
            wsUrl = `ws://${host}:${port}`;
          }
        } else {
          wsUrl = "ws://localhost:3212";
        }
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => setWsConnected(true);
        ws.onclose = () => {
          setWsConnected(false);
          timer = setTimeout(connect, 3000);
        };
        ws.onerror = () => {
          setWsConnected(false);
          try { ws.close(); } catch {}
        };
      } catch {
        timer = setTimeout(connect, 3000);
      }
    }

    connect();
    return () => {
      clearTimeout(timer);
      if (ws) ws.close();
    };
  }, []);

  // Load teams for filtering
  useEffect(() => {
    api<{ id: number; name: string }[]>("/api/teams")
      .then(setTeams)
      .catch((e) => setError(e.message));
  }, []);

  // Load matches
  const loadMatches = useCallback(async () => {
    setLoading(true);
    try {
      const q = encodeURIComponent(searchQuery);
      const result = await api<{ items: Match[]; totalPages: number }>(
        `/api/matches?paged=1&page=${page}&teamId=${teamFilter}&status=${statusFilter}&q=${q}`
      );
      setMatches(result.items);
      setPages(result.totalPages);

      // Auto-select first match if none selected
      if (!selectedId && result.items.length > 0) {
        setSelectedId(result.items[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load matches");
    } finally {
      setLoading(false);
    }
  }, [page, teamFilter, statusFilter, searchQuery, selectedId]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  // Load match detail
  const loadDetail = useCallback(async (id: number) => {
    setDetailLoading(true);
    try {
      const m = await api<Match>(`/api/matches/${id}`);
      setMatch(m);
      const i1 = toInn(m, 1);
      const i2 = toInn(m, 2);
      setInn1(i1);
      setInn2(i2);

      // Determine active innings: if Innings 2 is LIVE, set activeInnings = 2
      if (i2.status === "LIVE") {
        setActiveInnings(2);
      } else {
        setActiveInnings(1);
      }

      // Default active team and players
      const homeTeam = m.homeTeam;
      const awayTeam = m.awayTeam;
      const battingTeam = activeInnings === 1 ? homeTeam : awayTeam;
      const bowlingTeam = activeInnings === 1 ? awayTeam : homeTeam;

      if (battingTeam.players && battingTeam.players.length > 0) {
        setStrikerId(String(battingTeam.players[0].id));
        if (battingTeam.players.length > 1) {
          setNonStrikerId(String(battingTeam.players[1].id));
        }
      }
      if (bowlingTeam.players && bowlingTeam.players.length > 0) {
        setBowlerId(String(bowlingTeam.players[0].id));
      }

      setStat((s) => ({
        ...blankStat,
        teamId: String(battingTeam.id),
        playerId: String(battingTeam.players?.[0]?.id || ""),
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load match");
    } finally {
      setDetailLoading(false);
    }
  }, [activeInnings]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  // Players for the currently selected team in player stat tab
  const teamPlayers = useMemo<Player[]>(() => {
    if (!match) return [];
    return String(match.homeTeamId) === stat.teamId
      ? match.homeTeam.players || []
      : match.awayTeam.players || [];
  }, [match, stat.teamId]);

  const pickTeam = (id: string) => {
    const list = match
      ? String(match.homeTeamId) === id
        ? match.homeTeam.players || []
        : match.awayTeam.players || []
      : [];
    setStat((s) => ({ ...s, teamId: id, playerId: String(list[0]?.id || "") }));
  };

  // Helper to dispatch cues to WebSocket broadcast engine
  const dispatchBroadcastCue = (msg: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(msg));
      } catch {}
    }
  };

  // Sync current match score to broadcast graphics engine
  const syncMatchToBroadcast = async () => {
    if (!match || !inn1 || !inn2) return;
    const current = activeInnings === 1 ? inn1 : inn2;
    const battingTeam = current.teamId === String(match.homeTeamId) ? match.homeTeam : match.awayTeam;
    const bowlingTeam = current.teamId === String(match.homeTeamId) ? match.awayTeam : match.homeTeam;

    const bOvers = Number(current.balls) || 0;
    const ovStr = `${Math.floor(bOvers / 6)}.${bOvers % 6}`;

    const striker = battingTeam.players?.find((p) => String(p.id) === strikerId);
    const nonStriker = battingTeam.players?.find((p) => String(p.id) === nonStrikerId);
    const bowler = bowlingTeam.players?.find((p) => String(p.id) === bowlerId);

    const strikerStat = match.stats?.find((s) => String(s.playerId) === strikerId);
    const nonStrikerStat = match.stats?.find((s) => String(s.playerId) === nonStrikerId);
    const bowlerStat = match.stats?.find((s) => String(s.playerId) === bowlerId);

    const payload = {
      match: {
        teamA: battingTeam.shortName || "KAG",
        teamB: bowlingTeam.shortName || "JAB",
      },
      score: {
        runs: Number(current.runs) || 0,
        wickets: Number(current.wickets) || 0,
        overs: ovStr,
      },
      live: {
        strikerName: striker?.displayName?.toUpperCase() || "BATTER",
        strikerRuns: String(strikerStat?.runs ?? 0),
        strikerBalls: String(strikerStat?.ballsFaced ?? 0),
        nonStrikerName: nonStriker?.displayName?.toUpperCase() || "NON-STRIKER",
        nonStrikerRuns: String(nonStrikerStat?.runs ?? 0),
        nonStrikerBalls: String(nonStrikerStat?.ballsFaced ?? 0),
        bowlerName: bowler?.displayName?.toUpperCase() || "BOWLER",
        bowlerFigures: `${bowlerStat?.wickets ?? 0}/${bowlerStat?.runsConceded ?? 0}`,
        bowlerOvers: `${Math.floor((bowlerStat?.ballsBowled ?? 0) / 6)}.${(bowlerStat?.ballsBowled ?? 0) % 6}`,
        matchLabel: `${match.title} · MATCH ${match.matchNumber || "01"}`,
        venue: match.venue || "TU INTERNATIONAL CRICKET GROUND",
        requirement: current.target ? `NEED ${Number(current.target) - Number(current.runs)} RUNS TO WIN` : "",
        innings: activeInnings === 1 ? "1ST INNINGS" : "CHASE · 2ND INNINGS",
      },
    };

    dispatchBroadcastCue({ action: "updateData", payload });
    dispatchBroadcastCue({ action: "scoreUpdate", data: payload.score });

    try {
      await api("/api/broadcast/state", {
        method: "POST",
        body: jsonBody({
          state: payload,
          action: "score-entry sync",
        }),
      });
      setToast("Synced to live broadcast graphics");
    } catch {
      setToast("Broadcast synced over WebSocket");
    }
  };

  // Save toss
  const saveToss = async () => {
    if (!match) return;
    setBusy(true);
    try {
      const winner = (document.getElementById("tossWinner") as HTMLSelectElement).value;
      const decision = (document.getElementById("tossDecision") as HTMLSelectElement).value;
      await api("/api/toss", {
        method: "POST",
        body: jsonBody({
          matchId: match.id,
          winnerTeamId: Number(winner),
          decision,
        }),
      });
      setToast("Toss saved");
      loadDetail(match.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Toss save failed");
    } finally {
      setBusy(false);
    }
  };

  // Save innings
  const saveInnings = async (n: number, f: InnForm | null) => {
    if (!match || !f) return;
    setBusy(true);
    try {
      await api("/api/innings", {
        method: "POST",
        body: jsonBody({
          matchId: match.id,
          teamId: Number(f.teamId),
          inningsNumber: n,
          runs: Number(f.runs),
          wickets: Number(f.wickets),
          balls: Number(f.balls),
          extras: Number(f.extras),
          target: f.target ? Number(f.target) : null,
          status: f.status,
        }),
      });
      setToast(`Innings ${n} saved successfully`);
      await loadDetail(match.id);
      syncMatchToBroadcast();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Innings save failed");
    } finally {
      setBusy(false);
    }
  };

  // Save player stat
  const saveStatValue = async (value: StatForm, message = "Player performance saved") => {
    if (!match) return;
    setBusy(true);
    try {
      const p = {
        matchId: match.id,
        playerId: Number(value.playerId),
        teamId: Number(value.teamId),
        innings: Number(value.innings),
        runs: Number(value.runs),
        ballsFaced: Number(value.ballsFaced),
        fours: Number(value.fours),
        sixes: Number(value.sixes),
        wickets: Number(value.wickets),
        ballsBowled: Number(value.ballsBowled),
        runsConceded: Number(value.runsConceded),
        maidens: Number(value.maidens),
        catches: Number(value.catches),
        stumpings: Number(value.stumpings),
        runOuts: Number(value.runOuts),
        isOut: value.isOut,
        dismissal: value.dismissal || null,
      };
      await api("/api/stats", { method: "POST", body: jsonBody(p) });
      setToast(message);
      await loadDetail(match.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Stat save failed");
    } finally {
      setBusy(false);
    }
  };

  const saveStat = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveStatValue(stat);
  };

  // Quick Ball-by-ball scoring action
  const handleQuickBall = async (type: "0" | "1" | "2" | "3" | "4" | "6" | "wicket" | "wide" | "noball") => {
    if (!match) return;
    const current = activeInnings === 1 ? inn1 : inn2;
    if (!current) return;

    let runDelta = 0;
    let extraDelta = 0;
    let ballDelta = 1;
    let wktDelta = 0;
    let isBoundaryFour = false;
    let isBoundarySix = false;

    if (type === "0") {
      runDelta = 0;
    } else if (type === "1") {
      runDelta = 1;
    } else if (type === "2") {
      runDelta = 2;
    } else if (type === "3") {
      runDelta = 3;
    } else if (type === "4") {
      runDelta = 4;
      isBoundaryFour = true;
    } else if (type === "6") {
      runDelta = 6;
      isBoundarySix = true;
    } else if (type === "wicket") {
      wktDelta = 1;
    } else if (type === "wide") {
      runDelta = 1;
      extraDelta = 1;
      ballDelta = 0;
    } else if (type === "noball") {
      runDelta = 1;
      extraDelta = 1;
      ballDelta = 0;
    }

    const nextRuns = (Number(current.runs) || 0) + runDelta;
    const nextWkts = Math.min(10, (Number(current.wickets) || 0) + wktDelta);
    const nextBalls = (Number(current.balls) || 0) + ballDelta;
    const nextExtras = (Number(current.extras) || 0) + extraDelta;

    const nextInn: InnForm = {
      ...current,
      runs: String(nextRuns),
      wickets: String(nextWkts),
      balls: String(nextBalls),
      extras: String(nextExtras),
      status: "LIVE",
    };

    if (activeInnings === 1) setInn1(nextInn);
    else setInn2(nextInn);

    // Trigger Broadcast live cues
    if (isBoundaryFour) {
      dispatchBroadcastCue({ action: "stinger", event: "four" });
      dispatchBroadcastCue({ action: "action", name: "four" });
    } else if (isBoundarySix) {
      dispatchBroadcastCue({ action: "stinger", event: "six" });
      dispatchBroadcastCue({ action: "action", name: "six" });
    } else if (type === "wicket") {
      dispatchBroadcastCue({ action: "stinger", event: "wicket" });
      dispatchBroadcastCue({ action: "action", name: "wicket" });
    }

    const ovStr = `${Math.floor(nextBalls / 6)}.${nextBalls % 6}`;
    dispatchBroadcastCue({
      action: "scoreUpdate",
      data: { runs: nextRuns, wickets: nextWkts, overs: ovStr },
    });

    // Save Innings to DB
    await saveInnings(activeInnings, nextInn);

    // Also update active striker player stat if striker selected
    if (strikerId && ballDelta > 0 && type !== "wicket") {
      const existingStat = match.stats?.find(
        (s) => String(s.playerId) === strikerId && Number(s.innings) === activeInnings
      );
      const curRuns = existingStat?.runs || 0;
      const curBalls = existingStat?.ballsFaced || 0;
      const cur4s = existingStat?.fours || 0;
      const cur6s = existingStat?.sixes || 0;

      const pStat: StatForm = {
        ...blankStat,
        playerId: strikerId,
        teamId: current.teamId,
        innings: String(activeInnings),
        runs: String(curRuns + runDelta),
        ballsFaced: String(curBalls + ballDelta),
        fours: String(cur4s + (isBoundaryFour ? 1 : 0)),
        sixes: String(cur6s + (isBoundarySix ? 1 : 0)),
      };
      await saveStatValue(pStat, `Ball recorded: ${type.toUpperCase()}`);
    }
  };

  const setI = (which: 1 | 2, key: keyof InnForm, value: string) => {
    if (which === 1) setInn1((s) => (s ? { ...s, [key]: value } : s));
    else setInn2((s) => (s ? { ...s, [key]: value } : s));
  };

  const setS = <K extends keyof StatForm>(k: K, v: StatForm[K]) =>
    setStat((s) => ({ ...s, [k]: v }));

  if (!mounted || loading) {
    return <Spinner />;
  }

  // Derive active innings scores for both teams for display in Hero
  const homeInnings = match?.innings?.find((i) => i.teamId === match.homeTeamId);
  const awayInnings = match?.innings?.find((i) => i.teamId === match.awayTeamId);

  return (
    <>
      <PageHeader
        eyebrow="Match Operations & Live Scoring"
        title="Score Entry Workspace"
        description="Live ball-by-ball scoring, toss operations, innings records, and instant broadcast graphics synchronization."
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 12px",
                borderRadius: "999px",
                fontSize: "11px",
                fontWeight: 700,
                background: wsConnected ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)",
                color: wsConnected ? "var(--green)" : "var(--red)",
                border: `1px solid ${wsConnected ? "rgba(34, 197, 94, 0.25)" : "rgba(239, 68, 68, 0.25)"}`,
              }}
            >
              <span className={`live-dot ${wsConnected ? "" : "recording"}`} style={{ width: 6, height: 6 }} />
              <span>GFX ENGINE: {wsConnected ? "ONLINE (:3001)" : "OFFLINE"}</span>
            </span>
            <button type="button" className="button secondary" onClick={loadMatches}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        }
      />

      {error && <ErrorBox message={error} />}

      {/* MATCH PICKER TOOLBAR */}
      <div className="toolbar" style={{ gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
        <div style={{ position: "relative", minWidth: "220px", flex: 1 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "var(--muted)" }} />
          <input
            style={{ paddingLeft: "32px", width: "100%" }}
            placeholder="Search fixtures, teams..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <select
          aria-label="Filter matches by team"
          value={teamFilter}
          onChange={(e) => {
            setTeamFilter(e.target.value);
            setPage(1);
          }}
          style={{ minWidth: "160px" }}
        >
          <option value="">All Teams</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter match status"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          style={{ minWidth: "150px" }}
        >
          <option value="">All Statuses</option>
          {["SCHEDULED", "LIVE", "COMPLETED"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="score-entry-grid">
        {/* LEFT COLUMN: FIXTURES PICKER */}
        <aside className="panel">
          <div className="panel-header">
            <div>
              <h3>Select Fixture</h3>
              <p>Choose an NPL match to enter live scores</p>
            </div>
          </div>
          <div className="panel-body match-picker">
            {matches.length === 0 ? (
              <p className="muted" style={{ padding: "16px", textAlign: "center" }}>
                No fixtures found matching criteria.
              </p>
            ) : (
              matches.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`match-pick ${selectedId === m.id ? "active" : ""}`}
                  onClick={() => setSelectedId(m.id)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <strong style={{ fontSize: "11px", letterSpacing: "1px", color: "var(--muted)" }}>
                      {m.matchNumber ? `MATCH ${m.matchNumber}` : "FIXTURE"}
                    </strong>
                    <StatusPill status={m.status} />
                  </div>
                  <div className="match-pick-teams">
                    <span>{m.homeTeam.shortName}</span>
                    <span style={{ color: "var(--muted)", fontWeight: 500, fontSize: 11 }}>vs</span>
                    <span>{m.awayTeam.shortName}</span>
                  </div>
                  <small style={{ color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {m.venue || m.title}
                  </small>
                </button>
              ))
            )}
          </div>
          <div className="pagination" style={{ padding: "12px 16px" }}>
            <button type="button" className="button secondary compact" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Prev
            </button>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              {page} / {pages || 1}
            </span>
            <button type="button" className="button secondary compact" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </aside>

        {/* RIGHT COLUMN: SCORING WORKSPACE */}
        <section>
          {detailLoading ? (
            <Spinner />
          ) : match && inn1 && inn2 ? (
            <>
              {/* SCORE HERO BANNER (BOTH TEAMS DISPLAYED PROPERLY) */}
              <div className="score-hero">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "1.5px", color: "var(--brand)", textTransform: "uppercase" }}>
                      NEPAL PREMIER LEAGUE 2026 · {match.title}
                    </span>
                    <h2 style={{ fontSize: "20px", fontWeight: 900, margin: "2px 0 0" }}>
                      {match.homeTeam.name} vs {match.awayTeam.name}
                    </h2>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <StatusPill status={match.status} />
                    <button
                      type="button"
                      className="button compact"
                      onClick={syncMatchToBroadcast}
                      title="Sync current match score to live broadcast output"
                    >
                      <Tv size={13} /> Sync to Output
                    </button>
                  </div>
                </div>

                <div className="score-hero-teams">
                  {/* HOME TEAM */}
                  <div className="score-team-card">
                    <TeamMark team={match.homeTeam} size="lg" />
                    <div className="score-team-meta">
                      <h3>{match.homeTeam.name}</h3>
                      <div className="score-big-score">
                        {homeInnings ? `${homeInnings.runs}/${homeInnings.wickets}` : "—/—"}
                      </div>
                      <div className="score-overs-tag">
                        {homeInnings ? (
                          <>
                            <Overs balls={homeInnings.balls} /> OVERS
                            {homeInnings.balls > 0 && ` · CRR ${(homeInnings.runs / (homeInnings.balls / 6)).toFixed(2)}`}
                          </>
                        ) : (
                          "YET TO BAT"
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CENTER MATCH DETAILS */}
                  <div className="score-hero-center">
                    <strong>VS</strong>
                    <small>
                      {activeInnings === 1 ? "1st Innings" : "2nd Innings Chase"}
                    </small>
                  </div>

                  {/* AWAY TEAM */}
                  <div className="score-team-card away">
                    <TeamMark team={match.awayTeam} size="lg" />
                    <div className="score-team-meta">
                      <h3>{match.awayTeam.name}</h3>
                      <div className="score-big-score">
                        {awayInnings ? `${awayInnings.runs}/${awayInnings.wickets}` : "—/—"}
                      </div>
                      <div className="score-overs-tag">
                        {awayInnings ? (
                          <>
                            <Overs balls={awayInnings.balls} /> OVERS
                            {awayInnings.balls > 0 && ` · CRR ${(awayInnings.runs / (awayInnings.balls / 6)).toFixed(2)}`}
                          </>
                        ) : (
                          "YET TO BAT"
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* TOSS & VENUE FOOTER */}
                <div className="score-hero-toss">
                  <span>
                    <strong>VENUE:</strong> {match.venue || "TU Cricket Ground, Kirtipur"}
                  </span>
                  <span>
                    {match.toss ? (
                      <>
                        <strong>TOSS:</strong>{" "}
                        {match.toss.winnerTeamId === match.homeTeamId
                          ? match.homeTeam.name
                          : match.awayTeam.name}{" "}
                        won the toss and elected to {match.toss.decision.toLowerCase()}
                      </>
                    ) : (
                      "Toss not yet recorded"
                    )}
                  </span>
                </div>
              </div>

              {/* QUICK BALL-BY-BALL SCORING PANEL */}
              <div className="quick-scoring-panel">
                <div className="quick-scoring-title">
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <h4>Quick Ball-by-Ball Scoring</h4>
                    <span className="badge brand" style={{ fontSize: "10px" }}>
                      Active Innings: {activeInnings}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      className={`button compact ${activeInnings === 1 ? "" : "secondary"}`}
                      onClick={() => setActiveInnings(1)}
                    >
                      Innings 1
                    </button>
                    <button
                      type="button"
                      className={`button compact ${activeInnings === 2 ? "" : "secondary"}`}
                      onClick={() => setActiveInnings(2)}
                    >
                      Innings 2
                    </button>
                  </div>
                </div>

                {/* ACTIVE BATTERS & BOWLER PICKER */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                  <div className="field">
                    <label>Striker Batter ★</label>
                    <select
                      value={strikerId}
                      onChange={(e) => setStrikerId(e.target.value)}
                    >
                      <option value="">Select Striker</option>
                      {(activeInnings === 1 ? match.homeTeam.players : match.awayTeam.players)?.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.displayName} ({humanRole(p.role)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Non-Striker Batter</label>
                    <select
                      value={nonStrikerId}
                      onChange={(e) => setNonStrikerId(e.target.value)}
                    >
                      <option value="">Select Non-Striker</option>
                      {(activeInnings === 1 ? match.homeTeam.players : match.awayTeam.players)?.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.displayName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Current Bowler ⚡</label>
                    <select
                      value={bowlerId}
                      onChange={(e) => setBowlerId(e.target.value)}
                    >
                      <option value="">Select Bowler</option>
                      {(activeInnings === 1 ? match.awayTeam.players : match.homeTeam.players)?.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.displayName} ({humanRole(p.role)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* INSTANT SCORING BUTTONS */}
                <div className="ball-stepper-grid">
                  <button type="button" className="ball-stepper-btn" onClick={() => handleQuickBall("0")} disabled={busy}>
                    +0 DOT
                  </button>
                  <button type="button" className="ball-stepper-btn" onClick={() => handleQuickBall("1")} disabled={busy}>
                    +1
                  </button>
                  <button type="button" className="ball-stepper-btn" onClick={() => handleQuickBall("2")} disabled={busy}>
                    +2
                  </button>
                  <button type="button" className="ball-stepper-btn" onClick={() => handleQuickBall("3")} disabled={busy}>
                    +3
                  </button>
                  <button type="button" className="ball-stepper-btn four" onClick={() => handleQuickBall("4")} disabled={busy}>
                    FOUR 4
                  </button>
                  <button type="button" className="ball-stepper-btn six" onClick={() => handleQuickBall("6")} disabled={busy}>
                    SIX 6
                  </button>
                  <button type="button" className="ball-stepper-btn wicket" onClick={() => handleQuickBall("wicket")} disabled={busy}>
                    WICKET
                  </button>
                  <button type="button" className="ball-stepper-btn" onClick={() => handleQuickBall("wide")} disabled={busy}>
                    WIDE
                  </button>
                </div>
              </div>

              {/* TABS FOR DETAILED INNINGS & PLAYER EDIT */}
              <div className="tabs">
                <button
                  type="button"
                  className={`tab ${tab === "score" ? "active" : ""}`}
                  onClick={() => setTab("score")}
                >
                  Toss & Detailed Innings
                </button>
                <button
                  type="button"
                  className={`tab ${tab === "players" ? "active" : ""}`}
                  onClick={() => setTab("players")}
                >
                  Player Performance & Scorecard
                </button>
              </div>

              {tab === "score" ? (
                <>
                  {/* TOSS SECTION */}
                  <article className="mini-form">
                    <h4>Toss Information</h4>
                    <div className="form-grid">
                      <div className="field">
                        <label>Toss Winner</label>
                        <select
                          id="tossWinner"
                          defaultValue={String(match.toss?.winnerTeamId || match.homeTeamId)}
                        >
                          <option value={match.homeTeamId}>{match.homeTeam.name}</option>
                          <option value={match.awayTeamId}>{match.awayTeam.name}</option>
                        </select>
                      </div>
                      <div className="field">
                        <label>Decision</label>
                        <select
                          id="tossDecision"
                          defaultValue={match.toss?.decision || "BAT"}
                        >
                          <option value="BAT">Elected to BAT</option>
                          <option value="BOWL">Elected to BOWL</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="button" className="button compact" onClick={saveToss} disabled={busy}>
                        Save Toss Details
                      </button>
                    </div>
                  </article>

                  {/* INNINGS 1 & 2 FORMS */}
                  {([1, 2] as const).map((n) => {
                    const f = n === 1 ? inn1 : inn2;
                    return (
                      <article className="mini-form" key={n}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                          <h4>
                            Innings {n} ·{" "}
                            {f.teamId === String(match.homeTeamId)
                              ? match.homeTeam.name
                              : match.awayTeam.name}
                          </h4>
                          <span className="badge" style={{ fontSize: "11px" }}>
                            Status: {f.status}
                          </span>
                        </div>

                        <div className="stat-entry-grid">
                          <div className="field">
                            <label>Batting Team</label>
                            <select
                              value={f.teamId}
                              onChange={(e) => setI(n, "teamId", e.target.value)}
                            >
                              <option value={match.homeTeamId}>{match.homeTeam.name}</option>
                              <option value={match.awayTeamId}>{match.awayTeam.name}</option>
                            </select>
                          </div>
                          <div className="field">
                            <label>Total Runs</label>
                            <input
                              type="number"
                              min="0"
                              value={f.runs}
                              onChange={(e) => setI(n, "runs", e.target.value)}
                            />
                          </div>
                          <div className="field">
                            <label>Wickets Down</label>
                            <input
                              type="number"
                              min="0"
                              max="10"
                              value={f.wickets}
                              onChange={(e) => setI(n, "wickets", e.target.value)}
                            />
                          </div>
                          <div className="field">
                            <label>
                              Balls Bowled ({Math.floor(Number(f.balls || 0) / 6)}.{Number(f.balls || 0) % 6} ov)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={f.balls}
                              onChange={(e) => setI(n, "balls", e.target.value)}
                            />
                          </div>
                          <div className="field">
                            <label>Extras</label>
                            <input
                              type="number"
                              min="0"
                              value={f.extras}
                              onChange={(e) => setI(n, "extras", e.target.value)}
                            />
                          </div>
                          <div className="field">
                            <label>Target</label>
                            <input
                              type="number"
                              min="1"
                              value={f.target}
                              placeholder="e.g. 175"
                              onChange={(e) => setI(n, "target", e.target.value)}
                            />
                          </div>
                          <div className="field">
                            <label>Innings Status</label>
                            <select
                              value={f.status}
                              onChange={(e) => setI(n, "status", e.target.value)}
                            >
                              <option value="NOT_STARTED">NOT_STARTED</option>
                              <option value="LIVE">LIVE</option>
                              <option value="COMPLETED">COMPLETED</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-actions" style={{ marginTop: "14px" }}>
                          <button
                            type="button"
                            className="button compact"
                            onClick={() => saveInnings(n, f)}
                            disabled={busy}
                          >
                            Save Innings {n}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </>
              ) : (
                <>
                  {/* PLAYER PERFORMANCE FORM */}
                  <form className="mini-form" onSubmit={saveStat}>
                    <h4>Player Match Statistics</h4>
                    <p className="muted" style={{ marginBottom: "16px" }}>
                      Active player:{" "}
                      <strong>
                        {teamPlayers.find((p) => String(p.id) === stat.playerId)?.displayName || "Select a player"}
                      </strong>
                    </p>

                    <div className="form-grid">
                      <div className="field">
                        <label>Team</label>
                        <select
                          value={stat.teamId}
                          onChange={(e) => pickTeam(e.target.value)}
                        >
                          <option value={match.homeTeamId}>{match.homeTeam.name}</option>
                          <option value={match.awayTeamId}>{match.awayTeam.name}</option>
                        </select>
                      </div>
                      <div className="field">
                        <label>Player</label>
                        <select
                          required
                          value={stat.playerId}
                          onChange={(e) => setS("playerId", e.target.value)}
                        >
                          {teamPlayers.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.displayName} · {humanRole(p.role)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label>Innings</label>
                        <select
                          value={stat.innings}
                          onChange={(e) => setS("innings", e.target.value)}
                        >
                          <option value="1">1st Innings</option>
                          <option value="2">2nd Innings</option>
                        </select>
                      </div>
                    </div>

                    <div className="stat-entry-grid" style={{ marginTop: 14 }}>
                      {(
                        [
                          ["runs", "Runs Scored"],
                          ["ballsFaced", "Balls Faced"],
                          ["fours", "4s Count"],
                          ["sixes", "6s Count"],
                          ["wickets", "Wickets Taken"],
                          ["ballsBowled", "Balls Bowled"],
                          ["runsConceded", "Runs Conceded"],
                          ["maidens", "Maiden Overs"],
                          ["catches", "Catches"],
                          ["stumpings", "Stumpings"],
                          ["runOuts", "Run Outs"],
                        ] as [keyof StatForm, string][]
                      ).map(([key, label]) => (
                        <div className="field" key={key}>
                          <label>{label}</label>
                          <input
                            type="number"
                            min="0"
                            value={String(stat[key])}
                            onChange={(e) => setS(key, e.target.value as never)}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="form-grid" style={{ marginTop: 14 }}>
                      <div className="field full">
                        <label>Dismissal Summary</label>
                        <input
                          value={stat.dismissal}
                          onChange={(e) => setS("dismissal", e.target.value)}
                          placeholder="e.g. c Karan KC b Shahab Alam"
                        />
                      </div>
                      <label className="check" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={stat.isOut}
                          onChange={(e) => setS("isOut", e.target.checked)}
                        />
                        <span>Player is OUT</span>
                      </label>
                    </div>

                    <div className="form-actions" style={{ marginTop: 14 }}>
                      <button type="submit" className="button" disabled={busy || !stat.playerId}>
                        {busy ? "Saving…" : "Save Player Record"}
                      </button>
                    </div>
                  </form>

                  {/* SAVED MATCH STATISTICS TABLE */}
                  <article className="panel">
                    <div className="panel-header">
                      <div>
                        <h3>Saved Match Performance Scorecard</h3>
                        <p>Complete official scores and bowling records stored in database</p>
                      </div>
                    </div>
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Player</th>
                            <th>Team</th>
                            <th className="num">R</th>
                            <th className="num">B</th>
                            <th className="num">4s</th>
                            <th className="num">6s</th>
                            <th className="num">SR</th>
                            <th className="num">W</th>
                            <th className="num">Overs</th>
                            <th className="num">Runs Con</th>
                            <th className="num">C</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {match.stats?.length === 0 ? (
                            <tr>
                              <td colSpan={12} style={{ textAlign: "center", color: "var(--muted)", padding: 20 }}>
                                No player performance entries recorded yet.
                              </td>
                            </tr>
                          ) : (
                            match.stats?.map((s: PlayerStat) => {
                              const sr =
                                s.ballsFaced > 0 ? ((s.runs / s.ballsFaced) * 100).toFixed(1) : "—";
                              return (
                                <tr key={`${s.playerId}-${s.innings}`}>
                                  <td>
                                    <strong>{s.player?.displayName}</strong>
                                  </td>
                                  <td>{s.team?.shortName}</td>
                                  <td className="num strong">{s.runs}</td>
                                  <td className="num">{s.ballsFaced}</td>
                                  <td className="num">{s.fours}</td>
                                  <td className="num">{s.sixes}</td>
                                  <td className="num">{sr}</td>
                                  <td className="num strong" style={{ color: s.wickets > 0 ? "var(--brand)" : undefined }}>
                                    {s.wickets}
                                  </td>
                                  <td className="num">
                                    <Overs balls={s.ballsBowled} />
                                  </td>
                                  <td className="num">{s.runsConceded}</td>
                                  <td className="num">{s.catches}</td>
                                  <td>
                                    <span
                                      className={`badge ${s.isOut ? "danger" : "brand"}`}
                                      style={{ fontSize: "11px" }}
                                    >
                                      {s.isOut ? s.dismissal || "Out" : "Not out"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </article>
                </>
              )}
            </>
          ) : (
            <EmptyState
              title="Select a match fixture"
              description="Choose a match from the fixtures panel on the left to enter scores, toss info, and player performance."
            />
          )}
        </section>
      </div>

      {toast && (
        <div className="toast">
          <span>{toast}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            style={{
              marginLeft: 10,
              border: 0,
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
            }}
            onClick={() => setToast("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
}
