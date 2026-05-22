import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCurrentUser,
  useGetLeaderboard,
  useLogin,
  useLogout,
  useSetNameColor,
  useSignup,
  useSubmitScore,
  getGetCurrentUserQueryKey,
  getGetLeaderboardQueryKey,
} from "@workspace/api-client-react";

const NAME_COLOR_PALETTE: Array<{ value: string; label: string }> = [
  { value: "#facc15", label: "Gold" },
  { value: "#dc2626", label: "Crimson" },
  { value: "#ec4899", label: "Magenta" },
  { value: "#a855f7", label: "Purple" },
  { value: "#22d3ee", label: "Cyan" },
  { value: "#84cc16", label: "Lime" },
  { value: "#f97316", label: "Orange" },
  { value: "#ffffff", label: "White" },
];

const RANK_COLORS: Record<number, string> = {
  2: "#c0c0c0", // silver
  3: "#cd7f32", // bronze
};
const RANK_BORDER: Record<number, string> = {
  1: "border-primary/40",
  2: "border-[#c0c0c0]/40",
  3: "border-[#cd7f32]/40",
};
const RANK_LABEL_COLOR: Record<number, string> = {
  1: "text-primary",
  2: "text-[#c0c0c0]",
  3: "text-[#cd7f32]",
};

const DEFAULT_NAME_COLOR = "#9ca3af";

function getNameStyle(
  rank: number,
  nameColor: string | null | undefined,
  nameColor2: string | null | undefined,
) {
  if (rank === 1) {
    const c1 = nameColor ?? DEFAULT_NAME_COLOR;
    const c2 = nameColor2 ?? null;
    if (c2 && c1 !== c2) {
      return {
        background: `linear-gradient(to right, ${c1}, ${c2})`,
        WebkitBackgroundClip: "text" as const,
        WebkitTextFillColor: "transparent" as const,
        backgroundClip: "text" as const,
      };
    }
    return { color: c1 };
  }
  return { color: RANK_COLORS[rank] ?? DEFAULT_NAME_COLOR };
}

const GRID_SIZE = 20;
const CELL_SIZE = 24;
const BASE_TICK_MS = 138;
const SPEED_INCREMENT = 0.05; // +5% per cleared QTE
const MAX_SPEED_MULT = 2.25;  // cap at 225%
const POINTS_PER_APPLE = 10;
const MAX_QUEUE = 2;

const QTE_SCORE_INTERVAL = 50;
const QTE_BASE_PRESSES = 4;
const QTE_BASE_DURATION_MS = 4000;
const QTE_DURATION_INCREMENT_MS = 250;
const QTE_MISTAKE_PENALTY_MS = 250;

type Point = { x: number; y: number };
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type QteKey = "A" | "D";

type QteState = {
  level: number;
  sequence: QteKey[];
  index: number;
  endAt: number;
  duration: number;
  misses: number;
};

const DIR_VECTORS: Record<Direction, Point> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

const OPPOSITES: Record<Direction, Direction> = {
  UP: "DOWN",
  DOWN: "UP",
  LEFT: "RIGHT",
  RIGHT: "LEFT",
};

const QTE_SAFE_MARGIN = 2;

function randomFoodPosition(snake: Point[], margin = 0): Point {
  const lo = margin;
  const hi = GRID_SIZE - margin;
  const range = Math.max(1, hi - lo);
  const occupied = new Set(snake.map((s) => `${s.x},${s.y}`));

  for (let i = 0; i < 200; i++) {
    const candidate = {
      x: lo + Math.floor(Math.random() * range),
      y: lo + Math.floor(Math.random() * range),
    };
    if (!occupied.has(`${candidate.x},${candidate.y}`)) return candidate;
  }

  // Fallback: scan every cell within the margin, then any cell as a last resort.
  for (let y = lo; y < hi; y++) {
    for (let x = lo; x < hi; x++) {
      if (!occupied.has(`${x},${y}`)) return { x, y };
    }
  }
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (!occupied.has(`${x},${y}`)) return { x, y };
    }
  }
  return { x: 0, y: 0 };
}

function randomQteSequence(length: number): QteKey[] {
  const seq: QteKey[] = [];
  for (let i = 0; i < length; i++) seq.push(Math.random() < 0.5 ? "A" : "D");
  return seq;
}

const INITIAL_SNAKE: Point[] = [
  { x: 8, y: 10 },
  { x: 7, y: 10 },
  { x: 6, y: 10 },
];

type AuthMode = "login" | "signup";

function AuthPanel() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const login = useLogin();
  const signup = useSignup();
  const pending = login.isPending || signup.isPending;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const trimmed = username.trim();
    if (trimmed.length < 3 || trimmed.length > 32 || !/^[A-Za-z0-9_]+$/.test(trimmed)) {
      setError("Username must be 3–32 letters, numbers, or underscores.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    const handler = mode === "login" ? login : signup;
    handler.mutate(
      { data: { username: trimmed, password } },
      {
        onSuccess: () => {
          setUsername("");
          setPassword("");
          queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetLeaderboardQueryKey() });
        },
        onError: (err: unknown) => {
          const message = (err as { data?: { error?: string }; message?: string })?.data?.error
            ?? (err as { message?: string })?.message
            ?? "Something went wrong.";
          setError(message);
        },
      },
    );
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full max-w-sm flex-col gap-2 rounded-lg border border-border bg-card p-4 shadow-md"
    >
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {mode === "login" ? "Log in to save your scores" : "Create a player account"}
        </h3>
        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === "login" ? "signup" : "login"));
            setError(null);
          }}
          className="text-xs text-primary hover:underline"
        >
          {mode === "login" ? "Need an account?" : "Have one already?"}
        </button>
      </div>

      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Username
        <input
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={pending}
          maxLength={32}
          className="rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
          placeholder="snakeking"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Password
        <input
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={pending}
          maxLength={200}
          className="rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
          placeholder="At least 6 characters"
        />
      </label>

      {error && <div className="text-xs text-accent">{error}</div>}

      <button
        type="submit"
        disabled={pending || username.length === 0 || password.length === 0}
        className="mt-1 rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending
          ? mode === "login"
            ? "Logging in…"
            : "Creating account…"
          : mode === "login"
            ? "Log in"
            : "Sign up"}
      </button>
    </form>
  );
}

export default function SnakeGame() {
  const queryClient = useQueryClient();
  const meQuery = useGetCurrentUser();
  const leaderboardQuery = useGetLeaderboard();
  const submitScore = useSubmitScore();
  const logoutMutation = useLogout();
  const setNameColor = useSetNameColor();

  const me = meQuery.data?.user ?? null;
  const isSignedIn = me !== null;
  const isAuthLoading = meQuery.isLoading;

  const [painMode, setPainMode] = useState<boolean>(() =>
    typeof window !== "undefined" && localStorage.getItem("qte-snake.painmode") === "1"
  );
  const painModeRef = useRef(painMode);
  useEffect(() => { painModeRef.current = painMode; }, [painMode]);
  useEffect(() => {
    if (painMode) document.documentElement.classList.add("pain-mode");
    else document.documentElement.classList.remove("pain-mode");
    return () => document.documentElement.classList.remove("pain-mode");
  }, [painMode]);

  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Point>({ x: 14, y: 10 });
  const [score, setScore] = useState(0);
  const hsKey = painMode ? "qte-snake.highscore.pain" : "qte-snake.highscore";
  const [highScore, setHighScore] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const key = localStorage.getItem("qte-snake.painmode") === "1"
      ? "qte-snake.highscore.pain" : "qte-snake.highscore";
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(hsKey, String(highScore));
  }, [highScore, hsKey]);

  const myEntry = (leaderboardQuery.data ?? []).find((e) => isSignedIn && e.userId === me!.id);
  const myServerBest = painMode
    ? (myEntry?.painBest ?? 0)
    : (myEntry?.score ?? 0);
  useEffect(() => {
    if (myServerBest > 0) {
      setHighScore((h) => (myServerBest > h ? myServerBest : h));
    }
  }, [myServerBest]);
  const [gameOver, setGameOver] = useState(false);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [qte, setQte] = useState<QteState | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [tickMs, setTickMs] = useState(BASE_TICK_MS);

  const directionRef = useRef<Direction>("RIGHT");
  const inputQueueRef = useRef<Direction[]>([]);
  const qteActiveRef = useRef(false);
  const pausedRef = useRef(false);
  const submittedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    qteActiveRef.current = qte !== null;
  }, [qte]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const togglePainMode = useCallback(() => {
    setPainMode((prev) => {
      const next = !prev;
      localStorage.setItem("qte-snake.painmode", next ? "1" : "0");
      const key = next ? "qte-snake.highscore.pain" : "qte-snake.highscore";
      const raw = localStorage.getItem(key);
      const parsed = raw ? parseInt(raw, 10) : 0;
      setHighScore(Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
      return next;
    });
    // Return to start screen
    setSnake(INITIAL_SNAKE);
    setFood(randomFoodPosition(INITIAL_SNAKE));
    setScore(0);
    setGameOver(false);
    setRunning(false);
    setPaused(false);
    setQte(null);
    setTickMs(BASE_TICK_MS);
    directionRef.current = "RIGHT";
    inputQueueRef.current = [];
  }, []);

  const resetGame = useCallback(() => {
    setSnake(INITIAL_SNAKE);
    setFood(randomFoodPosition(INITIAL_SNAKE));
    setScore(0);
    setGameOver(false);
    setRunning(true);
    setPaused(false);
    setQte(null);
    setTickMs(BASE_TICK_MS);
    directionRef.current = "RIGHT";
    inputQueueRef.current = [];
  }, []);

  const enqueueDirection = useCallback((next: Direction) => {
    const queue = inputQueueRef.current;
    if (queue.length >= MAX_QUEUE) return;
    const reference =
      queue.length > 0 ? queue[queue.length - 1]! : directionRef.current;
    if (next === reference) return;
    if (next === OPPOSITES[reference]) return;
    queue.push(next);
  }, []);

  const startQte = useCallback((newScore: number) => {
    const level = newScore / QTE_SCORE_INTERVAL;
    const presses = QTE_BASE_PRESSES + (level - 1);
    const duration = QTE_BASE_DURATION_MS + QTE_DURATION_INCREMENT_MS * (level - 1);
    const startedAt = Date.now();
    setQte({
      level,
      sequence: randomQteSequence(presses),
      index: 0,
      endAt: startedAt + duration,
      duration,
      misses: 0,
    });
    inputQueueRef.current = [];
    setNow(startedAt);
  }, []);

  useEffect(() => {
    if (!gameOver) return;
    if (score <= 0) return;
    if (!isSignedIn) return;
    if (submittedRef.current.has(score)) return;
    submittedRef.current.add(score);

    submitScore.mutate(
      { data: { score, mode: painModeRef.current ? "pain" : "normal" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetLeaderboardQueryKey() });
        },
      },
    );
  }, [gameOver, score, isSignedIn, submitScore, queryClient]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      if (e.key === "Escape") {
        if (gameOver || qte) return;
        e.preventDefault();
        setPaused((p) => !p);
        if (!running) setRunning(true);
        return;
      }

      if (paused || qte) return;

      let next: Direction | null = null;
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          next = "UP";
          break;
        case "ArrowDown":
        case "s":
        case "S":
          next = "DOWN";
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          next = "LEFT";
          break;
        case "ArrowRight":
        case "d":
        case "D":
          next = "RIGHT";
          break;
        case " ":
        case "Enter":
          if (gameOver) {
            resetGame();
            e.preventDefault();
          }
          return;
      }
      if (next) {
        if (!running) return;
        e.preventDefault();
        enqueueDirection(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enqueueDirection, gameOver, running, resetGame, qte, paused]);

  useEffect(() => {
    if (!qte || paused) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const k = e.key.toLowerCase();
      if (k !== "a" && k !== "d") return;
      e.preventDefault();
      const pressed: QteKey = k === "a" ? "A" : "D";
      setQte((curr) => {
        if (!curr) return curr;
        const expected = curr.sequence[curr.index]!;
        if (pressed === expected) {
          const nextIdx = curr.index + 1;
          if (nextIdx >= curr.sequence.length) {
            setTickMs((t) => {
              const inc = painModeRef.current ? 0.10 : SPEED_INCREMENT;
              const currentMult = BASE_TICK_MS / t;
              const newMult = Math.min(currentMult + inc, MAX_SPEED_MULT);
              return Math.round(BASE_TICK_MS / newMult);
            });
            return null;
          }
          return { ...curr, index: nextIdx };
        }
        if (painModeRef.current) {
          setGameOver(true);
          setRunning(false);
          return null;
        }
        return { ...curr, endAt: curr.endAt - QTE_MISTAKE_PENALTY_MS, misses: curr.misses + 1 };
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [qte, paused]);

  useEffect(() => {
    if (!qte) return;
    let lastTick = Date.now();
    const id = window.setInterval(() => {
      const t = Date.now();
      const delta = t - lastTick;
      lastTick = t;
      if (pausedRef.current) {
        setQte((curr) => (curr ? { ...curr, endAt: curr.endAt + delta } : curr));
        return;
      }
      setNow(t);
      setQte((curr) => {
        if (!curr) return curr;
        if (t >= curr.endAt) {
          window.clearInterval(id);
          setGameOver(true);
          setRunning(false);
          return null;
        }
        return curr;
      });
    }, 50);
    return () => window.clearInterval(id);
  }, [qte]);

  useEffect(() => {
    if (!running || gameOver) return;
    const id = window.setInterval(() => {
      if (qteActiveRef.current || pausedRef.current) return;

      setSnake((prevSnake) => {
        const queued = inputQueueRef.current.shift();
        if (queued) directionRef.current = queued;
        const vec = DIR_VECTORS[directionRef.current];
        const head = prevSnake[0]!;
        const newHead: Point = { x: head.x + vec.x, y: head.y + vec.y };

        if (
          newHead.x < 0 ||
          newHead.x >= GRID_SIZE ||
          newHead.y < 0 ||
          newHead.y >= GRID_SIZE
        ) {
          setGameOver(true);
          setRunning(false);
          return prevSnake;
        }

        const ateFood = newHead.x === food.x && newHead.y === food.y;
        const bodyToCheck = ateFood ? prevSnake : prevSnake.slice(0, -1);
        if (bodyToCheck.some((s) => s.x === newHead.x && s.y === newHead.y)) {
          setGameOver(true);
          setRunning(false);
          return prevSnake;
        }

        const newSnake = ateFood
          ? [newHead, ...prevSnake]
          : [newHead, ...prevSnake.slice(0, -1)];

        if (ateFood) {
          let nextScore = 0;
          setScore((s) => {
            const next = s + POINTS_PER_APPLE;
            nextScore = next;
            setHighScore((h) => (next > h ? next : h));
            if (next > 0 && next % QTE_SCORE_INTERVAL === 0) startQte(next);
            return next;
          });
          const nextAppleTriggersQte =
            !painModeRef.current &&
            (nextScore + POINTS_PER_APPLE) % QTE_SCORE_INTERVAL === 0;
          setFood(randomFoodPosition(newSnake, nextAppleTriggersQte ? QTE_SAFE_MARGIN : 0));
        }

        return newSnake;
      });
    }, tickMs);
    return () => window.clearInterval(id);
  }, [running, gameOver, food, startQte, tickMs]);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      },
    });
  };

  const boardPx = GRID_SIZE * CELL_SIZE;
  const qteRemainingMs = qte ? Math.max(0, qte.endAt - now) : 0;
  const qteRemainingSec = (qteRemainingMs / 1000).toFixed(2);
  const qteProgressPct = qte ? Math.max(0, Math.min(100, (qteRemainingMs / qte.duration) * 100)) : 0;
  const speedPct = Math.round((BASE_TICK_MS / tickMs) * 100);
  const leaderboard = leaderboardQuery.data ?? [];

  const userInitial = me ? me.username[0]?.toUpperCase() ?? "?" : "?";

  return (
    <div className="min-h-screen w-full bg-background p-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6">
        <h1 className="self-stretch text-3xl font-bold tracking-tight text-primary">
          QTE Snake
        </h1>

        <div className="flex flex-col items-start gap-4 sm:flex-row sm:flex-nowrap">
          <div className="flex flex-col gap-3" style={{ width: boardPx }}>
            <div className="flex w-full items-center justify-between gap-8 px-2">
              <div className="text-left">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Score</div>
                <div className="font-mono text-2xl text-foreground">{score}</div>
              </div>
              <div className="text-center">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Speed</div>
                <div className="font-mono text-2xl text-foreground">{speedPct}%</div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Best</div>
                <div className="font-mono text-2xl text-foreground">{highScore}</div>
              </div>
            </div>

            <div className="relative rounded-lg border-2 border-border bg-card shadow-2xl" style={{ width: boardPx, height: boardPx }}>
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
                  backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
                }}
              />

              <div
                className="absolute rounded-full bg-accent shadow-md transition-transform"
                style={{
                  width: CELL_SIZE - 4,
                  height: CELL_SIZE - 4,
                  transform: `translate(${food.x * CELL_SIZE + 2}px, ${food.y * CELL_SIZE + 2}px)`,
                }}
              />

              {snake.map((segment, idx) => (
                <div
                  key={idx}
                  className="absolute rounded-sm"
                  style={{
                    width: CELL_SIZE - 2,
                    height: CELL_SIZE - 2,
                    transform: `translate(${segment.x * CELL_SIZE + 1}px, ${segment.y * CELL_SIZE + 1}px)`,
                    backgroundColor:
                      idx === 0
                        ? "hsl(var(--primary))"
                        : `hsl(140 ${Math.max(40, 70 - idx * 2)}% ${Math.max(35, 55 - idx * 1.2)}%)`,
                  }}
                />
              ))}

              {!running && !gameOver && !qte && !paused && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/70 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3">
                    <div className="text-2xl font-semibold text-foreground">Ready?</div>
                    <button
                      type="button"
                      onClick={() => setRunning(true)}
                      className="rounded-md bg-primary px-6 py-2 text-base font-semibold text-primary-foreground shadow transition hover:opacity-90 active:opacity-80"
                    >
                      Start game
                    </button>
                  </div>
                </div>
              )}

              {qte && !paused && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/85 backdrop-blur-sm">
                  <div className="flex w-full max-w-sm flex-col items-center gap-4 px-6">
                    <div className="text-xs uppercase tracking-widest text-accent">Quick Time Event — Level {qte.level}</div>
                    <div className="text-sm text-muted-foreground">Press the keys in order</div>
                    <div className="flex flex-wrap justify-center gap-2">
                      {qte.sequence.map((key, i) => {
                        const done = i < qte.index;
                        const current = i === qte.index;
                        return (
                          <div
                            key={i}
                            className={[
                              "flex h-12 w-12 flex-col items-center justify-center gap-0 rounded-md border-2 font-mono font-bold leading-none transition",
                              done
                                ? "border-primary bg-primary/20 text-primary"
                                : current
                                  ? "border-accent bg-accent/20 text-accent scale-110"
                                  : "border-border bg-card text-muted-foreground",
                            ].join(" ")}
                          >
                            <span className="text-sm font-bold opacity-90">{key}</span>
                            <span className="text-2xl">{key === "A" ? "←" : "→"}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="w-full">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-accent transition-[width] duration-75 ease-linear" style={{ width: `${qteProgressPct}%` }} />
                      </div>
                      <div className="mt-1 flex justify-between font-mono text-xs text-muted-foreground">
                        <span>{qteRemainingSec}s left</span>
                        <span>
                          {qte.misses > 0
                            ? `${qte.misses} miss${qte.misses === 1 ? "" : "es"} (-${(qte.misses * QTE_MISTAKE_PENALTY_MS) / 1000}s)`
                            : "no misses"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {paused && !gameOver && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/85 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-4 px-6">
                    <div className="text-3xl font-bold text-foreground">Paused</div>
                    <div className="text-xs text-muted-foreground">
                      Press <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">Esc</kbd> to resume
                    </div>
                    <div className="mt-2 flex gap-3">
                      <button type="button" onClick={() => setPaused(false)} className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:opacity-90">
                        Resume
                      </button>
                      <button type="button" onClick={resetGame} className="rounded-md border border-border bg-card px-5 py-2 text-sm font-semibold text-foreground transition hover:bg-muted">
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {gameOver && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-accent">Game Over</div>
                    <div className="mt-2 font-mono text-lg text-foreground">Score: {score}</div>
                    {isSignedIn && score > 0 ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {submitScore.isPending
                          ? "Submitting score…"
                          : submitScore.isSuccess
                            ? "Score saved to leaderboard"
                            : submitScore.isError
                              ? "Could not save score"
                              : ""}
                      </div>
                    ) : score > 0 ? (
                      <div className="mt-1 text-xs text-muted-foreground">Log in to save your score to the leaderboard</div>
                    ) : null}
                    <button type="button" onClick={resetGame} className="mt-4 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:opacity-90 active:opacity-80">
                      Play again (Enter)
                    </button>
                  </div>
                </div>
              )}
            </div>

            <p className="text-sm text-muted-foreground text-center">WSAD or Arrows to move | AD Quick Time Events | Version 3.0

            Change logs:
            Colors can be customized further for #1, #2, and #3 |  QOL text changes | fixes to the spawning of apples | Pain Mode: Less safety lines. Higher difficulty. Cool color to your score on the leaderboard.</p>

            <div className="flex flex-col items-center gap-3 pt-2">
              {isAuthLoading ? (
                <div className="text-sm text-muted-foreground">…</div>
              ) : isSignedIn && me ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{userInitial}</div>
                    <span className="text-sm text-foreground">{me.username}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                    className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground transition hover:bg-muted disabled:opacity-60"
                  >
                    {logoutMutation.isPending ? "Logging out…" : "Log out"}
                  </button>
                </div>
              ) : (
                <AuthPanel />
              )}
              <button
                type="button"
                onClick={togglePainMode}
                className="rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition border border-border bg-card hover:bg-muted text-[#c4001e]"
              >
                {painMode ? "Exit Pain Mode" : "⚠ Pain Mode"}
              </button>
            </div>
          </div>

          <aside className="w-full rounded-lg border border-border bg-card p-2 shadow-xl sm:w-56 sm:self-start" style={{ minHeight: boardPx }}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <h2 className="text-xs font-semibold text-foreground">Leaderboard</h2>
            </div>

            {leaderboardQuery.isLoading ? (
              <div className="text-xs text-muted-foreground">Loading…</div>
            ) : leaderboardQuery.isError ? (
              <div className="text-xs text-accent">Could not load.</div>
            ) : leaderboard.length === 0 ? (
              <div className="text-xs text-muted-foreground">No scores yet — be the first!</div>
            ) : (
              <ol className="scrollbar-subtle max-h-[420px] space-y-1 overflow-y-auto pr-0.5">
                {leaderboard.map((entry, idx) => {
                  const rank = idx + 1;
                  const isMe = isSignedIn && entry.userId === me?.id;
                  const nameStyle = getNameStyle(rank, entry.nameColor, entry.nameColor2);
                  return (
                    <li key={entry.userId} className={[
                      "flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs",
                      isMe ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-muted/40",
                    ].join(" ")}>
                      <span className="w-3 text-right font-mono text-[9px] text-muted-foreground">{rank}</span>
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[9px] font-semibold text-foreground">
                        {entry.username[0]?.toUpperCase() ?? "?"}
                      </div>
                      <span className="flex-1 truncate font-semibold" style={nameStyle}>
                        {entry.username}
                        {isMe && <span className="ml-1 text-[9px] font-normal text-muted-foreground">(you)</span>}
                      </span>
                      <span
                        className="font-mono font-semibold"
                        style={{
                          color: (entry.painBest != null && entry.painBest >= entry.score)
                            ? "#ef4444"
                            : undefined,
                        }}
                      >{entry.score}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </aside>

          {(() => {
            if (!isSignedIn || !me) return null;
            const myRankIdx = leaderboard.findIndex((e) => e.userId === me.id);
            if (myRankIdx === -1 || myRankIdx > 2) return null;
            const myRank = myRankIdx + 1;
            const rankTitles = ["Congrats on #1", "You're #2!", "You're #3!"];

            const saveColor = (color1: string, color2?: string | null) =>
              setNameColor.mutate(
                { data: { color1, color2: color2 ?? null } },
                {
                  onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
                    queryClient.invalidateQueries({ queryKey: getGetLeaderboardQueryKey() });
                  },
                },
              );

            const Swatches = ({
              selectedValue,
              disabledValue,
              onClick,
            }: {
              selectedValue: string | null | undefined;
              disabledValue?: string | null | undefined;
              onClick: (v: string) => void;
            }) => (
              <div className="grid grid-cols-4 gap-1.5">
                {NAME_COLOR_PALETTE.map((opt) => {
                  const selected = selectedValue?.toLowerCase() === opt.value;
                  const blocked = disabledValue?.toLowerCase() === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      title={opt.label}
                      aria-label={opt.label}
                      disabled={setNameColor.isPending || blocked}
                      onClick={() => onClick(opt.value)}
                      className={[
                        "h-7 w-7 rounded-full border-2 transition disabled:cursor-not-allowed disabled:opacity-25",
                        selected ? "scale-110 border-white shadow" : "border-border hover:border-foreground/60",
                      ].join(" ")}
                      style={{ backgroundColor: opt.value }}
                    />
                  );
                })}
              </div>
            );

            return (
              <aside className={[
                "w-full rounded-lg border bg-card p-3 shadow-xl sm:w-40 sm:self-start",
                RANK_BORDER[myRank] ?? "border-border",
              ].join(" ")}>
                <div className="mb-2 flex flex-col">
                  <span className={["text-[9px] uppercase tracking-widest", RANK_LABEL_COLOR[myRank]].join(" ")}>
                    {rankTitles[myRankIdx]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {myRank === 1 ? "Pick your gradient" : "Pick your name color"}
                  </span>
                </div>

                {myRank === 1 ? (
                  <>
                    <div className="mb-1 text-[9px] text-muted-foreground">Start</div>
                    <Swatches
                      selectedValue={me.nameColor}
                      disabledValue={me.nameColor2}
                      onClick={(v) => saveColor(v, me.nameColor2)}
                    />
                    <div className="mb-1 mt-2 flex items-center">
                      <span className="text-[9px] text-muted-foreground">End</span>
                      {me.nameColor2 && (
                        <button
                          type="button"
                          title="Remove gradient"
                          className="ml-auto text-[9px] text-muted-foreground hover:text-foreground"
                          onClick={() => saveColor(me.nameColor ?? NAME_COLOR_PALETTE[0]!.value, null)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <Swatches
                      selectedValue={me.nameColor2}
                      disabledValue={me.nameColor}
                      onClick={(v) => saveColor(me.nameColor ?? NAME_COLOR_PALETTE[0]!.value, v)}
                    />
                  </>
                ) : (
                  <Swatches
                    selectedValue={me.nameColor}
                    onClick={(v) => saveColor(v)}
                  />
                )}

                {setNameColor.isError && (
                  <div className="mt-2 text-[10px] text-accent">Could not save.</div>
                )}
              </aside>
            );
          })()}

        </div>
      </div>
    </div>
  );
}
