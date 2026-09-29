import type { CSSProperties } from "react";

export function TrustScore({ score, label = "Điểm tin cậy hồ sơ" }: { score: number; label?: string }) {
  const safeScore = Math.max(0, Math.min(100, score));
  return (
    <div className="trust-score" style={{ "--score": safeScore } as CSSProperties} aria-label={`${label}: ${safeScore} trên 100`}>
      <div><strong>{safeScore}</strong><span>/100</span><small>{label}</small></div>
    </div>
  );
}
