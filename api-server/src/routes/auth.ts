import { Router, type IRouter, type Response } from "express";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db, usersTable, sessionsTable, scoresTable } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";
import { SignupBody, LoginBody, SetNameColorBody } from "@workspace/api-zod";
import { SESSION_COOKIE, requireUser } from "../middlewares/sessionMiddleware";

const router: IRouter = Router();

const SESSION_TTL_DAYS = 30;
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

export const NAME_COLOR_PALETTE: ReadonlySet<string> = new Set([
  "#facc15",
  "#dc2626",
  "#ec4899",
  "#a855f7",
  "#22d3ee",
  "#84cc16",
  "#f97316",
  "#ffffff",
]);

function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS,
    path: "/",
  });
}

async function createSessionForUser(userId: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessionsTable).values({ token, userId, expiresAt });
  return token;
}

router.post("/auth/signup", async (req, res): Promise<void> => {
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error:
        "Username must be 3-32 letters, numbers, or underscores; password must be at least 6 characters.",
    });
    return;
  }
  const username = parsed.data.username.toLowerCase();
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  try {
    const [user] = await db
      .insert(usersTable)
      .values({ username, passwordHash })
      .returning({
        id: usersTable.id,
        username: usersTable.username,
        nameColor: usersTable.nameColor,
        nameColor2: usersTable.nameColor2,
      });
    if (!user) {
      res.status(500).json({ error: "Failed to create account" });
      return;
    }
    const token = await createSessionForUser(user.id);
    setSessionCookie(res, token);
    res.status(201).json({ id: user.id, username: user.username, nameColor: user.nameColor, nameColor2: user.nameColor2 });
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === "23505") {
      res.status(409).json({ error: "That username is already taken." });
      return;
    }
    req.log.error({ err }, "Signup failed");
    res.status(500).json({ error: "Failed to create account" });
  }
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(401).json({ error: "Invalid username or password." });
    return;
  }
  const username = parsed.data.username.toLowerCase();
  const [user] = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      passwordHash: usersTable.passwordHash,
      nameColor: usersTable.nameColor,
      nameColor2: usersTable.nameColor2,
    })
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);
  if (!user) {
    res.status(401).json({ error: "Invalid username or password." });
    return;
  }
  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid username or password." });
    return;
  }
  const token = await createSessionForUser(user.id);
  setSessionCookie(res, token);
  res.json({ id: user.id, username: user.username, nameColor: user.nameColor, nameColor2: user.nameColor2 });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const token = req.sessionToken;
  if (token) {
    try {
      await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
    } catch (err) {
      req.log.warn({ err }, "Failed to delete session row on logout");
    }
  }
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ success: true });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  if (!req.user) {
    res.json({ user: null });
    return;
  }
  const [row] = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      nameColor: usersTable.nameColor,
      nameColor2: usersTable.nameColor2,
    })
    .from(usersTable)
    .where(eq(usersTable.id, req.user.id))
    .limit(1);
  if (!row) {
    res.json({ user: null });
    return;
  }
  res.json({ user: row });
});

router.put("/auth/me/color", requireUser, async (req, res): Promise<void> => {
  const parsed = SetNameColorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input." });
    return;
  }

  const rawC1 = parsed.data.color1.toLowerCase();
  const rawC2 = parsed.data.color2 ? parsed.data.color2.toLowerCase() : null;

  if (!NAME_COLOR_PALETTE.has(rawC1)) {
    res.status(400).json({ error: "color1 is not in the allowed palette." });
    return;
  }
  if (rawC2 && !NAME_COLOR_PALETTE.has(rawC2)) {
    res.status(400).json({ error: "color2 is not in the allowed palette." });
    return;
  }
  if (rawC2 && rawC1 === rawC2) {
    res.status(400).json({ error: "color1 and color2 must be different." });
    return;
  }

  // Get top 3 with their current colors
  const bestScore = sql<number>`MAX(${scoresTable.score})`.as("best_score");
  const top3 = await db
    .select({
      userId: scoresTable.userId,
      nameColor: usersTable.nameColor,
      nameColor2: usersTable.nameColor2,
      score: bestScore,
    })
    .from(scoresTable)
    .innerJoin(usersTable, eq(usersTable.id, scoresTable.userId))
    .groupBy(scoresTable.userId, usersTable.nameColor, usersTable.nameColor2)
    .orderBy(desc(bestScore))
    .limit(3);

  const myIdx = top3.findIndex((e) => e.userId === req.user!.id);
  if (myIdx === -1) {
    res.status(403).json({ error: "Only top-3 players may pick a name color." });
    return;
  }

  const myRank = myIdx + 1;
  const myEntry = top3[myIdx]!;

  if (myRank > 1 && rawC2 !== null) {
    res.status(400).json({ error: "Only the #1 player can use a gradient (two colors)." });
    return;
  }

  // Slots: what I'm claiming vs what I'm releasing
  const claiming = myRank === 1 ? [rawC1, rawC2] : [rawC1];
  const releasing = myRank === 1
    ? [myEntry.nameColor ?? null, myEntry.nameColor2 ?? null]
    : [myEntry.nameColor ?? null];

  // Build update map; seed with my own change
  const updates = new Map<number, { nameColor?: string | null; nameColor2?: string | null }>();
  updates.set(
    req.user!.id,
    myRank === 1 ? { nameColor: rawC1, nameColor2: rawC2 } : { nameColor: rawC1 },
  );

  // For each color slot I'm claiming, find any other top-3 player holding that color and swap them
  for (let slot = 0; slot < claiming.length; slot++) {
    const claimed = claiming[slot];
    const released = releasing[slot] ?? null;
    if (!claimed) continue; // clearing a slot — no conflict

    for (const other of top3) {
      if (other.userId === req.user!.id) continue;
      const ex = updates.get(other.userId) ?? {};
      if (other.nameColor?.toLowerCase() === claimed) {
        updates.set(other.userId, { ...ex, nameColor: released });
      } else if (other.nameColor2?.toLowerCase() === claimed) {
        updates.set(other.userId, { ...ex, nameColor2: released });
      }
    }
  }

  await Promise.all(
    Array.from(updates.entries()).map(([uid, update]) =>
      db.update(usersTable).set(update).where(eq(usersTable.id, uid)),
    ),
  );

  const [updated] = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      nameColor: usersTable.nameColor,
      nameColor2: usersTable.nameColor2,
    })
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.id))
    .limit(1);

  if (!updated) {
    res.status(500).json({ error: "Failed to apply color." });
    return;
  }

  res.json(updated);
});

export default router;
