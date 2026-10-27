export type QuickBallType =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "6"
  | "wicket"
  | "wide"
  | "wd1"
  | "noball"
  | "nb1"
  | "nb4"
  | "1lb"
  | "2lb"
  | "3lb"
  | "4lb"
  | "1b";

export type QuickBallEvent = {
  type: QuickBallType;
  label: string;
  className?: "four" | "six" | "wicket" | "extra";
  runs: number;
  extras: number;
  legalBalls: number;
  wickets: number;
  /** Runs physically completed between the wickets, used only for strike rotation. */
  strikeRuns: number;
  broadcastAction:
    | "dot"
    | "run1"
    | "run2"
    | "run3"
    | "four"
    | "six"
    | "wicket"
    | "wide"
    | "wide1"
    | "noBall"
    | "noBall1"
    | "noBall4"
    | "legBye"
    | "legBye1"
    | "legBye2"
    | "legBye3"
    | "legBye4"
    | "bye1";
  isFour: boolean;
  isSix: boolean;
  isExtra?: boolean;
  isLegBye?: boolean;
  isBye?: boolean;
  isNoBall?: boolean;
  isWide?: boolean;
};

export const QUICK_BALL_EVENTS: readonly QuickBallEvent[] = [
  { type: "0", label: "+0 DOT", runs: 0, extras: 0, legalBalls: 1, wickets: 0, strikeRuns: 0, broadcastAction: "dot", isFour: false, isSix: false },
  { type: "1", label: "+1", runs: 1, extras: 0, legalBalls: 1, wickets: 0, strikeRuns: 1, broadcastAction: "run1", isFour: false, isSix: false },
  { type: "2", label: "+2", runs: 2, extras: 0, legalBalls: 1, wickets: 0, strikeRuns: 2, broadcastAction: "run2", isFour: false, isSix: false },
  { type: "3", label: "+3", runs: 3, extras: 0, legalBalls: 1, wickets: 0, strikeRuns: 3, broadcastAction: "run3", isFour: false, isSix: false },
  { type: "4", label: "FOUR 4", className: "four", runs: 4, extras: 0, legalBalls: 1, wickets: 0, strikeRuns: 4, broadcastAction: "four", isFour: true, isSix: false },
  { type: "6", label: "SIX 6", className: "six", runs: 6, extras: 0, legalBalls: 1, wickets: 0, strikeRuns: 6, broadcastAction: "six", isFour: false, isSix: true },
  { type: "wicket", label: "WICKET", className: "wicket", runs: 0, extras: 0, legalBalls: 1, wickets: 1, strikeRuns: 0, broadcastAction: "wicket", isFour: false, isSix: false },
  { type: "wide", label: "WIDE", className: "extra", runs: 1, extras: 1, legalBalls: 0, wickets: 0, strikeRuns: 0, broadcastAction: "wide", isFour: false, isSix: false, isExtra: true, isWide: true },
  { type: "wd1", label: "WD+1", className: "extra", runs: 2, extras: 2, legalBalls: 0, wickets: 0, strikeRuns: 1, broadcastAction: "wide1", isFour: false, isSix: false, isExtra: true, isWide: true },
  { type: "noball", label: "NO BALL", className: "extra", runs: 1, extras: 1, legalBalls: 0, wickets: 0, strikeRuns: 0, broadcastAction: "noBall", isFour: false, isSix: false, isExtra: true, isNoBall: true },
  { type: "nb1", label: "NB+1", className: "extra", runs: 2, extras: 2, legalBalls: 0, wickets: 0, strikeRuns: 1, broadcastAction: "noBall1", isFour: false, isSix: false, isExtra: true, isNoBall: true },
  { type: "nb4", label: "NB+4", className: "extra", runs: 5, extras: 5, legalBalls: 0, wickets: 0, strikeRuns: 4, broadcastAction: "noBall4", isFour: false, isSix: false, isExtra: true, isNoBall: true },
  { type: "1lb", label: "1 LB", className: "extra", runs: 1, extras: 1, legalBalls: 1, wickets: 0, strikeRuns: 1, broadcastAction: "legBye1", isFour: false, isSix: false, isExtra: true, isLegBye: true },
  { type: "2lb", label: "2 LB", className: "extra", runs: 2, extras: 2, legalBalls: 1, wickets: 0, strikeRuns: 2, broadcastAction: "legBye2", isFour: false, isSix: false, isExtra: true, isLegBye: true },
  { type: "3lb", label: "3 LB", className: "extra", runs: 3, extras: 3, legalBalls: 1, wickets: 0, strikeRuns: 3, broadcastAction: "legBye3", isFour: false, isSix: false, isExtra: true, isLegBye: true },
  { type: "4lb", label: "4 LB", className: "extra", runs: 4, extras: 4, legalBalls: 1, wickets: 0, strikeRuns: 4, broadcastAction: "legBye4", isFour: false, isSix: false, isExtra: true, isLegBye: true },
  { type: "1b", label: "1 B", className: "extra", runs: 1, extras: 1, legalBalls: 1, wickets: 0, strikeRuns: 1, broadcastAction: "bye1", isFour: false, isSix: false, isExtra: true, isBye: true },
] as const;

export function shouldSwapStrike(strikeRuns: number, overEnded: boolean): boolean {
  return (Math.abs(strikeRuns) % 2 === 1) !== overEnded;
}

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

export type ExtraCategory = "LB" | "B" | "WD" | "NB" | "PEN";

export type CustomExtraInput = {
  category: ExtraCategory;
  runs: number;
  isLegal?: boolean;
  batRuns?: number;
};

export type CustomExtraResult = {
  runs: number;
  wickets: number;
  balls: number;
  extras: number;
  isLegal: boolean;
  category: ExtraCategory;
  runsAdded: number;
  extraRuns: number;
  strikerRuns: number;
  strikeRuns: number;
  broadcastAction: string;
};

export function applyCustomExtra(
  score: { runs: number; wickets: number; balls: number; extras: number },
  input: CustomExtraInput,
): CustomExtraResult {
  const totalRuns = Math.max(0, Number(input.runs) || 0);
  const isLegal = input.isLegal !== undefined ? input.isLegal : (input.category === "LB" || input.category === "B");
  const legalBalls = isLegal ? 1 : 0;

  // On No Ball with bat runs, credit the bat runs to the striker and the 1 penalty run to extras
  const batRuns = (input.category === "NB" && input.batRuns && input.batRuns > 0)
    ? Math.min(input.batRuns, Math.max(0, totalRuns - 1))
    : 0;
  const extraRuns = totalRuns - batRuns;

  let broadcastAction = "legBye";
  if (input.category === "LB") {
    broadcastAction = totalRuns === 1 ? "legBye1" : totalRuns === 2 ? "legBye2" : totalRuns === 4 ? "legBye4" : "legBye";
  } else if (input.category === "B") {
    broadcastAction = totalRuns === 1 ? "bye1" : "bye";
  } else if (input.category === "WD") {
    broadcastAction = "wide";
  } else if (input.category === "NB") {
    broadcastAction = "noBall";
  } else {
    broadcastAction = "dot";
  }

  return {
    runs: score.runs + totalRuns,
    wickets: score.wickets,
    balls: score.balls + legalBalls,
    extras: score.extras + extraRuns,
    isLegal,
    category: input.category,
    runsAdded: totalRuns,
    extraRuns,
    strikerRuns: batRuns,
    strikeRuns: input.category === "PEN" ? 0 : Math.max(0, totalRuns - (input.category === "WD" || input.category === "NB" ? 1 : 0)),
    broadcastAction,
  };
}
