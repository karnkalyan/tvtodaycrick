"use client";
import { useEffect, useState } from "react";
import { ExternalLink, Image as ImageIcon } from "lucide-react";
import { api } from "@/lib/client-api";
import { useSeason } from "./season-context";
import { ErrorBox, Spinner } from "./common";
import { RemoteImage } from "./remote-image";
import type { NplSeason } from "@/types/npl";

export function SourceCatalogue() {
  const { year } = useSeason();
  const [view, setView] = useState("schedule");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<NplSeason | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api<NplSeason>(`/api/npl?season=${year}&view=${view}&page=${page}&limit=12`)
      .then((d) => {
        if (active) {
          setData(d);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [year, view, page]);

  const rows =
    view === "schedule"
      ? data?.fixtures.map((f) => ({
          label: `${f.number} · ${f.home} vs ${f.away}`,
          url: f.sourceUrl,
          image: null,
          badge: f.stage,
        }))
      : data?.teams.flatMap((t) =>
          t.players.map((p) => ({
            label: `${p.name} · ${t.name}`,
            url: p.sourceUrl,
            image: p.imageUrl,
            badge: p.role,
          }))
        );

  return (
    <section className="panel" style={{ marginTop: 24 }}>
      <div className="panel-body">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Match & Player Assets Catalogue</h2>
          <span className="badge">
            {data?.pagination?.total ?? 0} {view === "schedule" ? "Scorecard Sources" : "Verified Players"}
          </span>
        </div>

        <div className="toolbar" style={{ marginTop: 12 }}>
          <select
            aria-label="Source category"
            value={view}
            onChange={(e) => {
              setView(e.target.value);
              setPage(1);
            }}
          >
            <option value="schedule">Match scorecards & fixtures</option>
            <option value="squads">Player profiles & high-res photos</option>
          </select>
        </div>

        {error && <ErrorBox message={error} />}

        {loading ? (
          <Spinner />
        ) : (
          <div className="sources-list">
            {rows?.map((r) => (
              <div
                className="source-row"
                key={r.url + r.label}
                style={{ display: "flex", alignItems: "center", gap: 14 }}
              >
                {r.image ? (
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 8,
                      overflow: "hidden",
                      background: "var(--surface-2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      border: "1px solid var(--line)",
                    }}
                  >
                    <RemoteImage
                      src={r.image}
                      alt={r.label}
                      fallback={r.label.slice(0, 2).toUpperCase()}
                      width={44}
                      height={44}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 8,
                      background: "var(--surface-2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      border: "1px solid var(--line)",
                      color: "var(--muted)",
                    }}
                  >
                    <ImageIcon size={18} />
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <strong>{r.label}</strong>
                    {r.badge && <span className="badge">{r.badge}</span>}
                  </div>
                  <small style={{ wordBreak: "break-all" }}>{r.url}</small>
                  {r.image && (
                    <small style={{ color: "var(--accent)", display: "block" }}>
                      Local Asset: <code>{r.image}</code>
                    </small>
                  )}
                </div>

                <a className="button secondary compact" href={r.url} target="_blank" rel="noreferrer">
                  Open <ExternalLink size={13} />
                </a>
              </div>
            ))}
          </div>
        )}

        <div className="pagination">
          <button
            className="button secondary"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} of {data?.pagination?.totalPages || 1}
          </span>
          <button
            className="button secondary"
            disabled={page >= (data?.pagination?.totalPages || 1) || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
