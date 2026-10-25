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
  Undo2,
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
import { applyQuickBall, QUICK_BALL_EVENTS, type QuickBallType } from "@/lib/score-events";
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

  // Undo history tracking
  const [undoHistory, setUndoHistory] = useState<{ groupId: string; label: string; createdAt: string; changes: number }[]>([]);
  const [undoTotal, setUndoTotal] = useState(0);

  const fetchUndoHistory = useCallback(async (matchId: number) => {
    try {
      const res = await api<{ items: any[]; total: number }>(`/api/matches/${matchId}/undo`);
      setUndoHistory(res.items || []);
      setUndoTotal(res.total || 0);
    } catch {
      // non-critical
    }
  }, []);

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

      // Pick the live innings when a match is first loaded. Subsequent manual
      // innings switches are not tied to this fetch callback.
      const nextActiveInnings: 1 | 2 = i2.status === "LIVE" ? 2 : 1;
      setActiveInnings(nextActiveInnings);

      // Default active team and players
      const homeTeam = m.homeTeam;
      const awayTeam = m.awayTeam;
      const activeForm = nextActiveInnings === 1 ? i1 : i2;
      const battingTeam = activeForm.teamId === String(homeTeam.id) ? homeTeam : awayTeam;
      const bowlingTeam = activeForm.teamId === String(homeTeam.id) ? awayTeam : homeTeam;

      if (battingTeam.players && battingTeam.players.length > 0) {
        const battingIds = new Set(battingTeam.players.map((player) => String(player.id)));
        setStrikerId((current) => battingIds.has(current) ? current : String(battingTeam.players?.[0]?.id || ""));
        setNonStrikerId((current) => battingIds.has(current) ? current : String(battingTeam.players?.[1]?.id || ""));
      }
      if (bowlingTeam.players && bowlingTeam.players.length > 0) {
        const bowlingIds = new Set(bowlingTeam.players.map((player) => String(player.id)));
        setBowlerId((current) => bowlingIds.has(current) ? current : String(bowlingTeam.players?.[0]?.id || ""));
      }

      setStat((s) => ({
        ...blankStat,
        teamId: String(battingTeam.id),
        playerId: String(battingTeam.players?.[0]?.id || ""),
      }));
      fetchUndoHistory(id);
      return m;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load match");
    } finally {
      setDetailLoading(false);
    }
  }, [fetchUndoHistory]);

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

  // Keep all three live-scoring selectors aligned with the innings button.
  useEffect(() => {
    if (!match || !inn1 || !inn2) return;
    const form = activeInnings === 1 ? inn1 : inn2;
    const battingTeam = form.teamId === String(match.homeTeamId) ? match.homeTeam : match.awayTeam;
    const bowlingTeam = form.teamId === String(match.homeTeamId) ? match.awayTeam : match.homeTeam;
    const battingIds = new Set((battingTeam.players || []).map((player) => String(player.id)));
    const bowlingIds = new Set((bowlingTeam.players || []).map((player) => String(player.id)));
    setStrikerId((current) => battingIds.has(current) ? current : String(battingTeam.players?.[0]?.id || ""));
    setNonStrikerId((current) => battingIds.has(current) ? current : String(battingTeam.players?.[1]?.id || ""));
    setBowlerId((current) => bowlingIds.has(current) ? current : String(bowlingTeam.players?.[0]?.id || ""));
  }, [activeInnings, inn1, inn2, match]);

  // Helper to dispatch cues to WebSocket broadcast engine
  const dispatchBroadcastCue = (msg: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(msg));
      } catch {}
    }
  };

  // Sync current match score to broadcast graphics engine
  const syncMatchToBroadcast = async (freshMatch?: Match) => {
    const sourceMatch = freshMatch || match;
    if (!sourceMatch) return;
    const sourceInn1 = freshMatch ? toInn(freshMatch, 1) : inn1;
    const sourceInn2 = freshMatch ? toInn(freshMatch, 2) : inn2;
    if (!sourceInn1 || !sourceInn2) return;
    const current = activeInnings === 1 ? sourceInn1 : sourceInn2;
    const battingTeam = current.teamId === String(sourceMatch.homeTeamId) ? sourceMatch.homeTeam : sourceMatch.awayTeam;
    const bowlingTeam = current.teamId === String(sourceMatch.homeTeamId) ? sourceMatch.awayTeam : sourceMatch.homeTeam;

    const bOvers = Number(current.balls) || 0;
    const ovStr = `${Math.floor(bOvers / 6)}.${bOvers % 6}`;
    const inningsStarted = current.status === "LIVE" || bOvers > 0 || Number(current.runs) > 0 || Number(current.wickets) > 0;

    const striker = battingTeam.players?.find((p) => String(p.id) === strikerId);
    const nonStriker = battingTeam.players?.find((p) => String(p.id) === nonStrikerId);
    const bowler = bowlingTeam.players?.find((p) => String(p.id) === bowlerId);

    const strikerStat = sourceMatch.stats?.find((s) => String(s.playerId) === strikerId);
    const nonStrikerStat = sourceMatch.stats?.find((s) => String(s.playerId) === nonStrikerId);
    const bowlerStat = sourceMatch.stats?.find((s) => String(s.playerId) === bowlerId);

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
        matchLabel: `${sourceMatch.title} · MATCH ${sourceMatch.matchNumber || "01"}`,
        venue: sourceMatch.venue || "TU INTERNATIONAL CRICKET GROUND",
        requirement: current.target ? `NEED ${Number(current.target) - Number(current.runs)} RUNS TO WIN` : "",
        innings: inningsStarted ? (activeInnings === 1 ? "1ST INNINGS" : "CHASE · 2ND INNINGS") : "MATCH SCHEDULED",
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
      setToast(wsRef.current?.readyState === WebSocket.OPEN
        ? "Broadcast synced over WebSocket"
        : "Unable to persist broadcast state");
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

  // Save innings with optional undo journal metadata
  const saveInnings = async (n: number, f: InnForm | null, undoGroup?: string, undoLabel?: string) => {
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
          undoGroup,
          undoLabel,
        }),
      });
      setToast(`Innings ${n} saved successfully`);
      const refreshed = await loadDetail(match.id);
      await syncMatchToBroadcast(refreshed);
      await fetchUndoHistory(match.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Innings save failed");
    } finally {
      setBusy(false);
    }
  };

  // Save player stat with optional undo journal metadata
  const saveStatValue = async (
    value: StatForm,
    message = "Player performance saved",
    undoGroup?: string,
    undoLabel?: string
  ) => {
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
        undoGroup,
        undoLabel,
      };
      await api("/api/stats", { method: "POST", body: jsonBody(p) });
      setToast(message);
      await loadDetail(match.id);
      fetchUndoHistory(match.id);
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

  // Undo last recorded ball or scoring action
  const handleUndoLast = async () => {
    if (!match || busy) return;
    setBusy(true);
    try {
      const res = await api<{ undone: string; changes: number; remaining: number }>(
        `/api/matches/${match.id}/undo`,
        { method: "POST" }
      );
      setToast(`Undone: ${res.undone || "Last event removed"}`);
      dispatchBroadcastCue({ action: "action", name: "undoDelivery" });
      const refreshed = await loadDetail(match.id);
      await syncMatchToBroadcast(refreshed);
      await fetchUndoHistory(match.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to undo action");
    } finally {
      setBusy(false);
    }
  };

  // Keyboard shortcut Ctrl+Z / Cmd+Z for instant undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
          return;
        }
        if (selectedId && undoTotal > 0 && !busy) {
          e.preventDefault();
          handleUndoLast();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, undoTotal, busy, match]);

  // Quick Ball-by-ball scoring action
  const handleQuickBall = async (type: QuickBallType) => {
    if (!match || busy) return;
    const current = activeInnings === 1 ? inn1 : inn2;
    if (!current) return;
    setBusy(true);
    setError("");

    const result = applyQuickBall({
      runs: Number(current.runs) || 0,
      wickets: Number(current.wickets) || 0,
      balls: Number(current.balls) || 0,
      extras: Number(current.extras) || 0,
    }, type);
    const { event } = result;

    const nextInn: InnForm = {
      ...current,
      runs: String(result.runs),
      wickets: String(result.wickets),
      balls: String(result.balls),
      extras: String(result.extras),
      status: "LIVE",
    };

    if (activeInnings === 1) setInn1(nextInn);
    else setInn2(nextInn);

    // Every delivery advances the broadcast "This Over" strip. Boundary and
    // wicket actions also own their stinger, so each click emits exactly once.
    dispatchBroadcastCue({ action: "action", name: event.broadcastAction });
    const ovStr = `${Math.floor(result.balls / 6)}.${result.balls % 6}`;
    dispatchBroadcastCue({
      action: "scoreUpdate",
      data: { runs: result.runs, wickets: result.wickets, overs: ovStr },
    });

    // Create undo group so innings + striker stat roll back together in a single undo step
    const undoGroup = `ball-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const ballLabel = type === "wicket" ? "WICKET" : type === "wide" ? "WIDE (+1)" : type === "noball" ? "NO BALL (+1)" : `+${type} RUN${type === "1" ? "" : "S"}`;
    const undoLabel = `Ball: ${ballLabel} (${result.runs}/${result.wickets} in ${ovStr} ov)`;

    try {
      await api("/api/innings", {
        method: "POST",
        body: jsonBody({
          matchId: match.id,
          teamId: Number(nextInn.teamId),
          inningsNumber: activeInnings,
          runs: result.runs,
          wickets: result.wickets,
          balls: result.balls,
          extras: result.extras,
          target: nextInn.target ? Number(nextInn.target) : null,
          status: nextInn.status,
          undoGroup,
          undoLabel,
        }),
      });

      // Update the striker without erasing fielding/bowling values already in
      // the same player-match row.
      if (strikerId && event.legalBalls > 0) {
        const existing = match.stats?.find(
          (entry) => String(entry.playerId) === strikerId && Number(entry.innings) === activeInnings,
        );
        await api("/api/stats", {
          method: "POST",
          body: jsonBody({
            matchId: match.id,
            playerId: Number(strikerId),
            teamId: Number(current.teamId),
            innings: activeInnings,
            runs: (existing?.runs || 0) + event.runs,
            ballsFaced: (existing?.ballsFaced || 0) + event.legalBalls,
            fours: (existing?.fours || 0) + (event.isFour ? 1 : 0),
            sixes: (existing?.sixes || 0) + (event.isSix ? 1 : 0),
            wickets: existing?.wickets || 0,
            ballsBowled: existing?.ballsBowled || 0,
            runsConceded: existing?.runsConceded || 0,
            maidens: existing?.maidens || 0,
            catches: existing?.catches || 0,
            stumpings: existing?.stumpings || 0,
            runOuts: existing?.runOuts || 0,
            isOut: type === "wicket" ? true : existing?.isOut || false,
            dismissal: type === "wicket" ? "Wicket" : existing?.dismissal || null,
            undoGroup,
            undoLabel,
          }),
        });
      }

      if (bowlerId) {
        const existing = match.stats?.find(
          (entry) => String(entry.playerId) === bowlerId && Number(entry.innings) === activeInnings,
        );
        const bowlingTeamId = Number(current.teamId) === match.homeTeamId ? match.awayTeamId : match.homeTeamId;
        await api("/api/stats", {
          method: "POST",
          body: jsonBody({
            matchId: match.id,
            playerId: Number(bowlerId),
            teamId: bowlingTeamId,
            innings: activeInnings,
            runs: existing?.runs || 0,
            ballsFaced: existing?.ballsFaced || 0,
            fours: existing?.fours || 0,
            sixes: existing?.sixes || 0,
            wickets: (existing?.wickets || 0) + event.wickets,
            ballsBowled: (existing?.ballsBowled || 0) + event.legalBalls,
            runsConceded: (existing?.runsConceded || 0) + event.runs,
            maidens: existing?.maidens || 0,
            catches: existing?.catches || 0,
            stumpings: existing?.stumpings || 0,
            runOuts: existing?.runOuts || 0,
            isOut: existing?.isOut || false,
            dismissal: existing?.dismissal || null,
            undoGroup,
            undoLabel,
          }),
        });
      }

      const overEnded = event.legalBalls > 0 && result.balls % 6 === 0;
      const oddRuns = event.runs % 2 === 1 && type !== "wicket";
      if (oddRuns !== overEnded) {
        const previousStriker = strikerId;
        setStrikerId(nonStrikerId);
        setNonStrikerId(previousStriker);
      }

      setToast(`Ball recorded: ${event.label}`);
      const refreshed = await loadDetail(match.id);
      await syncMatchToBroadcast(refreshed);
      await fetchUndoHistory(match.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record delivery");
      await loadDetail(match.id);
    } finally {
      setBusy(false);
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
  const activeForm = activeInnings === 1 ? inn1 : inn2;
  const activeBattingTeam = match && activeForm?.teamId === String(match.awayTeamId) ? match.awayTeam : match?.homeTeam;
  const activeBowlingTeam = match && activeBattingTeam?.id === match.homeTeamId ? match.awayTeam : match?.homeTeam;

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
            {match && (
              <button
                type="button"
                className="button secondary"
                onClick={handleUndoLast}
                disabled={busy || undoTotal === 0}
                title={undoTotal > 0 ? `Undo last event: ${undoHistory[0]?.label || ""} (Ctrl+Z)` : "No events to undo"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  borderColor: undoTotal > 0 ? "rgba(239, 68, 68, 0.45)" : undefined,
                  color: undoTotal > 0 ? "#ef4444" : undefined,
                  fontWeight: 700,
                }}
              >
                <Undo2 size={14} />
                <span>Undo Last</span>
                {undoTotal > 0 && (
                  <span
                    className="badge danger"
                    style={{ fontSize: "10px", padding: "1px 6px", lineHeight: "1.2" }}
                  >
                    {undoTotal}
                  </span>
                )}
              </button>
            )}
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
                      onClick={() => syncMatchToBroadcast()}
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
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <h4>Quick Ball-by-Ball Scoring</h4>
                    <span className="badge brand" style={{ fontSize: "10px" }}>
                      Active Innings: {activeInnings}
                    </span>
                    {undoTotal > 0 && undoHistory[0] && (
                      <span
                        className="badge"
                        style={{
                          fontSize: "11px",
                          color: "var(--muted)",
                          maxWidth: 320,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={undoHistory[0].label}
                      >
                        Last: <strong>{undoHistory[0].label}</strong>
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    {undoTotal > 0 && (
                      <button
                        type="button"
                        className="button compact secondary"
                        onClick={handleUndoLast}
                        disabled={busy}
                        title="Undo last recorded event (Ctrl+Z)"
                        style={{
                          color: "#ef4444",
                          borderColor: "rgba(239, 68, 68, 0.45)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontWeight: 700,
                        }}
                      >
                        <Undo2 size={12} /> Undo
                      </button>
                    )}
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
                      {activeBattingTeam?.players?.map((p) => (
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
                      {activeBattingTeam?.players?.map((p) => (
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
                      {activeBowlingTeam?.players?.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.displayName} ({humanRole(p.role)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* INSTANT SCORING BUTTONS */}
                <div className="ball-stepper-grid">
                  {QUICK_BALL_EVENTS.map((event) => (
                    <button
                      key={event.type}
                      type="button"
                      className={`ball-stepper-btn ${event.className || ""}`}
                      onClick={() => handleQuickBall(event.type)}
                      disabled={busy}
                      data-ball-type={event.type}
                    >
                      {event.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="ball-stepper-btn undo"
                    onClick={handleUndoLast}
                    disabled={busy || undoTotal === 0}
                    title="Undo last recorded ball or scoring action (Ctrl+Z)"
                    style={{
                      background: undoTotal > 0 ? "rgba(239, 68, 68, 0.16)" : "rgba(255, 255, 255, 0.04)",
                      color: undoTotal > 0 ? "#f87171" : "var(--muted)",
                      borderColor: undoTotal > 0 ? "rgba(239, 68, 68, 0.45)" : "rgba(255, 255, 255, 0.08)",
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <Undo2 size={14} />
                    <span>UNDO</span>
                    {undoTotal > 0 && <span style={{ opacity: 0.85, fontSize: "11px" }}>({undoTotal})</span>}
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
