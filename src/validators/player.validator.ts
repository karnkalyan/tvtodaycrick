import { z } from "zod";
const mediaUrl = z.string().refine(v => v.startsWith("/") || /^https?:\/\//i.test(v), "Use an uploaded /uploads path or http(s) URL");

export const playerSchema = z.object({
  teamId: z.coerce.number().int().positive(),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  displayName: z.string().min(2).max(120),
  jerseyNumber: z.coerce.number().int().min(0).max(999).optional().nullable(),
  dateOfBirth: z.coerce.date().optional().nullable(),
  nationality: z.string().max(80).optional().nullable(),
  role: z.enum(["BATSMAN", "BOWLER", "ALL_ROUNDER", "WICKET_KEEPER"]),
  battingStyle: z.enum(["RIGHT_HAND", "LEFT_HAND"]).optional().nullable(),
  bowlingStyle: z.enum(["RIGHT_ARM_FAST","RIGHT_ARM_MEDIUM","LEFT_ARM_FAST","LEFT_ARM_MEDIUM","OFF_SPIN","LEG_SPIN","LEFT_ARM_ORTHODOX","LEFT_ARM_CHINAMAN","NONE"]).default("NONE"),
  imageUrl: mediaUrl.optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.email().optional().nullable(),
  bio: z.string().max(3000).optional().nullable(),
  isCaptain: z.boolean().default(false),
  isWicketKeeper: z.boolean().default(false),
  isOverseas: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const playerUpdateSchema = playerSchema.partial();
