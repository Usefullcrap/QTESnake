import type { Request, Response, NextFunction } from "express";
import { db, sessionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export const SESSION_COOKIE = "snake_sid";

export interface SessionUser {
  id: number;
  username: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
      sessionToken?: string;
    }
  }
}

export async function loadSession(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token || typeof token !== "string") {
    next();
    return;
  }
  try {
    const [row] = await db
      .select({
        userId: sessionsTable.userId,
        expiresAt: sessionsTable.expiresAt,
        username: usersTable.username,
      })
      .from(sessionsTable)
      .innerJoin(usersTable, eq(usersTable.id, sessionsTable.userId))
      .where(eq(sessionsTable.token, token))
      .limit(1);
    if (row && row.expiresAt > new Date()) {
      req.user = { id: row.userId, username: row.username };
      req.sessionToken = token;
    }
  } catch (err) {
    req.log?.warn({ err }, "Failed to load session");
  }
  next();
}

export function requireUser(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}
