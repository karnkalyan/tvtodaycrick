"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ClipboardPenLine,
  Flame,
  Radio,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Tv,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { api } from "@/lib/client-api";

interface SearchResults {
  players: Array<{
    id: number;
    name: string;
    role: string;
    jerseyNumber?: number | null;
    teamName?: string;
    teamColor?: string;
  }>;
  matches: Array<{
    id: number;
    title: string;
    matchNumber: string;
    status: string;
    venue?: string | null;
  }>;
  teams: Array<{
    id: number;
    name: string;
    shortName: string;
    primaryColor: string;
  }>;
}

export function CommandPalette({
  open,
  onClose,
  onTriggerSync,
}: {
  open: boolean;
  onClose: () => void;
  onTriggerSync?: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "players" | "matches" | "teams" | "actions">("all");
  const [results, setResults] = useState<SearchResults>({ players: [], matches: [], teams: [] });
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Key listeners: Ctrl+K / Cmd+K toggle, Escape close
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      fetchResults("");
    }
  }, [open]);

  // Debounced search query
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      fetchResults(query);
    }, 180);
    return () => clearTimeout(timer);
  }, [query, open]);

  const fetchResults = async (q: string) => {
    setLoading(true);
    try {
      const data = await api<SearchResults>(`/api/search?q=${encodeURIComponent(q)}`);
      setResults(data);
      setSelectedIndex(0);
    } catch {
      // Keep existing results on error
    } finally {
      setLoading(false);
    }
  };

  // Compile flat items for keyboard arrow navigation
  const actionItems = [
    {
      id: "act-broadcast",
      type: "action",
      label: "Broadcast Graphics Controller",
      sublabel: "Open on-air graphics cue studio with live preview",
      icon: <Tv size={16} />,
      href: "/broadcast",
    },
    {
      id: "act-output",
      type: "action",
      label: "Clean Broadcast Feed (OBS / vMix)",
      sublabel: "Direct 120fps transparent graphics overlay URL",
      icon: <Radio size={16} />,
      href: "/broadcast/output",
      external: true,
    },
    {
      id: "act-sync",
      type: "action",
      label: "Fetch New Data from NPL Sources",
      sublabel: "Sync latest fixtures, squads & points tables",
      icon: <RefreshCw size={16} />,
      action: () => {
        onTriggerSync?.();
        onClose();
      },
    },
    {
      id: "act-score",
      type: "action",
      label: "Score Entry Operations",
      sublabel: "Ball-by-ball scoring workspace",
      icon: <ClipboardPenLine size={16} />,
      href: "/score-entry",
    },
    {
      id: "act-squads",
      type: "action",
      label: "Team Squads & Rosters",
      sublabel: "Browse franchise registrations & player profiles",
      icon: <Shield size={16} />,
      href: "/squads",
    },
  ];

  const filteredMatches = activeTab === "all" || activeTab === "matches" ? results.matches : [];
  const filteredPlayers = activeTab === "all" || activeTab === "players" ? results.players : [];
  const filteredTeams = activeTab === "all" || activeTab === "teams" ? results.teams : [];
  const filteredActions = activeTab === "all" || activeTab === "actions" ? actionItems : [];

  const allItems: Array<{
    id: string | number;
    title: string;
    sub: string;
    icon: React.ReactNode;
    color?: string;
    badge?: string;
    onSelect: () => void;
  }> = [
    ...filteredActions.map((a) => ({
      id: a.id,
      title: a.label,
      sub: a.sublabel,
      icon: a.icon,
      badge: "Action",
      onSelect: () => {
        if (a.action) {
          a.action();
        } else if (a.href) {
          if (a.external) {
            window.open(a.href, "_blank");
          } else {
            router.push(a.href);
          }
          onClose();
        }
      },
    })),
    ...filteredMatches.map((m) => ({
      id: `match-${m.id}`,
      title: `${m.matchNumber}: ${m.title}`,
      sub: `${m.status} · ${m.venue || "TU International Cricket Ground"}`,
      icon: <CalendarDays size={16} />,
      badge: m.status,
      onSelect: () => {
        router.push(`/score-entry?matchId=${m.id}`);
        onClose();
      },
    })),
    ...filteredPlayers.map((p) => ({
      id: `player-${p.id}`,
      title: p.name,
      sub: `${p.teamName || "Unassigned"} · ${p.role.replace(/_/g, " ")} ${p.jerseyNumber ? `(#${p.jerseyNumber})` : ""}`,
      icon: <UserRound size={16} />,
      color: p.teamColor,
      badge: "Player",
      onSelect: () => {
        router.push(`/players/${p.id}/edit`);
        onClose();
      },
    })),
    ...filteredTeams.map((t) => ({
      id: `team-${t.id}`,
      title: t.name,
      sub: `${t.shortName} Franchise · Colors & Squad`,
      icon: <Shield size={16} />,
      color: t.primaryColor,
      badge: t.shortName,
      onSelect: () => {
        router.push(`/teams/${t.id}/edit`);
        onClose();
      },
    })),
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (allItems.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % (allItems.length || 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].onSelect();
      }
    }
  };

  if (!open) return null;

  return (
    <div className="cmd-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="cmd-modal" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="cmd-search-row">
          <Search />
          <input
            ref={inputRef}
            type="text"
            className="cmd-search-input"
            placeholder="Search players, matches, franchises, or cue broadcast graphics..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {loading && <RefreshCw size={15} className="spin" color="var(--muted)" />}
          {query && (
            <button type="button" onClick={() => setQuery("")} style={{ color: "var(--muted)" }}>
              <X size={16} />
            </button>
          )}
        </div>

        <div className="cmd-filter-tabs">
          <button
            type="button"
            className={`cmd-filter-tab ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All
          </button>
          <button
            type="button"
            className={`cmd-filter-tab ${activeTab === "players" ? "active" : ""}`}
            onClick={() => setActiveTab("players")}
          >
            Players
          </button>
          <button
            type="button"
            className={`cmd-filter-tab ${activeTab === "matches" ? "active" : ""}`}
            onClick={() => setActiveTab("matches")}
          >
            Matches
          </button>
          <button
            type="button"
            className={`cmd-filter-tab ${activeTab === "teams" ? "active" : ""}`}
            onClick={() => setActiveTab("teams")}
          >
            Teams
          </button>
          <button
            type="button"
            className={`cmd-filter-tab ${activeTab === "actions" ? "active" : ""}`}
            onClick={() => setActiveTab("actions")}
          >
            Broadcast & Actions
          </button>
        </div>

        <div className="cmd-list" role="listbox">
          {allItems.length === 0 ? (
            <div style={{ padding: "36px 20px", textAlign: "center", color: "var(--muted)" }}>
              <p style={{ margin: "0 0 4px", fontWeight: 600 }}>No results found</p>
              <small>Try searching for player names, teams (KAG, JAB, Rhinos), or match numbers.</small>
            </div>
          ) : (
            allItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  className={`cmd-item ${isSelected ? "selected" : ""}`}
                  onClick={item.onSelect}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div
                    className="cmd-item-icon"
                    style={item.color ? { backgroundColor: item.color, color: "#fff" } : undefined}
                  >
                    {item.icon}
                  </div>
                  <div className="cmd-item-text">
                    <strong>{item.title}</strong>
                    <small>{item.sub}</small>
                  </div>
                  {item.badge && <span className="badge">{item.badge}</span>}
                </div>
              );
            })
          )}
        </div>

        <div className="cmd-foot">
          <div className="cmd-keys">
            <span>
              <kbd>↑</kbd> <kbd>↓</kbd> navigate
            </span>
            <span>
              <kbd>↵</kbd> select
            </span>
            <span>
              <kbd>esc</kbd> close
            </span>
          </div>
          <span>NPL Engine Quick Search</span>
        </div>
      </div>
    </div>
  );
}
