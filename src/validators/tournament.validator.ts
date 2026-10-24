import { z } from "zod";
const hex = /^#[0-9A-Fa-f]{6}$/;
const mediaUrl = z.string().refine(v => v.startsWith("/") || /^https?:\/\//i.test(v), "Use an uploaded /uploads path or http(s) URL");

export const tournamentSchema = z.object({
  name: z.string().min(2).max(120),
  shortName: z.string().min(2).max(30),
  season: z.string().min(2).max(40),
  country: z.string().max(80).default("Nepal"),
  logoUrl: mediaUrl.optional().nullable(),
  primaryColor: z.string().regex(hex).default("#2563EB"),
  secondaryColor: z.string().regex(hex).default("#F8FAFC"),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  venue: z.string().max(180).optional().nullable(),
  description: z.string().max(3000).optional().nullable(),
});
export const tournamentUpdateSchema = tournamentSchema.partial();
