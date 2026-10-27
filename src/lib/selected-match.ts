const SELECTED_MATCH_STORAGE_KEY = "npl-selected-match-id";

export function readSelectedMatchId(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const value = Number(window.localStorage.getItem(SELECTED_MATCH_STORAGE_KEY));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function writeSelectedMatchId(matchId: number): void {
  if (typeof window === "undefined" || !Number.isInteger(matchId) || matchId <= 0) return;
  try {
    window.localStorage.setItem(SELECTED_MATCH_STORAGE_KEY, String(matchId));
  } catch {}
}
