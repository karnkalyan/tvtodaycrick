"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardPenLine,
  House,
  Images,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  Search,
  Shield,
  Trophy,
  Tv,
  Users,
  UserRound,
  X,
  Building2,
  Link2,
  RefreshCw,
  Database,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { SeasonProvider, useSeason } from "./season-context";
import { NPL_SEASONS } from "@/lib/npl-seasons";
import { ErrorBox, Spinner } from "./common";
import { CommandPalette } from "./command-palette";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  tone: string;
  external?: boolean;
}

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: "CRICKET",
    items: [
      { href: "/", label: "Overview", icon: House, tone: "navy" },
      { href: "/schedule", label: "Fixtures & scores", icon: CalendarDays, tone: "orange" },
      { href: "/squads", label: "Team squads", icon: Users, tone: "purple" },
    ],
  },
  {
    label: "BROADCAST",
    items: [
      { href: "/broadcast", label: "Graphics controller", icon: Tv, tone: "red" },
      { href: "/broadcast/output", label: "Clean output (OBS)", icon: Radio, tone: "blue", external: true },
    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      { href: "/tournaments", label: "Tournaments", icon: Trophy, tone: "orange" },
      { href: "/franchises", label: "Franchises", icon: Building2, tone: "purple" },
      { href: "/teams", label: "Teams", icon: Shield, tone: "blue" },
      { href: "/players", label: "Players", icon: UserRound, tone: "teal" },
      { href: "/matches", label: "Matches", icon: CalendarDays, tone: "red" },
      { href: "/score-entry", label: "Score entry", icon: ClipboardPenLine, tone: "blue" },
      { href: "/media", label: "Media library", icon: Images, tone: "purple" },
      { href: "/sources", label: "Data sources", icon: Link2, tone: "navy" },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SeasonProvider>
      <NavigationShell>{children}</NavigationShell>
    </SeasonProvider>
  );
}

function NavigationShell({ children }: { children: React.ReactNode }) {
  const season = useSeason();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const sidebar = useRef<HTMLElement>(null);
  const menu = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setCollapsed(localStorage.getItem("npl-sidebar") === "collapsed");
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  // Screen resize watcher
  useEffect(() => {
    const media = window.matchMedia("(min-width:981px)");
    const close = () => {
      if (media.matches) setOpen(false);
    };
    media.addEventListener("change", close);
    return () => media.removeEventListener("change", close);
  }, []);

  // Keyboard shortcut for Command Palette (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Sidebar modal trap on mobile
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(sidebar.current?.querySelectorAll<HTMLElement>("a,button") || []).filter((el) =>
        el.getClientRects().length
      );
    focusable()[0]?.focus();

    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab") {
        const nodes = focusable(),
          first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", key);
      menu.current?.focus();
    };
  }, [open]);

  const toggle = () =>
    setCollapsed((v) => {
      localStorage.setItem("npl-sidebar", v ? "expanded" : "collapsed");
      return !v;
    });

  const active = groups
    .flatMap((g) => g.items)
    .find((item) => (item.href === "/" ? path === "/" : path.startsWith(item.href)));

  return (
    <div className={`app-frame ${collapsed ? "nav-collapsed" : ""}`}>
      {/* Dynamic Command Palette (Ctrl+K) */}
      <CommandPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onTriggerSync={() => void season.resync().catch(() => {})}
      />

      {/* Main Standardized Minimalist Sidebar */}
      <aside
        ref={sidebar}
        id="main-navigation"
        className={`sidebar ${open ? "is-open" : ""}`}
        aria-label="Primary navigation"
        {...(open ? { role: "dialog", "aria-modal": true } : {})}
      >
        <div className="brand-row">
          <Link href="/" className="brand-mark" aria-label="NPL Home">
            <Tv size={18} />
          </Link>
          <div className="brand-copy">
            <strong>
              NPL<span>-TVToday</span>
            </strong>
            <small>Nepal Premier League</small>
          </div>
          <button aria-label="Close navigation" className="icon-button close-nav" onClick={() => setOpen(false)}>
            <X size={16} />
          </button>
        </div>

        <div className="sidebar-scroll">
          {groups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-group-label">{group.label}</p>
              <nav className="nav-list" aria-label={group.label}>
                {group.items.map(({ href, label, icon: Icon, tone, external }) => {
                  const selected = href === "/" ? path === href : path.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noopener noreferrer" : undefined}
                      onClick={() => !external && setOpen(false)}
                      title={collapsed ? label : undefined}
                      aria-label={label}
                      aria-current={selected ? "page" : undefined}
                      className={selected ? "active" : ""}
                    >
                      <span className={`nav-icon tone-${tone}`}>
                        <Icon size={16} strokeWidth={2} />
                      </span>
                      <span className="nav-label">{label}</span>
                      {selected && <ChevronRight className="nav-active-arrow" size={14} />}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-season">
            <span className="season-number">{String(season.number).padStart(2, "0")}</span>
            <div>
              <strong>Season {season.number}</strong>
              <small>{season.year} · {season.metadata?.statistics?.matches ?? "—"} fixtures</small>
            </div>
          </div>
          <button
            className="collapse-button"
            onClick={toggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            <span>Collapse sidebar</span>
            <ChevronLeft size={14} />
          </button>
        </div>
      </aside>

      {open && <button className="nav-scrim" onClick={() => setOpen(false)} aria-label="Close navigation" tabIndex={-1} />}

      <div className="content-frame" inert={open || undefined}>
        <header className="topbar">
          <div className="topbar-left">
            <button
              ref={menu}
              aria-label="Open navigation"
              aria-controls="main-navigation"
              aria-expanded={open}
              className="icon-button mobile-menu"
              onClick={() => setOpen(true)}
            >
              <Menu size={18} />
            </button>
            <button
              className="icon-button desktop-menu"
              onClick={toggle}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>

            <div className="topbar-title">
              <strong>{active?.label || (path === "/sources" ? "Source settings" : "Cricket Workspace")}</strong>
            </div>

            {/* Navbar Global Search Trigger (Ctrl+K) */}
            <button
              type="button"
              className="navbar-search-btn"
              onClick={() => setSearchOpen(true)}
              title="Search players, matches, teams (Ctrl + K)"
            >
              <Search size={14} />
              <span>Search players, matches...</span>
              <kbd>Ctrl K</kbd>
            </button>
          </div>

          <div className="top-actions">
            {/* Quick Broadcast button */}
            <Link href="/broadcast" className="button secondary compact" title="Open graphics controller">
              <Tv size={14} />
              <span>Broadcast</span>
            </Link>

            {/* Auto-Sync Toggle Button */}
            <button
              type="button"
              className={`navbar-autosync ${season.autoSync ? "active" : ""}`}
              onClick={() => season.toggleAutoSync()}
              title={`Live Auto-Sync is ${season.autoSync ? "ENABLED (Polling scores every 25s)" : "DISABLED"}. Click to toggle.${season.lastSyncTime ? ` Last update: ${season.lastSyncTime}` : ""}`}
            >
              {season.autoSync ? (
                <span className="pulse-dot" />
              ) : (
                <Radio size={13} style={{ opacity: 0.6 }} />
              )}
              <span>{season.autoSync ? "Live Auto-Sync" : "Auto-Sync Off"}</span>
              {season.isAutoSyncing && <RefreshCw size={11} className="spin" />}
            </button>

            {/* Provider Selector */}
            <div className="navbar-provider-badge" title="Active Data Source: Switch between nplt20league.com (Recommended with HQ Assets) and cricnepal.com">
              <Database size={12} />
              <select
                aria-label="Data Source Provider"
                value={season.provider}
                disabled={season.busy}
                onChange={(e) => void season.switchProvider(e.target.value as any)}
              >
                <option value="nplt20league">nplt20league (HQ)</option>
                <option value="cricnepal">cricnepal</option>
              </select>
            </div>

            {/* Season Selector */}
            <label className="navbar-season">
              <span className="sr-only">Select NPL season</span>
              <select
                aria-label="Select NPL season"
                value={season.year}
                disabled={season.busy}
                onChange={(e) => season.select(e.target.value)}
              >
                {NPL_SEASONS.map((s) => (
                  <option key={s.year} value={s.year}>
                    Season {s.number} · {s.year}
                  </option>
                ))}
              </select>
            </label>

            {/* Sources & Fetch New Data button */}
            <Link href="/sources" className="button secondary compact navbar-sources" title="Manage source URLs and providers">
              <Link2 size={14} />
              <span>Sources</span>
            </Link>

            <button
              className="button compact navbar-sync"
              onClick={() => void season.resync().catch(() => {})}
              disabled={season.busy || !season.ready}
              aria-label="Fetch new data from web sources"
              title="Fetch new data and rosters from NPL web sources"
            >
              <RefreshCw size={14} className={season.busy ? "spin" : ""} />
              <span>{season.busy ? "Syncing…" : "Fetch Data"}</span>
            </button>

            <ThemeToggle />
          </div>
        </header>

        <main className="page-wrap" id="main-content">
          {season.error && <ErrorBox message={season.error} />}
          {season.ready ? <div key={`${season.year}-${season.revision}`}>{children}</div> : <Spinner />}
        </main>
      </div>
    </div>
  );
}
