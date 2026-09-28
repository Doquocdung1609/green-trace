import { Router } from "express";
import bcrypt from "bcrypt";
import { env } from "../config.js";
import { prisma } from "../db/prisma.js";
import { requireAuth, signSession } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  loginSchema,
  registerSchema,
  walletSchema,
} from "../validators/schemas.js";

export const authRouter = Router();
const cookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  maxAge: 12 * 60 * 60 * 1000,
};
const safeUser = <T extends { passwordHash: string }>(user: T) => {
  const { passwordHash, ...safe } = user;
  void passwordHash;
  return safe;
};

authRouter.post("/auth/login", validate(loginSchema), async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { email: req.body.email.toLowerCase() },
    include: { organization: true },
  });
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash)))
    return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
  res
    .cookie("gt_session", signSession(user.id), cookie)
    .json({ user: safeUser(user) });
});

authRouter.post(
  "/auth/register",
  validate(registerSchema),
  async (req, res) => {
    const email = req.body.email.toLowerCase();
    if (await prisma.user.findUnique({ where: { email } }))
      return res.status(409).json({ error: "Email đã được sử dụng" });
    const organization = req.body.organizationName
      ? await prisma.organization.upsert({
          where: { name: req.body.organizationName },
          create: {
            name: req.body.organizationName,
            type: "ASSET_OPERATOR",
            region: req.body.region || "Chưa khai báo",
          },
          update: {},
        })
      : null;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(req.body.password, 12),
        fullName: req.body.fullName,
        phone: req.body.phone,
        role: req.body.role,
        organizationId: organization?.id,
      },
      include: { organization: true },
    });
    res
      .cookie("gt_session", signSession(user.id), cookie)
      .status(201)
      .json({ user: safeUser(user) });
  },
);

authRouter.post("/auth/logout", (_req, res) =>
  res.clearCookie("gt_session", cookie).status(204).send(),
);
authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.user!.id },
    include: { organization: true },
  });
  res.json({ user: safeUser(user) });
});
authRouter.patch(
  "/me/wallet",
  requireAuth,
  validate(walletSchema),
  async (req, res) => {
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { solanaWallet: req.body.solanaWallet },
    });
    res.json({ user: safeUser(user) });
  },
);
