import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config.js";
import { prisma } from "../db/prisma.js";

interface TokenPayload {
  sub: string;
}

function tokenFrom(req: Request) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return req.cookies?.gt_session as string | undefined;
}

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const token = tokenFrom(req);
    if (!token) return next();
    const payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "greentrace-api",
    }) as TokenPayload;
    req.user =
      (await prisma.user.findUnique({ where: { id: payload.sub } })) ??
      undefined;
  } catch {
    req.user = undefined;
  }
  next();
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  await optionalAuth(req, res, () => undefined);
  if (!req.user)
    return res
      .status(401)
      .json({ error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn" });
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role))
      return res
        .status(403)
        .json({ error: "Bạn không có quyền thực hiện thao tác này" });
    next();
  };
}

export function signSession(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "12h",
    issuer: "greentrace-api",
  });
}
