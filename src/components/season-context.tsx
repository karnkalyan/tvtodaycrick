"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, jsonBody } from "@/lib/client-api";
import { NPL_SEASONS, nplSeason } from "@/lib/npl-seasons";
import type { NplSeason } from "@/types/npl";

export type NplProvider = "nplt20league" | "cricnepal";

type SeasonContextValue = {
  year: string;
  number: number;
  ready: boolean;
  busy: boolean;
  revision: number;
  metadata: NplSeason | null;
  error: string;
  autoSync: boolean;
  isAutoSyncing: boolean;
  lastSyncTime: string | null;
  provider: NplProvider;
  select: (year: string) => void;
  resync: () => Promise<void>;
  toggleAutoSync: (enabled?: boolean) => void;
  switchProvider: (newProvider: NplProvider) => Promise<void>;
};

const SeasonContext = createContext<SeasonContextValue | null>(null);

export function SeasonProvider({ children }: { children: React.ReactNode }) {
  const [year, setYear] = useState("2026");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [metadata, setMetadata] = useState<NplSeason | null>(null);
  const [error, setError] = useState("");
  const [autoSync, setAutoSync] = useState(false);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [provider, setProvider] = useState<NplProvider>("cricnepal");

  const autoSyncTimer = useRef<NodeJS.Timeout | null>(null);

  // Initialize from localStorage
  useEffect(() => {
    const savedYear = localStorage.getItem("npl-selected-season");
    if (NPL_SEASONS.some((s) => s.year === savedYear)) setYear(savedYear!);

    const savedAutoSync = localStorage.getItem("npl-auto-sync");
    // Only enable if user explicitly turned it on previously
    if (savedAutoSync === "true") setAutoSync(true);
    else setAutoSync(false);

    const savedProvider = localStorage.getItem("npl-provider") as NplProvider | null;
    if (savedProvider === "nplt20league" || savedProvider === "cricnepal") {
      setProvider(savedProvider);
    } else {
      setProvider("cricnepal");
    }

    setReady(true);
  }, []);

  // Fetch season summary on change
  useEffect(() => {
    if (!ready) return;
    let active = true;
    setMetadata(null);
    setError("");

    api<NplSeason>(`/api/npl?season=${year}&view=summary`)
      .then((data) => {
        if (active) {
          setMetadata(data);
          const savedPref = localStorage.getItem("npl-provider") as NplProvider | null;
          if (savedPref === "cricnepal" || savedPref === "nplt20league") {
            setProvider(savedPref);
          } else if (data.sourceProvider) {
            setProvider(data.sourceProvider);
          }
          setLastSyncTime(new Date().toLocaleTimeString());
        }
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "Season data unavailable");
      });

    return () => {
      active = false;
    };
  }, [year, ready, revision]);

  const select = useCallback((value: string) => {
    nplSeason(value);
    localStorage.setItem("npl-selected-season", value);
    setYear(value);
  }, []);

  const resync = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const data = await api<NplSeason>(`/api/npl?season=${year}&view=summary`, { method: "POST" });
      setMetadata(data);
      const savedPref = localStorage.getItem("npl-provider") as NplProvider | null;
      if (savedPref === "cricnepal" || savedPref === "nplt20league") {
        setProvider(savedPref);
      } else if (data.sourceProvider) {
        setProvider(data.sourceProvider);
      }
      setLastSyncTime(new Date().toLocaleTimeString());
      setRevision((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Source sync failed");
      throw e;
    } finally {
      setBusy(false);
    }
  }, [year]);

  const toggleAutoSync = useCallback((forceVal?: boolean) => {
    setAutoSync((prev) => {
      const next = forceVal !== undefined ? forceVal : !prev;
      localStorage.setItem("npl-auto-sync", String(next));
      return next;
    });
  }, []);

  const switchProvider = useCallback(
    async (newProvider: NplProvider) => {
      setBusy(true);
      setError("");
      try {
        localStorage.setItem("npl-provider", newProvider);
        setProvider(newProvider);
        await api(`/api/npl/sources?season=${year}`, {
          method: "PUT",
          body: jsonBody({ provider: newProvider }),
        });
        // Save provider preference and load existing data; user clicks "Fetch Data" to start sync
        const data = await api<NplSeason>(`/api/npl?season=${year}&view=summary`);
        setMetadata(data);
        setProvider(newProvider);
        setRevision((v) => v + 1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to switch data source");
      } finally {
        setBusy(false);
      }
    },
    [year]
  );

  // Background Auto-Sync loop
  useEffect(() => {
    if (!autoSync || !ready) {
      if (autoSyncTimer.current) clearInterval(autoSyncTimer.current);
      return;
    }

    const poll = async () => {
      if (busy) return;
      try {
        setIsAutoSyncing(true);
        // Ping live endpoint for real-time scores & status
        const liveRes = await api<{ live: boolean; matches: any[]; updatedAt: string }>(`/api/npl/live?season=${year}`);
        setLastSyncTime(new Date().toLocaleTimeString());
        // If match is live, refresh metadata to update live badges and scorecards
        if (liveRes.live) {
          const fresh = await api<NplSeason>(`/api/npl?season=${year}&view=summary`);
          setMetadata(fresh);
        }
      } catch {
        // Silent fail in background auto-poll to avoid disruptive toasts
      } finally {
        setIsAutoSyncing(false);
      }
    };

    // Auto-sync every 25 seconds
    autoSyncTimer.current = setInterval(poll, 25000);

    return () => {
      if (autoSyncTimer.current) clearInterval(autoSyncTimer.current);
    };
  }, [autoSync, ready, year, busy]);

  return (
    <SeasonContext.Provider
      value={{
        year,
        number: nplSeason(year).number,
        ready,
        busy,
        revision,
        metadata,
        error,
        autoSync,
        isAutoSyncing,
        lastSyncTime,
        provider,
        select,
        resync,
        toggleAutoSync,
        switchProvider,
      }}
    >
      {children}
    </SeasonContext.Provider>
  );
}

export function useSeason() {
  const context = useContext(SeasonContext);
  if (!context) throw new Error("SeasonProvider is required");
  return context;
}
