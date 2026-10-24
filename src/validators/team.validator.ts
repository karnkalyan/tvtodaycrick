import { z } from "zod";
const hex = /^#[0-9A-Fa-f]{6}$/;
const mediaUrl = z.string().refine(v => v.startsWith("/") || /^https?:\/\//i.test(v), "Use an uploaded /uploads path or http(s) URL");

export const teamSchema = z.object({
  franchiseId: z.coerce.number().int().positive(),
  name: z.string().min(2).max(120),
  shortName: z.string().min(2).max(20),
  primaryColor: z.string().regex(hex, "Use #RRGGBB format"),
  secondaryColor: z.string().regex(hex, "Use #RRGGBB format"),
  accentColor: z.string().regex(hex).optional().nullable(),
  themeName: z.string().max(80).optional().nullable(),
  logoUrl: mediaUrl.optional().nullable(),
  homeGround: z.string().max(160).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  foundedYear: z.coerce.number().int().min(1800).max(2100).optional().nullable(),
  slogan: z.string().max(160).optional().nullable(),
});

export const teamUpdateSchema = teamSchema.partial();
