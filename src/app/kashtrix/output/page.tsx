import type { Metadata } from "next";
import KashtrixOutput from "./kashtrix-output";

export const metadata: Metadata = {
  title: "Kashtrix Live Output | NPL",
  description: "Full-screen automated NPL cricket broadcast output.",
};

export default function KashtrixOutputPage() {
  return <KashtrixOutput />;
}
