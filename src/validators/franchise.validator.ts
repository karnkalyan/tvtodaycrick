import { z } from "zod";
const mediaUrl = z.string().refine(v => v.startsWith("/") || /^https?:\/\//i.test(v), "Use an uploaded /uploads path or http(s) URL");

export const franchiseSchema = z.object({
  name: z.string().min(2).max(120),
  shortName: z.string().max(20).optional().nullable(),
  ownerName: z.string().max(120).optional().nullable(),
  email: z.email().optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  logoUrl: mediaUrl.optional().nullable(),
  website: z.url().optional().nullable(),
});

export const franchiseUpdateSchema = franchiseSchema.partial();
