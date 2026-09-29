export const lifecycleTransitions: Record<string, string[]> = {
  REGISTERED: ["PLANTED_VERIFIED", "ARCHIVED"],
  PLANTED_VERIFIED: ["GROWING", "ARCHIVED"],
  GROWING: ["INSPECTED", "ARCHIVED"],
  INSPECTED: ["MATURE", "GROWING", "ARCHIVED"],
  MATURE: ["HARVEST_READY", "ARCHIVED"],
  HARVEST_READY: ["HARVESTED", "ARCHIVED"],
  HARVESTED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function validateTransition(
  from: string,
  to: string,
  context: { approvedScopes: string[]; evidenceTypes: string[] },
) {
  if (!lifecycleTransitions[from]?.includes(to))
    return {
      ok: false,
      reason: `Bất thường logic: không thể chuyển từ ${from} sang ${to}.`,
    };
  if (
    to === "PLANTED_VERIFIED" &&
    !context.approvedScopes.some((s) =>
      ["EXISTENCE", "LOCATION", "AGE_OR_LIFECYCLE"].includes(s),
    )
  )
    return {
      ok: false,
      reason: "Cần attestation về tồn tại, vị trí hoặc vòng đời.",
    };
  if (
    to === "INSPECTED" &&
    (!context.evidenceTypes.includes("INSPECTION") ||
      !context.approvedScopes.includes("EXISTENCE"))
  )
    return {
      ok: false,
      reason: "Cần bằng chứng INSPECTION và attestation phạm vi EXISTENCE.",
    };
  if (
    to === "HARVEST_READY" &&
    !context.approvedScopes.includes("AGE_OR_LIFECYCLE")
  )
    return { ok: false, reason: "Cần xác minh độc lập về tuổi hoặc vòng đời." };
  return { ok: true as const };
}
