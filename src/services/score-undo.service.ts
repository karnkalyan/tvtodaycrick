import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Score-entry undo journal.
 *
 * Every innings / player-stat / toss write made through the match controller is
 * wrapped in `journaledWrite`, which stores the row's previous state in
 * `ScoreEvent` (inside the same transaction). `undoLast` pops the most recent
 * group of writes for a match and restores every affected row exactly as it was
 * (deleting rows that did not exist before).
 */

export type UndoMeta = { groupId?: string | null; label?: string | null };

type Tx = Prisma.TransactionClient;
type Kind = "innings" | "stat" | "toss";

const inningsFields = ["teamId", "runs", "wickets", "balls", "extras", "target", "status"] as const;
const statFields = [
  "teamId", "runs", "ballsFaced", "fours", "sixes", "wickets", "ballsBowled", "runsConceded",
  "maidens", "catches", "stumpings", "runOuts", "isOut", "dismissal",
] as const;
const tossFields = ["winnerTeamId", "decision", "notes"] as const;

function pick<T extends Record<string, unknown>>(row: T | null, fields: readonly string[]) {
  if (!row) return null;
  const out: Record<string, unknown> = {};
  for (const f of fields) out[f] = row[f] ?? null;
  return out;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Extract optional undo grouping info sent by the score-entry client. */
export function undoMeta(body: unknown): UndoMeta {
  if (!body || typeof body !== "object") return {};
  const b = body as Record<string, unknown>;
  return {
    groupId: typeof b.undoGroup === "string" ? b.undoGroup.slice(0, 64) : null,
    label: typeof b.undoLabel === "string" ? b.undoLabel.slice(0, 160) : null,
  };
}

async function readRow(tx: Tx, matchId: number, kind: Kind, key: string) {
  if (kind === "innings") {
    const inningsNumber = Number(key.split(":")[1]);
    return pick(await tx.matchInnings.findUnique({ where: { matchId_inningsNumber: { matchId, inningsNumber } } }), inningsFields);
  }
  if (kind === "stat") {
    const [, playerId, innings] = key.split(":").map(Number);
    return pick(await tx.playerMatchStat.findUnique({ where: { matchId_playerId_innings: { matchId, playerId, innings } } }), statFields);
  }
  return pick(await tx.toss.findUnique({ where: { matchId } }), tossFields);
}

async function restoreRow(tx: Tx, matchId: number, kind: Kind, key: string, before: Record<string, any> | null) {
  if (kind === "innings") {
    const inningsNumber = Number(key.split(":")[1]);
    if (!before) return tx.matchInnings.deleteMany({ where: { matchId, inningsNumber } });
    const data = before as Prisma.MatchInningsUncheckedUpdateInput & { teamId: number };
    return tx.matchInnings.upsert({
      where: { matchId_inningsNumber: { matchId, inningsNumber } },
      create: { ...(data as any), matchId, inningsNumber },
      update: data,
    });
  }
  if (kind === "stat") {
    const [, playerId, innings] = key.split(":").map(Number);
    if (!before) return tx.playerMatchStat.deleteMany({ where: { matchId, playerId, innings } });
    return tx.playerMatchStat.upsert({
      where: { matchId_playerId_innings: { matchId, playerId, innings } },
      create: { ...(before as any), matchId, playerId, innings },
      update: before as Prisma.PlayerMatchStatUncheckedUpdateInput,
    });
  }
  if (!before) return tx.toss.deleteMany({ where: { matchId } });
  return tx.toss.upsert({
    where: { matchId },
    create: { ...(before as any), matchId },
    update: before as Prisma.TossUncheckedUpdateInput,
  });
}

/**
 * Runs `write` in a transaction and journals the previous state of the target row
 * so it can be undone. No journal entry is created when nothing actually changed.
 */
export async function journaledWrite<R>(
  target: { matchId: number; kind: Kind; key: string; defaultLabel: string },
  meta: UndoMeta,
  write: (tx: Tx) => Promise<R>,
): Promise<R> {
  return prisma.$transaction(async (tx) => {
    const before = await readRow(tx, target.matchId, target.kind, target.key);
    const result = await write(tx);
    const after = await readRow(tx, target.matchId, target.kind, target.key);
    if (!same(before, after)) {
      await tx.scoreEvent.create({
        data: {
          matchId: target.matchId,
          groupId: meta.groupId || randomUUID(),
          label: meta.label || target.defaultLabel,
          kind: target.kind,
          targetKey: target.key,
          before: before === null ? Prisma.DbNull : (before as Prisma.InputJsonValue),
        },
      });
    }
    return result;
  });
}

export const scoreUndoService = {
  /** Most recent undoable actions (grouped), newest first. */
  async history(matchId: number, limit = 15) {
    const events = await prisma.scoreEvent.findMany({
      where: { matchId },
      orderBy: { id: "desc" },
      take: limit * 4,
      select: { id: true, groupId: true, label: true, kind: true, createdAt: true },
    });
    const groups: { groupId: string; label: string; createdAt: Date; changes: number }[] = [];
    for (const e of events) {
      const g = groups.find((x) => x.groupId === e.groupId);
      if (g) g.changes++;
      else groups.push({ groupId: e.groupId, label: e.label, createdAt: e.createdAt, changes: 1 });
    }
    const total = await prisma.scoreEvent.groupBy({ by: ["groupId"], where: { matchId } });
    return { items: groups.slice(0, limit), total: total.length };
  },

  /** Undo the latest action group for a match, restoring every affected row. */
  async undoLast(matchId: number) {
    return prisma.$transaction(async (tx) => {
      const latest = await tx.scoreEvent.findFirst({ where: { matchId }, orderBy: { id: "desc" } });
      if (!latest) throw new Error("Nothing to undo for this match");
      const group = await tx.scoreEvent.findMany({
        where: { matchId, groupId: latest.groupId },
        orderBy: { id: "desc" },
      });
      // Restore newest-first so the oldest snapshot of a row is the one that sticks.
      for (const e of group) {
        await restoreRow(tx, matchId, e.kind as Kind, e.targetKey, (e.before as Record<string, any> | null) ?? null);
      }
      await tx.scoreEvent.deleteMany({ where: { id: { in: group.map((e) => e.id) } } });
      const remaining = await tx.scoreEvent.count({ where: { matchId } });
      return { undone: latest.label, changes: group.length, remaining };
    });
  },
};
