"use client";
import Image from "next/image";
import { useState } from "react";

export function RemoteImage({
  src,
  alt,
  fallback,
  width = 64,
  height = 64,
  className = "",
}: {
  src?: string | null;
  alt: string;
  fallback: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);

  if (src && failed !== src) {
    return (
      <Image
        unoptimized
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        style={{ objectFit: "contain", width: "100%", height: "100%" }}
        onError={() => setFailed(src)}
      />
    );
  }

  return (
    <span aria-label={alt} className={className} style={{ fontWeight: 700, fontSize: "0.85em" }}>
      {fallback}
    </span>
  );
}
