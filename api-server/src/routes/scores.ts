import { Router, type IRouter } from "express";
import { db, scoresTable, usersTable } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";
import { SubmitScoreBody } from "@workspace/api-zod";
import { requireUser } from "../middlewares/sessionMiddleware";

const router: IRouter = Router();

router.post("/scores", requireUser, async (req, res): Promise<void> => {
  const parsed = SubmitScoreBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const mode = parsed.data.mode ?? "normal";
  const [row] = await db
    .insert(scoresTable)
    .values({ userId: req.user!.id, score: parsed.data.score, mode })
    .returning();
  res.status(201).json(row);
});

router.get("/leaderboard", async (_req, res): Promise<void> => {
  const bestScore = sql<number>`MAX(${scoresTable.score})`.as("best_score");
  const bestAt = sql<Date>`MAX(${scoresTable.createdAt})`.as("best_at");
  const painBest = sql<number | null>`MAX(CASE WHEN ${scoresTable.mode} = 'pain' THEN ${scoresTable.score} END)`.as("pain_best");

  const rows = await db
    .select({
      userId: scoresTable.userId,
      username: usersTable.username,
      nameColor: usersTable.nameColor,
      nameColor2: usersTable.nameColor2,
      score: bestScore,
      createdAt: bestAt,
      painBest,
    })
    .from(scoresTable)
    .innerJoin(usersTable, eq(usersTable.id, scoresTable.userId))
    .groupBy(scoresTable.userId, usersTable.username, usersTable.nameColor, usersTable.nameColor2)
    .orderBy(desc(bestScore))
    .limit(100);

  res.json(rows);
});

export default router;
