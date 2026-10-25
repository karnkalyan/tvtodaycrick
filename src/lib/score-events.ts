export type QuickBallType = "0" | "1" | "2" | "3" | "4" | "6" | "wicket" | "wide" | "noball";

export type QuickBallEvent = {
  type: QuickBallType;
  label: string;
  className?: "four" | "six" | "wicket";
  runs: number;
  extras: number;
  legalBalls: number;
  wickets: number;
  broadcastAction: "dot" | "run1" | "run2" | "run3" | "four" | "six" | "wicket" | "wide" | "noBall";
  isFour: boolean;
  isSix: boolean;
};

export const QUICK_BALL_EVENTS: readonly QuickBallEvent[] = [
  { type: "0", label: "+0 DOT", runs: 0, extras: 0, legalBalls: 1, wickets: 0, broadcastAction: "dot", isFour: false, isSix: false },
  { type: "1", label: "+1", runs: 1, extras: 0, legalBalls: 1, wickets: 0, broadcastAction: "run1", isFour: false, isSix: false },
  { type: "2", label: "+2", runs: 2, extras: 0, legalBalls: 1, wickets: 0, broadcastAction: "run2", isFour: false, isSix: false },
  { type: "3", label: "+3", runs: 3, extras: 0, legalBalls: 1, wickets: 0, broadcastAction: "run3", isFour: false, isSix: false },
  { type: "4", label: "FOUR 4", className: "four", runs: 4, extras: 0, legalBalls: 1, wickets: 0, broadcastAction: "four", isFour: true, isSix: false },
  { type: "6", label: "SIX 6", className: "six", runs: 6, extras: 0, legalBalls: 1, wickets: 0, broadcastAction: "six", isFour: false, isSix: true },
  { type: "wicket", label: "WICKET", className: "wicket", runs: 0, extras: 0, legalBalls: 1, wickets: 1, broadcastAction: "wicket", isFour: false, isSix: false },
  { type: "wide", label: "WIDE", runs: 1, extras: 1, legalBalls: 0, wickets: 0, broadcastAction: "wide", isFour: false, isSix: false },
  { type: "noball", label: "NO BALL", runs: 1, extras: 1, legalBalls: 0, wickets: 0, broadcastAction: "noBall", isFour: false, isSix: false },
] as const;

export function quickBallEvent(type: QuickBallType): QuickBallEvent {
  const event = QUICK_BALL_EVENTS.find((candidate) => candidate.type === type);
  if (!event) throw new Error(`Unsupported quick-ball event: ${type}`);
  return event;
}

export function applyQuickBall(
  score: { runs: number; wickets: number; balls: number; extras: number },
  type: QuickBallType,
) {
  const event = quickBallEvent(type);
  return {
    event,
    runs: score.runs + event.runs,
    wickets: Math.min(10, score.wickets + event.wickets),
    balls: score.balls + event.legalBalls,
    extras: score.extras + event.extras,
  };
}
