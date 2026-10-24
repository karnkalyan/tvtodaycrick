"use client";
import { SourceCatalogue } from "@/components/source-catalogue";
import { useEffect, useState } from "react";
import { ExternalLink, RefreshCw, Save, CheckCircle2, ShieldCheck, Sparkles, Image as ImageIcon, Database } from "lucide-react";
import { useSeason, type NplProvider } from "@/components/season-context";
import { ErrorBox, PageHeader, Spinner } from "@/components/common";
import { api, jsonBody } from "@/lib/client-api";

interface Settings {
  season: string;
  seasonNumber: number;
  provider: NplProvider;
  sourceUrl: string;
  secondaryUrl: string | null;
  nplt20Url: string;
  cricnepalUrl: string;
}

export default function SourcesPage() {
  const { year, number, metadata, resync, busy, provider, switchProvider } = useSeason();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<NplProvider>(provider || "nplt20league");

  useEffect(() => {
    api<Settings>(`/api/npl/sources?season=${year}`)
      .then((data) => {
        setSettings(data);
        setSelectedProvider(data.provider);
      })
      .catch((e) => setError(e.message));
  }, [year]);

  async function handleProviderSelect(prov: NplProvider) {
    setSelectedProvider(prov);
    try {
      await switchProvider(prov);
      setMessage(`Switched data source to ${prov === "nplt20league" ? "nplt20league.com" : "cricnepal.com"}. Data synchronized.`);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to switch data source");
    }
  }

  async function save() {
    try {
      await api(`/api/npl/sources?season=${year}`, {
        method: "PUT",
        body: jsonBody({
          provider: selectedProvider,
          sourceUrl: selectedProvider === "nplt20league" ? settings?.nplt20Url : settings?.sourceUrl,
          secondaryUrl: settings?.secondaryUrl,
        }),
      });
      setMessage("Source settings saved. Resyncing to apply changes...");
      setError("");
      await resync();
      setMessage("Sources successfully updated and data synchronized.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={`Season ${number} / ${year}`}
        title="Data Sources & Asset Management"
        description="Select your live data provider, configure sources, and manage locally downloaded high-definition team & player assets."
      />

      {error && <ErrorBox message={error} />}
      {message && <p className="notice">{message}</p>}

      {!settings ? (
        <Spinner />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Provider Selection Section */}
          <section className="panel">
            <div className="panel-body">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Active Data Source Provider</h2>
                  <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>
                    Choose where to fetch tournament fixtures, scores, squads, and franchise records.
                  </p>
                </div>
                <span className="badge brand">Dual Source Enabled</span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: 16,
                  marginTop: 12,
                }}
              >
                {/* Option 1: nplt20league.com */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => void handleProviderSelect("nplt20league")}
                  style={{
                    padding: 20,
                    borderRadius: "var(--radius-md)",
                    border: `2px solid ${selectedProvider === "nplt20league" ? "var(--accent)" : "var(--line)"}`,
                    background: selectedProvider === "nplt20league" ? "color-mix(in srgb, var(--accent) 8%, var(--surface))" : "var(--surface-2)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="nav-icon tone-blue" style={{ width: 36, height: 36 }}>
                        <Sparkles size={18} />
                      </span>
                      <div>
                        <strong style={{ fontSize: 15 }}>nplt20league.com</strong>
                        <span style={{ display: "block", fontSize: 11, color: "#10b981", fontWeight: 600 }}>RECOMMENDED · HQ ASSETS</span>
                      </div>
                    </div>
                    {selectedProvider === "nplt20league" ? (
                      <CheckCircle2 size={20} color="var(--accent)" />
                    ) : (
                      <span className="badge" style={{ fontSize: 11 }}>Click to Select</span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: "var(--muted)", margin: "14px 0 10px", lineHeight: 1.5 }}>
                    Features high-resolution player photos, transparent official team logos, real-time live scorecards, and complete franchise ownership details.
                  </p>
                  <small style={{ color: "var(--text)", fontFamily: "monospace", fontSize: 11 }}>https://nplt20league.com</small>
                </div>

                {/* Option 2: cricnepal.com */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => void handleProviderSelect("cricnepal")}
                  style={{
                    padding: 20,
                    borderRadius: "var(--radius-md)",
                    border: `2px solid ${selectedProvider === "cricnepal" ? "var(--accent)" : "var(--line)"}`,
                    background: selectedProvider === "cricnepal" ? "color-mix(in srgb, var(--accent) 8%, var(--surface))" : "var(--surface-2)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="nav-icon tone-navy" style={{ width: 36, height: 36 }}>
                        <Database size={18} />
                      </span>
                      <div>
                        <strong style={{ fontSize: 15 }}>www.cricnepal.com</strong>
                        <span style={{ display: "block", fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>TOURNAMENT SOURCE</span>
                      </div>
                    </div>
                    {selectedProvider === "cricnepal" ? (
                      <CheckCircle2 size={20} color="var(--accent)" />
                    ) : (
                      <span className="badge" style={{ fontSize: 11 }}>Click to Select</span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: "var(--muted)", margin: "14px 0 10px", lineHeight: 1.5 }}>
                    Provides fixture schedules and news announcements. (Player images and team crests are automatically upgraded using high-res nplt20league assets).
                  </p>
                  <small style={{ color: "var(--text)", fontFamily: "monospace", fontSize: 11 }}>{settings.cricnepalUrl}</small>
                </div>
              </div>

              {/* Local Image Cache Status Banner */}
              <div
                style={{
                  marginTop: 20,
                  padding: "14px 18px",
                  borderRadius: "var(--radius-sm)",
                  background: "color-mix(in srgb, #10b981 10%, var(--surface))",
                  border: "1px solid #10b981",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <ShieldCheck size={24} color="#10b981" />
                <div style={{ flex: 1 }}>
                  <strong style={{ display: "block", fontSize: 13, color: "var(--text)" }}>
                    High-Definition Local Asset Engine Active
                  </strong>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    All player headshots and franchise logos are scraped and saved to <code>/public/images/teams/{"{team}"}/</code>.
                    They are served locally for blazing fast load times and maximum crispness.
                  </span>
                </div>
                <span className="badge brand" style={{ background: "#10b981", color: "#fff" }}>
                  137 Cached Assets
                </span>
              </div>
            </div>
          </section>

          {/* Source URLs & Resync Section */}
          <section className="panel">
            <div className="panel-body">
              <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>Source URLs & Supplementary Links</h2>

              {selectedProvider === "cricnepal" && (
                <div className="field">
                  <label htmlFor="source-url">Cricnepal Tournament URL</label>
                  <input
                    id="source-url"
                    type="url"
                    value={settings.sourceUrl}
                    onChange={(e) => setSettings({ ...settings, sourceUrl: e.target.value })}
                  />
                  <small>Use the Cricnepal tournament page for {year}.</small>
                </div>
              )}

              {year === "2026" && (
                <div className="field">
                  <label htmlFor="secondary-url">Supplementary Playoff Schedule URL</label>
                  <input
                    id="secondary-url"
                    type="url"
                    value={settings.secondaryUrl || ""}
                    onChange={(e) => setSettings({ ...settings, secondaryUrl: e.target.value || null })}
                  />
                  <small>Supported supplementary source: https://nplt20league.com/schedule/</small>
                </div>
              )}

              <div className="form-actions" style={{ marginTop: 20 }}>
                <button className="button" onClick={save} disabled={busy}>
                  <Save size={15} /> Save & Apply
                </button>
                <button className="button secondary" disabled={busy} onClick={() => void resync().catch(() => {})}>
                  <RefreshCw size={15} className={busy ? "spin" : ""} /> Resync Selected Season
                </button>
              </div>

              <div className="sources-list" style={{ marginTop: 24 }}>
                {[
                  { label: "nplt20league Live Scores & Scorecards", url: "https://nplt20league.com/live-scores/" },
                  { label: "nplt20league 2026 Teams & Squads", url: "https://nplt20league.com/teams/" },
                  { label: "nplt20league 2026 Schedule & Fixtures", url: "https://nplt20league.com/schedule/" },
                  ...(settings.sourceUrl.includes("cricnepal")
                    ? ["matches", "squads", "points-table"].map((path) => ({
                        label: `Cricnepal · ${path}`,
                        url: `${settings.sourceUrl}/${path}`,
                      }))
                    : []),
                  ...(metadata?.teams || []).flatMap((t) => [
                    { label: `${t.name} · Squad Profile`, url: t.squadUrl },
                    { label: `${t.name} · Verified Crest`, url: t.logoUrl || t.sourceUrl },
                  ]),
                ].map((s) => (
                  <div className="source-row" key={s.url + s.label}>
                    <div>
                      <strong>{s.label}</strong>
                      <small>{s.url}</small>
                    </div>
                    <a className="button secondary compact" href={s.url} target="_blank" rel="noreferrer">
                      Open <ExternalLink size={13} />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      <SourceCatalogue />
    </>
  );
}
