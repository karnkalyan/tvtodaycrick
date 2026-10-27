"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowLeftRight,
  Award,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Flame,
  Minus,
  Plus,
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
import { useSeason } from "@/components/season-context";
import {
  applyCustomExtra,
  applyQuickBall,
  shouldSwapStrike,
  QUICK_BALL_EVENTS,
  type QuickBallType,
  type ExtraCategory,
} from "@/lib/score-events";
import { getFranchiseBrand } from "@/lib/npl-franchises";
import { readSelectedMatchId, writeSelectedMatchId } from "@/lib/selected-match";
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

const chaseTargetFor = (firstInnings: InnForm): string => {
  const isFirstInningsDone =
    firstInnings.status === "COMPLETED" ||
    Number(firstInnings.wickets) >= 10 ||
    Number(firstInnings.balls) >= 120;
  return isFirstInningsDone ? String(Number(firstInnings.runs || 0) + 1) : "";
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
  const tossBattingTeamId = match.toss
    ? match.toss.decision === "BAT"
      ? match.toss.winnerTeamId
      : match.toss.winnerTeamId === match.homeTeamId
        ? match.awayTeamId
        : match.homeTeamId
    : match.homeTeamId;
  const firstBattingTeamId = match.innings?.find((x) => x.inningsNumber === 1)?.teamId || tossBattingTeamId;
  const opposingTeamId = firstBattingTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;

  let teamId: number;
  if (n === 1) {
    teamId = i?.teamId || firstBattingTeamId;
  } else {
    teamId = (i?.teamId && i.teamId !== firstBattingTeamId) ? i.teamId : opposingTeamId;
  }

  const inn1Record = match.innings?.find((x) => x.inningsNumber === 1);
  const isInn1Complete =
    inn1Record?.status === "COMPLETED" ||
    (inn1Record?.wickets ?? 0) >= 10 ||
    (inn1Record?.balls ?? 0) >= 120 ||
    match.status === "COMPLETED";
  const hasInn2Started = (i?.balls ?? 0) > 0 || (i?.runs ?? 0) > 0 || (i?.wickets ?? 0) > 0 || i?.status === "LIVE" || i?.status === "COMPLETED";

  return {
    teamId: String(teamId),
    runs: String(i?.runs ?? 0),
    wickets: String(i?.wickets ?? 0),
    balls: String(i?.balls ?? 0),
    extras: String(i?.extras ?? 0),
    target: n === 2 && (isInn1Complete || hasInn2Started) && i?.target ? String(i.target) : "",
    status:
      i?.status ??
      (n === 1 && match.status === "LIVE" ? "LIVE" : "NOT_STARTED"),
  };
};

export default function ScoreEntryPage() {
  const season = useSeason();
  const cricNepalAutoSync = season.autoSync;
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

  // Custom Extras & Leg Bye workspace state
  const [showCustomExtra, setShowCustomExtra] = useState(false);
  const [extraCategory, setExtraCategory] = useState<ExtraCategory>("LB");
  const [extraRuns, setExtraRuns] = useState<number>(1);
  const [extraBatRuns, setExtraBatRuns] = useState<number>(0);
  const [extraIsLegal, setExtraIsLegal] = useState<boolean>(true);
  const [showDirectAdjust, setShowDirectAdjust] = useState(false);
  const [directAdjustRuns, setDirectAdjustRuns] = useState<string>("1");

  // CricNepal Auto-Sync state & continuity
  const [isCricNepalSyncing, setIsCricNepalSyncing] = useState(false);
  const [cricNepalLastSync, setCricNepalLastSync] = useState<string | null>(null);
  const [cricNepalSyncMsg, setCricNepalSyncMsg] = useState<string | null>(null);

  // WebSocket sync connection
  const [wsConnected, setWsConnected] = useState(false);
  const [wsEnginePort, setWsEnginePort] = useState<string>("");
  const wsRef = useRef<WebSocket | null>(null);
  const selectedIdRef = useRef<number | null>(null);
  const loadDetailRef = useRef<((id: number) => Promise<void>) | null>(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

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

        ws.onopen = () => {
          setWsConnected(true);
          try {
            const parsed = new URL(wsUrl);
            setWsEnginePort(parsed.port ? `:${parsed.port}` : "LIVE");
          } catch {
            setWsEnginePort("LIVE");
          }
        };
        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.action === "updateData" || msg.action === "init") {
              const incomingState = msg.data || msg.state || msg;
              const incomingMatchId = Number(incomingState?.match?.matchId || 0);
              const currentId = Number(selectedIdRef.current || 0);
              if (currentId > 0 && (!incomingMatchId || incomingMatchId === currentId)) {
                loadDetailRef.current?.(currentId);
              }
            }
          } catch {
            // ignore non-json frames
          }
        };
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

      // Restore the shared controller/score-entry match. Only use the first
      // fixture when no valid default has ever been selected.
      if (!selectedId && result.items.length > 0) {
        let defaultMatchId = readSelectedMatchId();
        if (!defaultMatchId) {
          try {
            const broadcast = await api<any>("/api/broadcast/state");
            const broadcastMatchId = Number(broadcast?.state?.match?.matchId);
            defaultMatchId = Number.isInteger(broadcastMatchId) && broadcastMatchId > 0
              ? broadcastMatchId
              : null;
          } catch {}
        }
        const defaultMatch = result.items.find((item) => item.id === defaultMatchId) || result.items[0];
        writeSelectedMatchId(defaultMatch.id);
        setSelectedId(defaultMatch.id);
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
  const loadDetail = useCallback(
    async (
      id: number,
      liveHint?: { strikerName?: string; nonStrikerName?: string; bowlerName?: string },
    ) => {
      setDetailLoading(true);
      try {
        const [m, broadcastRes] = await Promise.all([
          api<Match>(`/api/matches/${id}`),
          !liveHint ? api<any>(`/api/broadcast/state?matchId=${id}`).catch(() => null) : Promise.resolve(null),
        ]);
        setMatch(m);
        const i1 = toInn(m, 1);
        const i2 = toInn(m, 2);
        if (!i2.target) i2.target = chaseTargetFor(i1);
        setInn1(i1);
        setInn2(i2);

        const nextActiveInnings: 1 | 2 =
          i2.status === "LIVE" ||
          (Number(i2.balls) > 0 && Number(i2.runs) > 0) ||
          (m.status === "COMPLETED" && (Number(i2.balls) > 0 || Number(i2.runs) > 0))
            ? 2
            : 1;
        setActiveInnings(nextActiveInnings);

        const homeTeam = m.homeTeam;
        const awayTeam = m.awayTeam;
        const activeForm = nextActiveInnings === 1 ? i1 : i2;
        const battingTeam = activeForm.teamId === String(homeTeam.id) ? homeTeam : awayTeam;
        const bowlingTeam = activeForm.teamId === String(homeTeam.id) ? awayTeam : homeTeam;

        const hint = liveHint || {
          strikerName: broadcastRes?.state?.live?.strikerName,
          nonStrikerName: broadcastRes?.state?.live?.nonStrikerName,
          bowlerName: broadcastRes?.state?.live?.bowlerName,
        };

        const findPlayerIdByName = (players: Player[] | undefined, rawName?: string): string => {
          if (!players?.length || !rawName) return "";
          const norm = rawName.trim().toLowerCase();
          if (!norm || norm === "batter" || norm === "non-striker" || norm === "bowler") return "";
          const exact = players.find((p) => p.displayName.trim().toLowerCase() === norm);
          if (exact) return String(exact.id);
          const partial = players.find(
            (p) =>
              p.displayName.toLowerCase().includes(norm) ||
              norm.includes(p.displayName.toLowerCase()),
          );
          return partial ? String(partial.id) : "";
        };

        const innStats = (m.stats || []).filter((s) => Number(s.innings) === nextActiveInnings);
        const activeBatStats = innStats
          .filter((s) => String(s.teamId) === String(battingTeam.id) && !s.isOut && ((s.ballsFaced || 0) > 0 || (s.runs || 0) > 0));
        const activeBowlStats = innStats
          .filter((s) => String(s.teamId) === String(bowlingTeam.id) && (s.ballsBowled || 0) > 0)
          .sort((a, b) => {
            const aMidOver = (a.ballsBowled || 0) % 6 !== 0 ? 1 : 0;
            const bMidOver = (b.ballsBowled || 0) % 6 !== 0 ? 1 : 0;
            if (aMidOver !== bMidOver) return bMidOver - aMidOver;
            return (b.ballsBowled || 0) - (a.ballsBowled || 0);
          });

        if (battingTeam.players && battingTeam.players.length > 0) {
          const battingIds = new Set(battingTeam.players.map((player) => String(player.id)));
          const hintStrikerId = findPlayerIdByName(battingTeam.players, hint.strikerName)
            || (activeBatStats[0] ? String(activeBatStats[0].playerId) : "");
          const hintNonStrikerId = findPlayerIdByName(battingTeam.players, hint.nonStrikerName)
            || (activeBatStats[1] ? String(activeBatStats[1].playerId) : "");

          setStrikerId((current) => {
            if (hintStrikerId && battingIds.has(hintStrikerId)) return hintStrikerId;
            return battingIds.has(current) ? current : String(battingTeam.players?.[0]?.id || "");
          });
          setNonStrikerId((current) => {
            if (hintNonStrikerId && battingIds.has(hintNonStrikerId) && hintNonStrikerId !== hintStrikerId) {
              return hintNonStrikerId;
            }
            return battingIds.has(current) ? current : String(battingTeam.players?.[1]?.id || "");
          });
        }
        if (bowlingTeam.players && bowlingTeam.players.length > 0) {
          const bowlingIds = new Set(bowlingTeam.players.map((player) => String(player.id)));
          const hintBowlerId = findPlayerIdByName(bowlingTeam.players, hint.bowlerName)
            || (activeBowlStats[0] ? String(activeBowlStats[0].playerId) : "");
          setBowlerId((current) => {
            if (hintBowlerId && bowlingIds.has(hintBowlerId)) return hintBowlerId;
            return bowlingIds.has(current) ? current : String(bowlingTeam.players?.[0]?.id || "");
          });
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
    },
    [fetchUndoHistory],
  );

  useEffect(() => {
    loadDetailRef.current = async (id: number) => {
      await loadDetail(id);
    };
  }, [loadDetail]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  // CricNepal Match-Level Live Sync
  const handleCricNepalSync = useCallback(
    async (force = false, publishBroadcast = false) => {
      if (!selectedId) return;
      setIsCricNepalSyncing(true);
      setCricNepalSyncMsg(null);
      try {
        const res = await api<{
          success: boolean;
          sourceUrl: string;
          match: Match;
          broadcastState?: any;
          parsed: any;
        }>(`/api/matches/${selectedId}/sync-source`, {
          method: "POST",
          body: jsonBody({ forceOverwrite: true }),
        });

        if (res.match) {
          const liveHint = {
            strikerName:
              res.parsed?.liveSummary?.currentBatters?.[0]?.name ||
              res.broadcastState?.live?.strikerName,
            nonStrikerName:
              res.parsed?.liveSummary?.currentBatters?.[1]?.name ||
              res.broadcastState?.live?.nonStrikerName,
            bowlerName:
              res.parsed?.liveSummary?.currentBowler?.name ||
              res.broadcastState?.live?.bowlerName,
          };
          const fresh = await loadDetail(selectedId, liveHint);
          // Automatic source polling must not overwrite authoritative source
          // state with stale local player selections. Manual sync can publish
          // the score-entry state explicitly.
          if (publishBroadcast && !res.broadcastState) {
            await syncMatchToBroadcast(fresh || res.match);
          }
          const timeStr = new Date().toLocaleTimeString();
          setCricNepalLastSync(timeStr);
          setCricNepalSyncMsg(`Synced with live source at ${timeStr}`);
        }
      } catch (err) {
        console.warn("CricNepal match sync failed:", err);
        setCricNepalSyncMsg(err instanceof Error ? err.message : "Sync failed");
      } finally {
        setIsCricNepalSyncing(false);
      }
    },
    [selectedId, loadDetail]
  );

  // Auto-Sync polling loop while enabled
  useEffect(() => {
    if (!cricNepalAutoSync || !selectedId) return;
    void handleCricNepalSync(true, false);
    const timer = setInterval(() => {
      void handleCricNepalSync(true, false);
    }, 10000);
    return () => clearInterval(timer);
  }, [cricNepalAutoSync, selectedId, handleCricNepalSync]);

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
  const syncMatchToBroadcast = async (
    freshMatch?: Match,
    inningsOverride?: 1 | 2,
    batterIds?: { strikerId: string; nonStrikerId: string },
  ) => {
    const sourceMatch = freshMatch || match;
    if (!sourceMatch) return;
    const sourceInn1 = freshMatch ? toInn(freshMatch, 1) : inn1;
    const sourceInn2 = freshMatch ? toInn(freshMatch, 2) : inn2;
    if (!sourceInn1 || !sourceInn2) return;
    const effActiveInnings = inningsOverride || activeInnings;
    const current = effActiveInnings === 1 ? sourceInn1 : sourceInn2;
    const battingTeam = current.teamId === String(sourceMatch.homeTeamId) ? sourceMatch.homeTeam : sourceMatch.awayTeam;
    const bowlingTeam = current.teamId === String(sourceMatch.homeTeamId) ? sourceMatch.awayTeam : sourceMatch.homeTeam;

    const battingBrand = getFranchiseBrand(battingTeam.name);
    const bowlingBrand = getFranchiseBrand(bowlingTeam.name);

    const bOvers = Number(current.balls) || 0;
    const ovStr = `${Math.floor(bOvers / 6)}.${bOvers % 6}`;
    const inningsStarted = current.status === "LIVE" || bOvers > 0 || Number(current.runs) > 0 || Number(current.wickets) > 0;
    const currentRunRate = bOvers > 0 ? (Number(current.runs) / (bOvers / 6)).toFixed(2) : "0.00";
    const target = Number(current.target) || 0;
    const runsNeeded = target > 0 ? Math.max(0, target - Number(current.runs)) : 0;
    const ballsRemaining = Math.max(0, 120 - bOvers);
    const rrr = target > 0 && ballsRemaining > 0 ? ((runsNeeded / ballsRemaining) * 6).toFixed(2) : "-";

    const isMatchCompleted = sourceMatch.status === "COMPLETED";

    const inningsLabel = isMatchCompleted
      ? `FINAL RESULT · ${sourceMatch.resultText || `${battingTeam.name} won`}`
      : inningsStarted
        ? (effActiveInnings === 1 ? "1ST INNINGS" : "CHASE · 2ND INNINGS")
        : "MATCH SCHEDULED";

    const requirement = isMatchCompleted
      ? (sourceMatch.resultText || `${battingTeam.name} won`)
      : target > 0
        ? `${battingTeam.name.toUpperCase()} NEED ${runsNeeded} RUNS TO WIN`
        : inningsStarted
          ? `${battingTeam.name.toUpperCase()} · 1ST INNINGS`
          : `${battingTeam.name.toUpperCase()} vs ${bowlingTeam.name.toUpperCase()} · MATCH SCHEDULED`;

    const rateText = isMatchCompleted
      ? "FINAL RESULT"
      : inningsStarted
        ? `CRR ${currentRunRate}${target > 0 ? ` · RRR ${rrr}` : ""}`
        : "MATCH NOT STARTED";

    const tossText = sourceMatch.toss
      ? `${sourceMatch.toss.winnerTeamId === sourceMatch.homeTeamId ? sourceMatch.homeTeam.name : sourceMatch.awayTeam.name} WON TOSS & ELECTED TO ${sourceMatch.toss.decision}`
      : "TOSS NOT YET RECORDED";

    const stats = Array.isArray(sourceMatch.stats) ? sourceMatch.stats : [];
    const innStats = stats.filter((s) => Number(s.innings) === effActiveInnings);

    // Fall of Wickets
    const dismissed = innStats
      .filter((s) => String(s.teamId) === String(battingTeam.id) && s.isOut)
      .sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    const fow: Array<[string, string, string]> = dismissed.map((s, idx) => [
      `${idx + 1}/${s.runs}`,
      s.player?.displayName || `Batter ${idx + 1}`,
      `${Math.floor((s.ballsFaced || 0) / 6)}.${(s.ballsFaced || 0) % 6} OV`,
    ]);

    // Batting scorecard
    const summary: Array<[string, string, string, string, string, string]> = innStats
      .filter((s) => String(s.teamId) === String(battingTeam.id))
      .map((s) => {
        const sr = (s.ballsFaced || 0) > 0 ? (((s.runs || 0) / (s.ballsFaced || 1)) * 100).toFixed(1) : "0.0";
        return [
          s.player?.displayName || "Player",
          `${s.runs || 0}${s.isOut ? "" : "*"}`,
          String(s.ballsFaced || 0),
          String(s.fours || 0),
          String(s.sixes || 0),
          sr,
        ];
      });

    // Bowling scorecard
    const bowling: Array<[string, string, string, string, string, string]> = innStats
      .filter((s) => String(s.teamId) === String(bowlingTeam.id) && (s.ballsBowled || 0) > 0)
      .map((s) => {
        const ov = `${Math.floor((s.ballsBowled || 0) / 6)}.${(s.ballsBowled || 0) % 6}`;
        const econ = (s.ballsBowled || 0) > 0 ? (((s.runsConceded || 0) / ((s.ballsBowled || 1) / 6))).toFixed(2) : "0.00";
        return [
          s.player?.displayName || "Bowler",
          ov,
          String(s.maidens || 0),
          String(s.runsConceded || 0),
          String(s.wickets || 0),
          econ,
        ];
      });

    const effectiveStrikerId = batterIds?.strikerId ?? strikerId;
    const effectiveNonStrikerId = batterIds?.nonStrikerId ?? nonStrikerId;
    const striker = battingTeam.players?.find((p) => String(p.id) === effectiveStrikerId);
    const nonStriker = battingTeam.players?.find((p) => String(p.id) === effectiveNonStrikerId);
    const bowler = bowlingTeam.players?.find((p) => String(p.id) === bowlerId);

    const strikerStat = innStats.find((s) => String(s.playerId) === effectiveStrikerId);
    const nonStrikerStat = innStats.find((s) => String(s.playerId) === effectiveNonStrikerId);
    const bowlerStat = innStats.find((s) => String(s.playerId) === bowlerId);

    const currentOverIdx = Math.floor(Math.max(0, bOvers - 1) / 6);
    const recentEvents = ((sourceMatch as any).scoreEvents || [])
      .filter((e: any) => (e.innings === undefined || e.innings === effActiveInnings) && e.overNumber === currentOverIdx)
      .sort((a: any, b: any) => (a.ballNumber || 0) - (b.ballNumber || 0) || (a.id || 0) - (b.id || 0))
      .map((e: any) => {
        if (e.isWicket) return "W";
        if (e.extraType === "WIDE") return e.runs > 1 ? `${e.runs}WD` : "WD";
        if (e.extraType === "NO_BALL") return e.runs > 1 ? `${e.runs}NB` : "NB";
        if (e.extraType === "BYE") return `${e.runs || 1}B`;
        if (e.extraType === "LEG_BYE") return `${e.runs || 1}LB`;
        return String(e.runs ?? 0);
      });

    const payload = {
      match: {
        matchId: sourceMatch.id,
        teamA: battingBrand.code,
        teamB: bowlingBrand.code,
        teamAName: battingTeam.name,
        teamBName: bowlingTeam.name,
        inningsNumber: effActiveInnings,
      },
      score: {
        runs: Number(current.runs) || 0,
        wickets: Number(current.wickets) || 0,
        overs: ovStr,
        target: target || null,
        ...(recentEvents.length > 0 ? { recent: recentEvents } : bOvers === 0 ? { recent: ["-", "-", "-", "-", "-", "-"] } : {}),
      },
      live: {
        strikerName: striker?.displayName?.toUpperCase() || innStats[0]?.player?.displayName?.toUpperCase() || "BATTER",
        strikerRuns: String(strikerStat?.runs ?? innStats[0]?.runs ?? 0),
        strikerBalls: String(strikerStat?.ballsFaced ?? innStats[0]?.ballsFaced ?? 0),
        nonStrikerName: nonStriker?.displayName?.toUpperCase() || innStats[1]?.player?.displayName?.toUpperCase() || "NON-STRIKER",
        nonStrikerRuns: String(nonStrikerStat?.runs ?? innStats[1]?.runs ?? 0),
        nonStrikerBalls: String(nonStrikerStat?.ballsFaced ?? innStats[1]?.ballsFaced ?? 0),
        bowlerName: bowler?.displayName?.toUpperCase() || "BOWLER",
        bowlerFigures: `${bowlerStat?.wickets ?? 0}/${bowlerStat?.runsConceded ?? 0}`,
        bowlerOvers: `${Math.floor((bowlerStat?.ballsBowled ?? 0) / 6)}.${(bowlerStat?.ballsBowled ?? 0) % 6}`,
        matchLabel: `${sourceMatch.title} · MATCH ${sourceMatch.matchNumber || "01"}`,
        venue: sourceMatch.venue || "TU INTERNATIONAL CRICKET GROUND, KIRTIPUR",
        requirement,
        innings: inningsLabel,
        rateText,
        target: target ? String(target) : "-",
        tossText,
      },
      fow,
      summary,
      bowling,
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
    if (!match || !f || !inn1 || !inn2) return;
    setBusy(true);
    setError("");
    try {
      const group = undoGroup || `innings-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const label = undoLabel || "Innings details saved";
      const nextInn2 = { ...inn2, target: chaseTargetFor(inn1) };
      await Promise.all([
        api("/api/innings", { method: "POST", body: jsonBody(inningsPayload(1, inn1, group, label)) }),
        api("/api/innings", { method: "POST", body: jsonBody(inningsPayload(2, nextInn2, group, label)) }),
      ]);
      setToast(`All innings details saved from Innings ${n}`);
      const refreshed = await loadDetail(match.id);
      await syncMatchToBroadcast(refreshed);
      await fetchUndoHistory(match.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Innings save failed");
    } finally {
      setBusy(false);
    }
  };

  const inningsPayload = (n: 1 | 2, f: InnForm, undoGroup?: string, undoLabel?: string) => ({
    matchId: match?.id,
    teamId: Number(f.teamId),
    inningsNumber: n,
    runs: Number(f.runs),
    wickets: Number(f.wickets),
    balls: Number(f.balls),
    extras: Number(f.extras),
    target: n === 2 && f.target ? Number(f.target) : null,
    status: f.status,
    undoGroup,
    undoLabel,
  });

  // Swap only the batting-team assignments. The runs, wickets, balls, extras,
  // target, and status remain attached to their innings number.
  const handleSwapInningsTeams = async () => {
    if (!match || !inn1 || !inn2 || busy) return;
    const nextInn1 = { ...inn1, teamId: inn2.teamId };
    const nextInn2 = { ...inn2, teamId: inn1.teamId };
    const undoGroup = `swap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const undoLabel = "Swapped innings batting teams";

    setBusy(true);
    setError("");
    setInn1(nextInn1);
    setInn2(nextInn2);
    try {
      await Promise.all([
        api("/api/innings", { method: "POST", body: jsonBody(inningsPayload(1, nextInn1, undoGroup, undoLabel)) }),
        api("/api/innings", { method: "POST", body: jsonBody(inningsPayload(2, nextInn2, undoGroup, undoLabel)) }),
      ]);
      setToast(`Batting order swapped: ${nextInn1.teamId === String(match.homeTeamId) ? match.homeTeam.name : match.awayTeam.name} will bat first`);
      const refreshed = await loadDetail(match.id);
      await syncMatchToBroadcast(refreshed);
      await fetchUndoHistory(match.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not swap innings teams");
      await loadDetail(match.id);
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

    const isInn1Done = activeInnings === 1 && (result.wickets >= 10 || result.balls >= 120);
    if (isInn1Done) {
      nextInn.status = "COMPLETED";
    }
    const nextChaseTarget = activeInnings === 1
      ? (isInn1Done ? String(result.runs + 1) : "")
      : inn1 ? (inn1.runs ? String(Number(inn1.runs) + 1) : chaseTargetFor(inn1)) : "";
    nextInn.target = activeInnings === 2 ? (nextInn.target || nextChaseTarget) : "";

    if (activeInnings === 1) {
      setInn1(nextInn);
      setInn2((value) => value ? { ...value, target: nextChaseTarget } : value);
    } else {
      setInn2(nextInn);
    }

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
    const ballLabel = event.label;
    const undoLabel = `Ball: ${ballLabel} (${result.runs}/${result.wickets} in ${ovStr} ov)`;

    try {
      await api("/api/innings", {
        method: "POST",
        body: jsonBody(inningsPayload(activeInnings, nextInn, undoGroup, undoLabel)),
      });

      if (activeInnings === 1 && isInn1Done && inn2) {
        const nextSecondInnings = { ...inn2, target: nextChaseTarget };
        await api("/api/innings", {
          method: "POST",
          body: jsonBody(inningsPayload(2, nextSecondInnings, undoGroup, undoLabel)),
        });
      }

      // Update the striker without erasing fielding/bowling values already in
      // the same player-match row.
      // NOTE: Extra runs (Leg Byes, Byes, Wides, etc.) are NOT counted towards the batsman's score!
      if (strikerId && event.legalBalls > 0) {
        const existing = match.stats?.find(
          (entry) => String(entry.playerId) === strikerId && Number(entry.innings) === activeInnings,
        );
        const strikerRunsToAdd = event.isExtra ? 0 : event.runs;
        const foursToAdd = event.isExtra ? 0 : (event.isFour ? 1 : 0);
        const sixesToAdd = event.isExtra ? 0 : (event.isSix ? 1 : 0);
        await api("/api/stats", {
          method: "POST",
          body: jsonBody({
            matchId: match.id,
            playerId: Number(strikerId),
            teamId: Number(current.teamId),
            innings: activeInnings,
            runs: (existing?.runs || 0) + strikerRunsToAdd,
            ballsFaced: (existing?.ballsFaced || 0) + event.legalBalls,
            fours: (existing?.fours || 0) + foursToAdd,
            sixes: (existing?.sixes || 0) + sixesToAdd,
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
        // In cricket rules, Leg Byes and Byes are not charged to the bowler's runs conceded
        const bowlerRunsConceded = (event.isLegBye || event.isBye) ? 0 : event.runs;
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
            runsConceded: (existing?.runsConceded || 0) + bowlerRunsConceded,
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
      const swapStrike = type !== "wicket" && shouldSwapStrike(event.strikeRuns, overEnded);
      const nextBatterIds = swapStrike
        ? { strikerId: nonStrikerId, nonStrikerId: strikerId }
        : { strikerId, nonStrikerId };
      if (swapStrike) {
        setStrikerId(nextBatterIds.strikerId);
        setNonStrikerId(nextBatterIds.nonStrikerId);
      }

      setToast(`Ball recorded: ${event.label}${event.isExtra ? " (Extra - not counted on batter)" : ""}`);
      const refreshed = await loadDetail(match.id);
      await syncMatchToBroadcast(refreshed, activeInnings, nextBatterIds);
      await fetchUndoHistory(match.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record delivery");
      await loadDetail(match.id);
    } finally {
      setBusy(false);
    }
  };

  const handleSelectExtraCategory = (cat: ExtraCategory) => {
    setExtraCategory(cat);
    if (cat === "LB" || cat === "B") {
      setExtraIsLegal(true);
      setExtraBatRuns(0);
    } else if (cat === "NB") {
      setExtraIsLegal(false);
    } else {
      setExtraIsLegal(false);
      setExtraBatRuns(0);
    }
  };

  // Record custom extra (LB, Bye, Wide, No Ball, Penalty) with user-defined runs
  const handleCustomExtraBall = async () => {
    if (!match || busy) return;
    const current = activeInnings === 1 ? inn1 : inn2;
    if (!current) return;
    const runs = Math.max(0, Number(extraRuns) || 0);

    setBusy(true);
    setError("");

    const isLegal = extraIsLegal;
    const result = applyCustomExtra(
      {
        runs: Number(current.runs) || 0,
        wickets: Number(current.wickets) || 0,
        balls: Number(current.balls) || 0,
        extras: Number(current.extras) || 0,
      },
      {
        category: extraCategory,
        runs,
        isLegal,
        batRuns: extraCategory === "NB" ? extraBatRuns : 0,
      }
    );

    const nextInn: InnForm = {
      ...current,
      runs: String(result.runs),
      wickets: String(result.wickets),
      balls: String(result.balls),
      extras: String(result.extras),
      status: "LIVE",
    };

    const isInn1Done = activeInnings === 1 && (result.wickets >= 10 || result.balls >= 120);
    if (isInn1Done) {
      nextInn.status = "COMPLETED";
    }
    const nextChaseTarget = activeInnings === 1
      ? (isInn1Done ? String(result.runs + 1) : "")
      : inn1 ? (inn1.runs ? String(Number(inn1.runs) + 1) : chaseTargetFor(inn1)) : "";
    nextInn.target = activeInnings === 2 ? (nextInn.target || nextChaseTarget) : "";

    if (activeInnings === 1) {
      setInn1(nextInn);
      setInn2((value) => value ? { ...value, target: nextChaseTarget } : value);
    } else {
      setInn2(nextInn);
    }

    dispatchBroadcastCue({ action: "action", name: result.broadcastAction });
    const ovStr = `${Math.floor(result.balls / 6)}.${result.balls % 6}`;
    dispatchBroadcastCue({
      action: "scoreUpdate",
      data: { runs: result.runs, wickets: result.wickets, overs: ovStr },
    });

    const undoGroup = `extra-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const catLabel = extraCategory === "LB" ? "Leg Bye" : extraCategory === "B" ? "Bye" : extraCategory === "WD" ? "Wide" : extraCategory === "NB" ? "No Ball" : "Penalty";
    const undoLabel = `Extra: +${runs} ${catLabel} (${result.runs}/${result.wickets} in ${ovStr} ov)`;

    try {
      await api("/api/innings", {
        method: "POST",
        body: jsonBody(inningsPayload(activeInnings, nextInn, undoGroup, undoLabel)),
      });

      if (activeInnings === 1 && isInn1Done && inn2) {
        const nextSecondInnings = { ...inn2, target: nextChaseTarget };
        await api("/api/innings", {
          method: "POST",
          body: jsonBody(inningsPayload(2, nextSecondInnings, undoGroup, undoLabel)),
        });
      }

      // Striker: If legal delivery, striker faced a delivery (+1 ball).
      // If No Ball with bat runs, credit the bat runs to striker!
      if (strikerId && (isLegal || (extraCategory === "NB" && result.strikerRuns > 0))) {
        const existing = match.stats?.find(
          (entry) => String(entry.playerId) === strikerId && Number(entry.innings) === activeInnings,
        );
        const strikerRunsToAdd = result.strikerRuns || 0;
        const ballsFacedToAdd = isLegal ? 1 : (result.strikerRuns > 0 ? 1 : 0);
        const foursToAdd = strikerRunsToAdd >= 4 && strikerRunsToAdd < 6 ? 1 : 0;
        const sixesToAdd = strikerRunsToAdd >= 6 ? 1 : 0;

        await api("/api/stats", {
          method: "POST",
          body: jsonBody({
            matchId: match.id,
            playerId: Number(strikerId),
            teamId: Number(current.teamId),
            innings: activeInnings,
            runs: (existing?.runs || 0) + strikerRunsToAdd,
            ballsFaced: (existing?.ballsFaced || 0) + ballsFacedToAdd,
            fours: (existing?.fours || 0) + foursToAdd,
            sixes: (existing?.sixes || 0) + sixesToAdd,
            wickets: existing?.wickets || 0,
            ballsBowled: existing?.ballsBowled || 0,
            runsConceded: existing?.runsConceded || 0,
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

      // Bowler: For Leg Bye, Bye, or Penalty, runs are NOT conceded by bowler.
      if (bowlerId) {
        const existing = match.stats?.find(
          (entry) => String(entry.playerId) === bowlerId && Number(entry.innings) === activeInnings,
        );
        const bowlingTeamId = Number(current.teamId) === match.homeTeamId ? match.awayTeamId : match.homeTeamId;
        const runsConceded = (extraCategory === "LB" || extraCategory === "B" || extraCategory === "PEN") ? 0 : runs;
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
            wickets: existing?.wickets || 0,
            ballsBowled: (existing?.ballsBowled || 0) + (isLegal ? 1 : 0),
            runsConceded: (existing?.runsConceded || 0) + runsConceded,
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

      const overEnded = isLegal && result.balls % 6 === 0;
      const swapStrike = shouldSwapStrike(result.strikeRuns, overEnded);
      const nextBatterIds = swapStrike
        ? { strikerId: nonStrikerId, nonStrikerId: strikerId }
        : { strikerId, nonStrikerId };
      if (swapStrike) {
        setStrikerId(nextBatterIds.strikerId);
        setNonStrikerId(nextBatterIds.nonStrikerId);
      }

      setToast(`Extra recorded: +${runs} ${catLabel} (not counted on player)`);
      setShowCustomExtra(false);
      const refreshed = await loadDetail(match.id);
      await syncMatchToBroadcast(refreshed, activeInnings, nextBatterIds);
      await fetchUndoHistory(match.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record extra delivery");
      await loadDetail(match.id);
    } finally {
      setBusy(false);
    }
  };

  // Direct manual extras adjustment without bowling a ball
  const handleDirectExtrasAdjust = async (runsDelta: number) => {
    if (!match || busy || runsDelta === 0) return;
    const current = activeInnings === 1 ? inn1 : inn2;
    if (!current) return;

    setBusy(true);
    setError("");

    const nextRuns = Math.max(0, Number(current.runs) + runsDelta);
    const nextExtras = Math.max(0, Number(current.extras) + runsDelta);

    const nextInn: InnForm = {
      ...current,
      runs: String(nextRuns),
      extras: String(nextExtras),
      status: "LIVE",
    };

    const isInn1Done = activeInnings === 1 && (Number(current.wickets) >= 10 || Number(current.balls) >= 120 || current.status === "COMPLETED");
    const nextChaseTarget = activeInnings === 1
      ? (isInn1Done ? String(nextRuns + 1) : "")
      : inn1 ? (inn1.runs ? String(Number(inn1.runs) + 1) : chaseTargetFor(inn1)) : "";
    nextInn.target = activeInnings === 2 ? (nextInn.target || nextChaseTarget) : "";

    if (activeInnings === 1) {
      setInn1(nextInn);
      setInn2((value) => value ? { ...value, target: nextChaseTarget } : value);
    } else {
      setInn2(nextInn);
    }

    const ovStr = `${Math.floor(Number(current.balls) / 6)}.${Number(current.balls) % 6}`;
    dispatchBroadcastCue({
      action: "scoreUpdate",
      data: { runs: nextRuns, wickets: Number(current.wickets), overs: ovStr },
    });

    const undoGroup = `adj-extra-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const undoLabel = `Manual Extras: ${runsDelta > 0 ? `+${runsDelta}` : runsDelta} runs (Total extras: ${nextExtras})`;

    try {
      await api("/api/innings", {
        method: "POST",
        body: jsonBody(inningsPayload(activeInnings, nextInn, undoGroup, undoLabel)),
      });

      if (activeInnings === 1 && isInn1Done && inn2) {
        const nextSecondInnings = { ...inn2, target: nextChaseTarget };
        await api("/api/innings", {
          method: "POST",
          body: jsonBody(inningsPayload(2, nextSecondInnings, undoGroup, undoLabel)),
        });
      }

      setToast(`Manual extras updated: ${runsDelta > 0 ? `+${runsDelta}` : runsDelta} (No player affected)`);
      setShowDirectAdjust(false);
      const refreshed = await loadDetail(match.id);
      await syncMatchToBroadcast(refreshed);
      await fetchUndoHistory(match.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update extras");
      await loadDetail(match.id);
    } finally {
      setBusy(false);
    }
  };

  const setI = (which: 1 | 2, key: keyof InnForm, value: string) => {
    if (key === "teamId" && match) {
      const otherTeamId = value === String(match.homeTeamId) ? String(match.awayTeamId) : String(match.homeTeamId);
      if (which === 1) {
        setInn1((s) => (s ? { ...s, teamId: value } : s));
        setInn2((s) => (s ? { ...s, teamId: otherTeamId } : s));
      } else {
        setInn2((s) => (s ? { ...s, teamId: value } : s));
        setInn1((s) => (s ? { ...s, teamId: otherTeamId } : s));
      }
      return;
    }
    if (which === 1 && inn1) {
      const next = { ...inn1, [key]: value };
      setInn1(next);
      if (["runs", "wickets", "balls", "status"].includes(key)) {
        setInn2((second) => second ? { ...second, target: chaseTargetFor(next) } : second);
      }
    } else if (which === 2) {
      setInn2((s) => (s ? { ...s, [key]: value } : s));
    }
  };

  const setS = <K extends keyof StatForm>(k: K, v: StatForm[K]) =>
    setStat((s) => ({ ...s, [k]: v }));

  if (!mounted || loading) {
    return <Spinner />;
  }

  // The hero follows batting order, not the fixture's home/away order.
  // Strictly enforce two distinct teams so both sides are guaranteed to show separate franchises.
  const firstInningsTeam = match && inn1?.teamId === String(match.awayTeamId) ? match.awayTeam : match?.homeTeam;
  const secondInningsTeam = match && firstInningsTeam?.id === match.homeTeamId ? match.awayTeam : match?.homeTeam;
  const activeBattingTeam = activeInnings === 2 ? secondInningsTeam : firstInningsTeam;
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
              <span>GFX ENGINE: {wsConnected ? `ONLINE (${wsEnginePort || "LIVE"})` : "OFFLINE"}</span>
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
                  onClick={() => {
                    writeSelectedMatchId(m.id);
                    setSelectedId(m.id);
                  }}
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
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <StatusPill status={match.status} />

                    {/* Manual Sync from CricNepal Button */}
                    <button
                      type="button"
                      className="button compact secondary"
                      onClick={() => void handleCricNepalSync(false, true)}
                      disabled={isCricNepalSyncing}
                      title="Fetch and merge latest CricNepal match score, toss, innings, and extras without wiping manual work"
                      style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
                    >
                      <RefreshCw size={12} className={isCricNepalSyncing ? "spin" : ""} />
                      <span>{isCricNepalSyncing ? "Syncing..." : "Sync CricNepal"}</span>
                    </button>

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
                  {/* FIRST-INNINGS TEAM */}
                  <div className="score-team-card">
                    <TeamMark team={firstInningsTeam || match.homeTeam} size="lg" />
                    <div className="score-team-meta">
                      <h3>{firstInningsTeam?.name}</h3>
                      <div className="score-big-score">
                        {`${inn1.runs}/${inn1.wickets}`}
                      </div>
                      <div className="score-overs-tag">
                        {inn1 ? (
                          <>
                            <Overs balls={Number(inn1.balls)} /> OVERS
                            {Number(inn1.balls) > 0 && ` · CRR ${(Number(inn1.runs) / (Number(inn1.balls) / 6)).toFixed(2)}`}
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

                  {/* SECOND-INNINGS TEAM */}
                  <div className="score-team-card away">
                    <TeamMark team={secondInningsTeam || match.awayTeam} size="lg" />
                    <div className="score-team-meta">
                      <h3>{secondInningsTeam?.name}</h3>
                      <div className="score-big-score">
                        {`${inn2.runs}/${inn2.wickets}`}
                      </div>
                      <div className="score-overs-tag">
                        {inn2 ? (
                          <>
                            <Overs balls={Number(inn2.balls)} /> OVERS
                            {Number(inn2.balls) > 0 && ` · CRR ${(Number(inn2.runs) / (Number(inn2.balls) / 6)).toFixed(2)}`}
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

                {/* CRICNEPAL AUTO-SYNC STATUS & CONTINUITY BAR */}
                {(cricNepalLastSync || cricNepalSyncMsg || cricNepalAutoSync) && (
                  <div
                    style={{
                      marginTop: "10px",
                      padding: "6px 14px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      background: "rgba(37, 99, 235, 0.08)",
                      border: "1px solid rgba(37, 99, 235, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: cricNepalAutoSync ? "#22c55e" : "#3b82f6",
                          display: "inline-block",
                        }}
                      />
                      <strong>CricNepal Auto-Sync:</strong>{" "}
                      {cricNepalSyncMsg || (cricNepalAutoSync ? "Active polling every 20s" : `Last synced at ${cricNepalLastSync}`)}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                      Manual edits preserved on sync · Auto & Manual continuous
                    </span>
                  </div>
                )}
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
                      title={event.isExtra ? `${event.label} (Extras - not counted on batter)` : event.label}
                    >
                      {event.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`ball-stepper-btn extra-toggle ${showCustomExtra ? "active" : ""}`}
                    onClick={() => {
                      setShowCustomExtra(!showCustomExtra);
                      setShowDirectAdjust(false);
                    }}
                    disabled={busy}
                    title="Open custom extra runs and leg-byes manager"
                  >
                    <Sliders size={13} style={{ marginRight: 6 }} />
                    <span>{showCustomExtra ? "Close Extra" : "Custom Extra (LB)..."}</span>
                  </button>
                  <button
                    type="button"
                    className={`ball-stepper-btn extra-toggle ${showDirectAdjust ? "active" : ""}`}
                    onClick={() => {
                      setShowDirectAdjust(!showDirectAdjust);
                      setShowCustomExtra(false);
                    }}
                    disabled={busy}
                    title="Manually adjust extras on innings without a delivery"
                  >
                    <Plus size={13} style={{ marginRight: 4 }} />
                    <span>{showDirectAdjust ? "Close Adjust" : "Manual Extras +/-"}</span>
                  </button>
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

                {/* CUSTOM EXTRA & LEG BYE MANAGER */}
                {showCustomExtra && (
                  <div className="custom-extra-panel">
                    <div className="custom-extra-header">
                      <h5>
                        <Zap size={15} color="#f59e0b" />
                        <span>Custom Extra & Leg Bye Delivery</span>
                        <span className="badge brand" style={{ fontSize: "10px", marginLeft: 6 }}>
                          Not Credited to Batter
                        </span>
                      </h5>
                      <button
                        type="button"
                        className="button compact secondary"
                        onClick={() => setShowCustomExtra(false)}
                        style={{ padding: "3px 8px", fontSize: "11px" }}
                      >
                        <X size={12} /> Close
                      </button>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: 6 }}>
                        Extra Category:
                      </label>
                      <div className="custom-extra-cats">
                        <button
                          type="button"
                          className={`custom-extra-cat-btn ${extraCategory === "LB" ? "active" : ""}`}
                          onClick={() => handleSelectExtraCategory("LB")}
                        >
                          Leg Bye (LB)
                        </button>
                        <button
                          type="button"
                          className={`custom-extra-cat-btn ${extraCategory === "B" ? "active" : ""}`}
                          onClick={() => handleSelectExtraCategory("B")}
                        >
                          Bye (B)
                        </button>
                        <button
                          type="button"
                          className={`custom-extra-cat-btn ${extraCategory === "WD" ? "active" : ""}`}
                          onClick={() => handleSelectExtraCategory("WD")}
                        >
                          Wide (WD)
                        </button>
                        <button
                          type="button"
                          className={`custom-extra-cat-btn ${extraCategory === "NB" ? "active" : ""}`}
                          onClick={() => handleSelectExtraCategory("NB")}
                        >
                          No Ball (NB)
                        </button>
                        <button
                          type="button"
                          className={`custom-extra-cat-btn ${extraCategory === "PEN" ? "active" : ""}`}
                          onClick={() => handleSelectExtraCategory("PEN")}
                        >
                          Penalty / Custom (PEN)
                        </button>
                      </div>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: 6 }}>
                        Total Runs for Delivery (Extras + Runs):
                      </label>
                      <div className="custom-extra-runs-row">
                        {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                          <button
                            key={num}
                            type="button"
                            className={`custom-extra-run-chip ${extraRuns === num ? "active" : ""}`}
                            onClick={() => {
                              setExtraRuns(num);
                              if (extraCategory === "NB" && num > 1) {
                                setExtraBatRuns(num - 1);
                              } else {
                                setExtraBatRuns(0);
                              }
                            }}
                          >
                            +{num}
                          </button>
                        ))}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
                          <span style={{ fontSize: "12px", color: "var(--muted)" }}>Custom:</span>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={extraRuns}
                            onChange={(e) => setExtraRuns(Math.max(0, parseInt(e.target.value) || 0))}
                            style={{
                              width: 65,
                              padding: "6px 8px",
                              borderRadius: "var(--radius)",
                              border: "1px solid var(--line-strong)",
                              background: "var(--surface)",
                              color: "var(--text)",
                              fontWeight: 850,
                              fontSize: "14px",
                              textAlign: "center",
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {extraCategory === "NB" && (
                      <div style={{ marginBottom: 14, padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius)", border: "1px solid var(--line)" }}>
                        <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: 6 }}>
                          Runs scored off bat by striker:
                        </label>
                        <div className="custom-extra-runs-row">
                          {[0, 1, 2, 3, 4, 6].map((bRuns) => (
                            <button
                              key={bRuns}
                              type="button"
                              className={`custom-extra-run-chip ${extraBatRuns === bRuns ? "active" : ""}`}
                              onClick={() => {
                                setExtraBatRuns(bRuns);
                                setExtraRuns(Math.max(extraRuns, bRuns + 1));
                              }}
                            >
                              {bRuns === 0 ? "0 (All Extras)" : `${bRuns} off bat`}
                            </button>
                          ))}
                        </div>
                        <small style={{ color: "var(--muted)", fontSize: "11px", display: "block", marginTop: 4 }}>
                          1 run is always counted as No Ball extra. Bat runs are credited to the striker.
                        </small>
                      </div>
                    )}

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "12px", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={extraIsLegal}
                          onChange={(e) => setExtraIsLegal(e.target.checked)}
                        />
                        <span>Count as legal ball (+1 to overs count)</span>
                        <small style={{ color: "var(--muted)" }}>
                          ({extraCategory === "LB" || extraCategory === "B" ? "Standard for Byes/Leg Byes" : "Uncheck for Wide/No Ball"})
                        </small>
                      </label>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          className="button compact secondary"
                          onClick={() => setShowCustomExtra(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="button compact"
                          style={{
                            background: "linear-gradient(135deg, #f59e0b, #d97706)",
                            color: "#fff",
                            fontWeight: 850,
                          }}
                          onClick={handleCustomExtraBall}
                          disabled={busy}
                        >
                          Record +{extraRuns} {extraCategory} Delivery
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* MANUAL EXTRAS ADJUSTER (DIRECT INNINGS UPDATE WITHOUT A BALL) */}
                {showDirectAdjust && (
                  <div className="custom-extra-panel" style={{ borderColor: "rgba(14, 165, 233, 0.4)" }}>
                    <div className="custom-extra-header">
                      <h5>
                        <Sliders size={15} color="#38bdf8" />
                        <span>Manual Extras Adjustment (No Delivery Bowled)</span>
                        <span className="badge" style={{ fontSize: "10px", marginLeft: 6 }}>
                          Direct Score Correction
                        </span>
                      </h5>
                      <button
                        type="button"
                        className="button compact secondary"
                        onClick={() => setShowDirectAdjust(false)}
                        style={{ padding: "3px 8px", fontSize: "11px" }}
                      >
                        <X size={12} /> Close
                      </button>
                    </div>

                    <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0 0 12px" }}>
                      Directly add or subtract missing extras to the innings total without recording a ball bowled or changing any player stats:
                    </p>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
                      <button
                        type="button"
                        className="button compact secondary"
                        onClick={() => handleDirectExtrasAdjust(1)}
                        disabled={busy}
                      >
                        +1 Extra
                      </button>
                      <button
                        type="button"
                        className="button compact secondary"
                        onClick={() => handleDirectExtrasAdjust(2)}
                        disabled={busy}
                      >
                        +2 Extras
                      </button>
                      <button
                        type="button"
                        className="button compact secondary"
                        onClick={() => handleDirectExtrasAdjust(4)}
                        disabled={busy}
                      >
                        +4 Extras (Boundary)
                      </button>
                      <button
                        type="button"
                        className="button compact secondary"
                        onClick={() => handleDirectExtrasAdjust(5)}
                        disabled={busy}
                      >
                        +5 Penalty Runs
                      </button>
                      <button
                        type="button"
                        className="button compact secondary"
                        onClick={() => handleDirectExtrasAdjust(-1)}
                        disabled={busy}
                        style={{ color: "#ef4444" }}
                      >
                        -1 Extra
                      </button>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700 }}>Custom Runs:</span>
                      <input
                        type="number"
                        value={directAdjustRuns}
                        onChange={(e) => setDirectAdjustRuns(e.target.value)}
                        placeholder="e.g. 3"
                        style={{
                          width: 80,
                          padding: "6px 8px",
                          borderRadius: "var(--radius)",
                          border: "1px solid var(--line-strong)",
                          background: "var(--surface)",
                          color: "var(--text)",
                          fontWeight: 800,
                          fontSize: "14px",
                          textAlign: "center",
                        }}
                      />
                      <button
                        type="button"
                        className="button compact"
                        onClick={() => handleDirectExtrasAdjust(parseInt(directAdjustRuns) || 0)}
                        disabled={busy || !parseInt(directAdjustRuns)}
                      >
                        Apply {parseInt(directAdjustRuns) > 0 ? `+${directAdjustRuns}` : directAdjustRuns} to Extras
                      </button>
                    </div>
                  </div>
                )}
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
                  <div
                    className="panel-header"
                    style={{ alignItems: "center", margin: "18px 0 10px", gap: 12 }}
                  >
                    <div>
                      <h3>Innings batting order</h3>
                      <p>Scores below update automatically from Quick Ball-by-Ball Scoring.</p>
                    </div>
                    <button
                      type="button"
                      className="button compact secondary"
                      onClick={handleSwapInningsTeams}
                      disabled={busy}
                      title="Exchange the batting teams while keeping each innings score in place"
                    >
                      <ArrowLeftRight size={14} /> Swap innings teams
                    </button>
                  </div>
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
                              value={n === 2 ? f.target : ""}
                              placeholder={n === 2 ? "Auto from Innings 1" : "Not applicable"}
                              readOnly
                              disabled={n === 1}
                              title={n === 2 ? "Automatically set to the first-innings total plus one" : "Only the chasing innings has a target"}
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
                            Save All Innings Details
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
