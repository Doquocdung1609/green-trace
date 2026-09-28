import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { lifecycleTransitions } from "../services/lifecycleEngine.js";
import {
  adminRoleSchema,
  evidenceTypes,
  scopes,
  stages,
} from "../validators/schemas.js";

export const adminRouter = Router();
adminRouter.get(
  "/admin/summary",
  requireAuth,
  requireRole("admin"),
  async (_req, res) => {
    const [users, organizations, activeVerifiers, auditEvents] =
      await Promise.all([
        prisma.user.count(),
        prisma.organization.count(),
        prisma.user.count({ where: { role: "verifier" } }),
        prisma.auditLog.findMany({
          take: 30,
          orderBy: { createdAt: "desc" },
          include: { user: { select: { fullName: true } } },
        }),
      ]);
    res.json({ users, organizations, activeVerifiers, auditEvents });
  },
);
adminRouter.get(
  "/admin/users",
  requireAuth,
  requireRole("admin"),
  async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        solanaWallet: true,
        organization: { select: { id: true, name: true, region: true } },
      },
    });
    res.json({ users });
  },
);
adminRouter.patch(
  "/admin/users/:id/role",
  requireAuth,
  requireRole("admin"),
  validate(adminRoleSchema),
  async (req, res) => {
    if (req.params.id === req.user!.id && req.body.role !== "admin")
      return res.status(409).json({ error: "Không thể tự gỡ quyền admin" });
    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: String(req.params.id) },
        data: { role: req.body.role },
        select: { id: true, email: true, fullName: true, role: true },
      });
      await tx.auditLog.create({
        data: {
          userId: req.user!.id,
          action: "USER_ROLE_UPDATED",
          entityType: "User",
          entityId: updated.id,
          metadata: JSON.stringify({ role: updated.role }),
        },
      });
      return updated;
    });
    res.json({ user });
  },
);
adminRouter.get(
  "/admin/organizations",
  requireAuth,
  requireRole("admin"),
  async (_req, res) => {
    const organizations = await prisma.organization.findMany({
      include: { _count: { select: { users: true, assets: true } } },
      orderBy: { name: "asc" },
    });
    res.json({ organizations });
  },
);
adminRouter.get(
  "/admin/policy",
  requireAuth,
  requireRole("admin"),
  (_req, res) =>
    res.json({
      version: "2026.09",
      evidenceTypes,
      verificationScopes: scopes,
      lifecycleStages: stages,
      lifecycleTransitions,
      editingMode: "SOURCE_REVIEW_REQUIRED",
    }),
);
