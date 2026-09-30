import type { User } from "@prisma/client";
import { prisma } from "../db/prisma.js";

export type AssetAction = "read" | "manage" | "commerce";

export class AssetAccessError extends Error {
  constructor(
    message: string,
    readonly status: 403 | 404,
  ) {
    super(message);
  }
}

async function verifierAssetIds(user: User) {
  const organization = user.organizationId
    ? await prisma.organization.findUnique({ where: { id: user.organizationId } })
    : null;
  const requests = await prisma.verificationRequest.findMany({
    where: {
      status: "PENDING",
      OR: [{ requestedVerifierId: null }, { requestedVerifierId: user.id }],
      AND: [
        {
          OR: [
            { requiredVerifierCategory: null },
            {
              requiredVerifierCategory:
                organization?.verifierCategory ?? "__no_category__",
            },
          ],
        },
      ],
    },
    include: {
      policy: true,
      evidence: {
        include: { submittedByUser: { select: { organizationId: true } } },
      },
    },
  });
  return [
    ...new Set(
      requests
        .filter(
          (request) =>
            !request.policy?.independentOrganizationRequired ||
            (Boolean(user.organizationId) &&
              request.evidence.submittedByUser.organizationId !==
                user.organizationId),
        )
        .map((request) => request.assetId),
    ),
  ];
}

export async function getAccessibleAssetIds(
  user: User,
  action: AssetAction = "read",
): Promise<string[] | null> {
  if (user.role === "admin") return null;
  if (user.role === "operator") {
    if (!user.organizationId) return [];
    return (
      await prisma.asset.findMany({
        where: { organizationId: user.organizationId },
        select: { id: true },
      })
    ).map((asset) => asset.id);
  }
  if (action === "manage") return [];
  if (user.role === "verifier") return verifierAssetIds(user);
  if (user.role === "reviewer") {
    return [
      ...new Set(
        (
          await prisma.reviewCase.findMany({
            where: { reviewerId: user.id, status: "CLAIMED" },
            select: { assetId: true },
          })
        ).map((reviewCase) => reviewCase.assetId),
      ),
    ];
  }
  if (user.role === "buyer") {
    const [offers, transactions] = await Promise.all([
      prisma.assetOffer.findMany({
        where: {
          status: { in: ["AVAILABLE", "RESERVED"] },
          OR: [
            { status: "AVAILABLE" },
            { reservedBuyerId: user.id },
          ],
        },
        select: { assetId: true },
      }),
      prisma.assetTransaction.findMany({
        where: { buyerId: user.id },
        select: { assetId: true },
      }),
    ]);
    return [...new Set([...offers, ...transactions].map((item) => item.assetId))];
  }
  return [];
}

export async function assertAssetAccess(
  user: User,
  assetId: string,
  action: AssetAction = "read",
) {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw new AssetAccessError("Không tìm thấy tài sản", 404);
  const accessibleIds = await getAccessibleAssetIds(user, action);
  if (accessibleIds && !accessibleIds.includes(asset.id)) {
    throw new AssetAccessError("Không có quyền truy cập tài sản này", 403);
  }
  return asset;
}

export async function canReadEvidence(
  user: User,
  evidence: {
    id: string;
    assetId: string;
    visibility: string;
    asset: { organizationId: string };
  },
) {
  if (user.role === "admin") return true;
  if (user.role === "operator")
    return evidence.asset.organizationId === user.organizationId;
  if (user.role === "reviewer") {
    return Boolean(
      await prisma.reviewCase.findFirst({
        where: {
          assetId: evidence.assetId,
          reviewerId: user.id,
          status: "CLAIMED",
        },
        select: { id: true },
      }),
    );
  }
  if (user.role === "verifier") {
    const accessible = await verifierAssetIds(user);
    if (!accessible.includes(evidence.assetId)) return false;
    if (evidence.visibility === "PUBLIC") return true;
    return Boolean(
      await prisma.verificationRequest.findFirst({
        where: {
          evidenceId: evidence.id,
          status: "PENDING",
          OR: [{ requestedVerifierId: null }, { requestedVerifierId: user.id }],
        },
        select: { id: true },
      }),
    );
  }
  if (user.role === "buyer") {
    if (evidence.visibility === "PUBLIC") {
      const ids = await getAccessibleAssetIds(user);
      return ids === null || ids.includes(evidence.assetId);
    }
    if (evidence.visibility === "PARTNER") {
      return Boolean(
        await prisma.assetTransaction.findFirst({
          where: { assetId: evidence.assetId, buyerId: user.id },
          select: { id: true },
        }),
      );
    }
    return Boolean(
      await prisma.assetTransaction.findFirst({
        where: {
          assetId: evidence.assetId,
          buyerId: user.id,
          status: "COMPLETED",
          rightsDocumentEvidenceId: evidence.id,
        },
        select: { id: true },
      }),
    );
  }
  return false;
}
