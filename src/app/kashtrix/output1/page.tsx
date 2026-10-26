import type { Metadata } from "next";
import KashtrixOutput from "../output/kashtrix-output";

export const metadata: Metadata = {
  title: "Kashtrix Matchboard Output",
  description: "Alternative full-screen NPL broadcast graphics output",
};

export default function KashtrixOutputOnePage() {
  return <KashtrixOutput variant="editorial" />;
}
