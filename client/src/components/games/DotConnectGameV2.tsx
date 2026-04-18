/* DotConnectGameV2 — sandbox/test build. Uses the four exact puzzles
 * from the spec and Spark's cream/ink/purple design system (not the dark
 * blue game aesthetic from the earlier pass).
 *
 * Notes:
 * - Spec used `var(--color-background-primary)` etc. Spark's real tokens are
 *   `--color-cream`, `--color-cream-2`, `--color-ink`, `--color-ash`,
 *   `--color-purple` (#5b3df5). I map the spec's intent onto them.
 * - Solution paths were verified by hand against adjacency + no-overlap +
 *   no-endpoint-crossing. Puzzle 1 has a tight constraint: orange MUST go
 *   (3,1)(4,1)(4,0), so blue MUST reach (3,0) via col 0, and pink MUST take
 *   the long route around the top.
 * - Game logic, pointer events, help animation, scoring, win check, and
 *   onComplete are unchanged.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from './games.types';

// ---------- Types ----------
type ColorName = 'pink' | 'blue' | 'orange' | 'green' | 'red' | 'yellow';
type Cell = readonly [number, number];

interface Pair {
  color: ColorName;
  a: Cell;
  b: Cell;
}

interface Puzzle {
  id: number;
  grid: number;
  pairs: Pair[];
}

// ---------- Constants ----------
const CELL_SIZE_DEFAULT = 64;
const STROKE_WIDTH = 10;
const ENDPOINT_R = 13; // 26px diameter
const EMPTY_DOT_R = 4; // 8px diameter
const PER_PUZZLE_SECONDS = 30;
const HELP_STEP_MS = 80;
const MAX_HELPS_PER_PUZZLE = 2;
const SPARK_PURPLE = '#5b3df5';

// Dot colors adapted for light (cream) background
const DOT_COLORS: Record<ColorName, string> = {
  pink:   '#E91E8C',
  blue:   '#2196F3',
  orange: '#FF9800',
  green:  '#4CAF50',
  red:    '#F44336',
  yellow: '#FFC107',
};

// ---------- Puzzles (exact from spec) ----------
const PUZZLES: Puzzle[] = [
  {
    id: 1,
    grid: 5,
    pairs: [
      { color: 'pink',   a: [0, 0], b: [2, 1] },
      { color: 'blue',   a: [1, 3], b: [3, 0] },
      { color: 'orange', a: [3, 4], b: [4, 0] },
      { color: 'green',  a: [4, 2], b: [4, 4] },
    ],
  },
  {
    id: 2,
    grid: 5,
    pairs: [
      { color: 'pink',   a: [0, 1], b: [4, 1] },
      { color: 'orange', a: [1, 1], b: [3, 1] },
      { color: 'red',    a: [1, 3], b: [3, 2] },
      { color: 'blue',   a: [1, 4], b: [3, 3] },
      { color: 'green',  a: [4, 2], b: [4, 4] },
    ],
  },
  {
    id: 3,
    grid: 5,
    pairs: [
      { color: 'pink',   a: [0, 1], b: [4, 1] },
      { color: 'red',    a: [0, 2], b: [3, 2] },
      { color: 'orange', a: [1, 1], b: [3, 3] },
      { color: 'green',  a: [2, 2], b: [3, 1] },
    ],
  },
  {
    id: 4,
    grid: 5,
    pairs: [
      { color: 'orange', a: [0, 4], b: [4, 1] },
      { color: 'red',    a: [1, 1], b: [3, 2] },
      { color: 'blue',   a: [1, 2], b: [4, 4] },
      { color: 'pink',   a: [2, 2], b: [4, 2] },
    ],
  },
];

/* Solution paths — hand-verified
 *
 * Puzzle 1 (forced by neighbor analysis):
 *   pink   (0,0)→(2,1): must take long northern loop because blue takes col 0
 *   blue   (1,3)→(3,0): must descend col 0 because (3,1) is needed by orange
 *   orange (3,4)→(4,0): only route uses (3,1)(4,1)(4,0)
 *   green  (4,2)→(4,4): trivial row-4 segment
 *
 * Puzzles 2–4: shorter routes around the fixed endpoints.
 */
const PUZZLE_SOLUTIONS: Record<number, Partial<Record<ColorName, Cell[]>>> = {
  1: {
    pink:   [[0,0],[0,1],[0,2],[0,3],[0,4],[1,4],[2,4],[2,3],[2,2],[2,1]],
    blue:   [[1,3],[1,2],[1,1],[1,0],[2,0],[3,0]],
    orange: [[3,4],[3,3],[3,2],[3,1],[4,1],[4,0]],
    green:  [[4,2],[4,3],[4,4]],
  },
  2: {
    pink:   [[0,1],[0,0],[1,0],[2,0],[3,0],[4,0],[4,1]],
    orange: [[1,1],[2,1],[3,1]],
    red:    [[1,3],[2,3],[2,2],[3,2]],
    blue:   [[1,4],[2,4],[3,4],[3,3]],
    green:  [[4,2],[4,3],[4,4]],
  },
  3: {
    pink:   [[0,1],[0,0],[1,0],[2,0],[3,0],[4,0],[4,1]],
    red:    [[0,2],[0,3],[0,4],[1,4],[2,4],[3,4],[4,4],[4,3],[4,2],[3,2]],
    orange: [[1,1],[1,2],[1,3],[2,3],[3,3]],
    green:  [[2,2],[2,1],[3,1]],
  },
  4: {
    orange: [[0,4],[0,3],[0,2],[0,1],[0,0],[1,0],[2,0],[3,0],[4,0],[4,1]],
    red:    [[1,1],[2,1],[3,1],[3,2]],
    blue:   [[1,2],[1,3],[1,4],[2,4],[3,4],[4,4]],
    pink:   [[2,2],[2,3],[3,3],[4,3],[4,2]],
  },
};

// ---------- i18n ----------
const TEXT = {
  en: {
    puzzle: (i: number, n: number) => `Puzzle ${i} of ${n}`,
    score: (s: number) => `Score: ${s}`,
    hint: (left: number) => `Hint (${left} left)`,
    noHint: 'No hints',
    complete: 'Complete',
    puzzlesSolved: 'Puzzles solved',
    helpsUsed: 'Hints used',
  },
  ar: {
    puzzle: (i: number, n: number) => `اللغز ${i} من ${n}`,
    score: (s: number) => `النتيجة: ${s}`,
    hint: (left: number) => `تلميح (يتبقّى ${left})`,
    noHint: 'لا تلميحات متاحة',
    complete: 'اكتمل',
    puzzlesSolved: 'الألغاز المحلولة',
    helpsUsed: 'التلميحات المستخدَمة',
  },
} as const;

// ---------- Helpers ----------
const isAdj = (a: Cell, b: Cell) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;

function findEndpoint(puzzle: Puzzle, r: number, c: number): Pair | null {
  return (
    puzzle.pairs.find(
      (p) => (p.a[0] === r && p.a[1] === c) || (p.b[0] === r && p.b[1] === c),
    ) ?? null
  );
}

type DrawnPaths = Partial<Record<ColorName, Cell[]>>;

function isPairConnected(pair: Pair, path: Cell[] | undefined): boolean {
  if (!path || path.length < 2) return false;
  const first = path[0]!;
  const last = path[path.length - 1]!;
  return (
    (first[0] === pair.a[0] && first[1] === pair.a[1] && last[0] === pair.b[0] && last[1] === pair.b[1]) ||
    (first[0] === pair.b[0] && first[1] === pair.b[1] && last[0] === pair.a[0] && last[1] === pair.a[1])
  );
}

function isPuzzleSolved(puzzle: Puzzle, paths: DrawnPaths): boolean {
  return puzzle.pairs.every((pair) => isPairConnected(pair, paths[pair.color]));
}

function getUnsolvedColor(puzzle: Puzzle, paths: DrawnPaths): ColorName | null {
  for (const pair of puzzle.pairs) {
    if (!isPairConnected(pair, paths[pair.color])) return pair.color;
  }
  return null;
}

// Per-puzzle scoring. Speed-based raw, then spec's help multiplier:
//   0 hints → ×1.00
//   1 hint  → ×0.75
//   2 hints → ×0.50
// Timeout = 0 (handled by advancePuzzle(0), bypasses this function).
function scoreForPuzzle(helps: number, secondsRemaining: number): number {
  // Raw 60–100 based on how much of the 30s timer was left when solved.
  const raw = 60 + Math.round((secondsRemaining / PER_PUZZLE_SECONDS) * 40);
  const mult = helps <= 0 ? 1.0 : helps === 1 ? 0.75 : 0.5;
  return Math.min(100, Math.max(0, Math.round(raw * mult)));
}

// ---------- Component ----------
export default function DotConnectGameV2({ language, onComplete }: GameProps) {
  const t = TEXT[language];
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [paths, setPaths] = useState<DrawnPaths>({});
  const [activeColor, setActiveColor] = useState<ColorName | null>(null);
  const [helpsUsed, setHelpsUsed] = useState(0);
  const [puzzleScores, setPuzzleScores] = useState<number[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(PER_PUZZLE_SECONDS);
  const [isAnimating, setIsAnimating] = useState(false);
  const [cellSize, setCellSize] = useState<number>(CELL_SIZE_DEFAULT);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const startedAt = useRef<number>(Date.now());
  const finished = useRef(false);
  const advanceLock = useRef(false);
  // Declared here (before the countdown effect that reads it) so the
  // race-prevention guard always sees a defined ref.
  const solvedRef = useRef(false);

  const puzzle = PUZZLES[puzzleIdx]!;
  const solutionForPuzzle = PUZZLE_SOLUTIONS[puzzle.id] ?? {};

  // Measure available width — cell size shrinks on mobile to fit 390px.
  // 24px = 12px padding on each side of the grid wrapper.
  useEffect(() => {
    function measure() {
      const el = wrapperRef.current;
      if (!el) return;
      const available = el.offsetWidth - 24;
      const size = Math.max(48, Math.min(CELL_SIZE_DEFAULT, Math.floor(available / puzzle.grid)));
      setCellSize(size);
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [puzzle.grid]);

  const gridPixel = puzzle.grid * cellSize;
  const averageScore = useMemo(
    () =>
      puzzleScores.length === 0
        ? 0
        : Math.round(puzzleScores.reduce((a, b) => a + b, 0) / puzzleScores.length),
    [puzzleScores],
  );

  // Per-puzzle countdown
  useEffect(() => {
    if (isAnimating) return;
    // Don't timeout a puzzle that was already solved — the win-detection
    // effect handles the score. Without this guard, a race between the
    // countdown hitting 0 and the win effect could replace a real score
    // with 0.
    if (solvedRef.current) return;
    if (secondsLeft <= 0) {
      advancePuzzle(0);
      return;
    }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, isAnimating]);

  // Reset per-puzzle state when puzzle changes
  useEffect(() => {
    setPaths({});
    setActiveColor(null);
    setHelpsUsed(0);
    setSecondsLeft(PER_PUZZLE_SECONDS);
    advanceLock.current = false;
    solvedRef.current = false;
  }, [puzzleIdx]);

  // Win detection — runs as a proper effect whenever paths change, instead of
  // inside a setPaths updater (which was unreliable in strict mode and could
  // miss the solved state or double-fire timeouts). solvedRef is declared
  // above so the countdown effect can read it.
  useEffect(() => {
    if (isAnimating || solvedRef.current) return;
    if (!isPuzzleSolved(puzzle, paths)) return;
    solvedRef.current = true;
    const score = scoreForPuzzle(helpsUsed, secondsLeft);
    const timer = setTimeout(() => advancePuzzle(score), 320);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paths, isAnimating]);

  function advancePuzzle(score: number) {
    if (advanceLock.current) return;
    advanceLock.current = true;
    const nextScores = [...puzzleScores, score];
    setPuzzleScores(nextScores);
    if (puzzleIdx + 1 >= PUZZLES.length) {
      // Skip the done-screen render — the gauntlet handles the post-game
      // transition. Just call onComplete and let the parent unmount us.
      if (!finished.current) {
        finished.current = true;
        const finalScore = Math.round(nextScores.reduce((a, b) => a + b, 0) / nextScores.length);
        const solved = nextScores.filter((s) => s > 0).length;
        onComplete({
          gameType: 'dotconnect',
          score: Math.min(100, Math.max(0, finalScore)),
          durationMs: Date.now() - startedAt.current,
          correct: solved,
          total: PUZZLES.length,
          stats: {
            puzzlesSolved: solved,
            totalPuzzles: PUZZLES.length,
            hintsUsed: helpsUsed,
          },
        });
      }
    } else {
      setTimeout(() => setPuzzleIdx((i) => i + 1), 350);
    }
  }

  // ---------- Pointer ----------
  function pointerToCell(e: React.PointerEvent): Cell | null {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    if (row < 0 || row >= puzzle.grid || col < 0 || col >= puzzle.grid) return null;
    return [row, col] as Cell;
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (isAnimating) return;
    const cell = pointerToCell(e);
    if (!cell) return;
    const ep = findEndpoint(puzzle, cell[0], cell[1]);
    if (!ep) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setActiveColor(ep.color);
    setPaths((p) => ({ ...p, [ep.color]: [cell] }));
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (isAnimating || !activeColor) return;
    const cell = pointerToCell(e);
    if (!cell) return;
    setPaths((prev) => {
      const current = prev[activeColor] ?? [];
      const last = current[current.length - 1];
      if (!last) return prev;
      if (last[0] === cell[0] && last[1] === cell[1]) return prev;
      if (!isAdj(last, cell)) return prev;

      // Backtrack
      const prev2 = current[current.length - 2];
      if (prev2 && prev2[0] === cell[0] && prev2[1] === cell[1]) {
        return { ...prev, [activeColor]: current.slice(0, -1) };
      }

      // Cannot land on a cell owned by another color
      for (const [color, cells] of Object.entries(prev) as [ColorName, Cell[]][]) {
        if (color === activeColor) continue;
        for (const occ of cells) {
          if (occ[0] === cell[0] && occ[1] === cell[1]) return prev;
        }
      }

      // Cannot pass through another color's endpoint
      const ep = findEndpoint(puzzle, cell[0], cell[1]);
      if (ep && ep.color !== activeColor) return prev;

      return { ...prev, [activeColor]: [...current, cell] };
    });
  }

  function handlePointerUp() {
    if (isAnimating) return;
    setActiveColor(null);
    // Win detection is now handled by the useEffect on `paths` —
    // no need to check inside a setPaths updater.
  }

  // ---------- Help ----------
  async function handleHelp() {
    if (isAnimating) return;
    if (helpsUsed >= MAX_HELPS_PER_PUZZLE) return;
    const targetColor = getUnsolvedColor(puzzle, paths);
    if (!targetColor) return;
    const solution = solutionForPuzzle[targetColor];
    if (!solution || solution.length === 0) return;

    setIsAnimating(true);
    setHelpsUsed((h) => h + 1);

    // Clear any in-progress paths that collide with the solution so the
    // animation has a clean slate to draw into.
    setPaths((p) => {
      const next: DrawnPaths = { ...p };
      delete next[targetColor];
      const occupied = new Set(solution.map(([r, c]) => `${r},${c}`));
      for (const color of Object.keys(next) as ColorName[]) {
        const path = next[color];
        if (!path) continue;
        if (path.some(([r, c]) => occupied.has(`${r},${c}`))) {
          delete next[color];
        }
      }
      return next;
    });

    for (let i = 1; i <= solution.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise<void>((r) => setTimeout(r, HELP_STEP_MS));
      const slice = solution.slice(0, i);
      setPaths((p) => ({ ...p, [targetColor]: slice }));
    }
    setIsAnimating(false);
    // Win detection is handled by the useEffect on `paths` — it fires
    // automatically after the help animation finishes and isAnimating clears.
  }

  // The done screen was removed — the gauntlet handles post-game transitions.
  // onComplete fires directly from advancePuzzle when the last puzzle is solved.

  // ---------- Render: playing ----------
  const timeProgress = (secondsLeft / PER_PUZZLE_SECONDS) * 100;
  const helpsLeft = MAX_HELPS_PER_PUZZLE - helpsUsed;
  const helpDisabled = helpsUsed >= MAX_HELPS_PER_PUZZLE || isAnimating;

  return (
    <div ref={wrapperRef} dir={language === 'ar' ? 'rtl' : 'ltr'} style={{ background: 'transparent', padding: '4px 0', maxWidth: 860, margin: '0 auto', width: '100%' }}>
    <div
      style={{
        background: 'transparent',
        border: 'none',
        borderRadius: 16,
        padding: 0,
        userSelect: 'none',
      }}
    >
      {/* Header row — plain, no pills */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
          gap: 12,
          flexDirection: 'row',
        }}
      >
        <span style={{ fontSize: 15, color: 'var(--color-ash)' }}>
          {t.puzzle(puzzleIdx + 1, PUZZLES.length)}
        </span>
        <span style={{ fontSize: 15, fontWeight: 500, color: SPARK_PURPLE, fontFeatureSettings: '"tnum"' }}>
          {t.score(averageScore)}
        </span>
        <button
          type="button"
          onClick={handleHelp}
          disabled={helpDisabled}
          style={{
            border: '1px solid var(--color-cream-3)',
            background: 'var(--color-cream)',
            color: 'var(--color-ink)',
            borderRadius: 20,
            padding: '8px 14px',
            fontSize: 12,
            fontWeight: 500,
            cursor: helpDisabled ? 'not-allowed' : 'pointer',
            opacity: helpsUsed >= MAX_HELPS_PER_PUZZLE ? 0.35 : 1,
            transition: 'opacity 0.2s',
            minHeight: 44,
            whiteSpace: 'nowrap',
          }}
        >
          {helpsUsed >= MAX_HELPS_PER_PUZZLE ? t.noHint : t.hint(helpsLeft)}
        </button>
      </div>

      {/* Progress bar — purple, not pink */}
      <div
        style={{
          height: 4,
          background: 'var(--color-cream-2)',
          borderRadius: 2,
          marginBottom: 12,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${timeProgress}%`,
            background: SPARK_PURPLE,
            borderRadius: 2,
            transition: 'width 0.95s linear',
          }}
        />
      </div>

      {/* Grid area */}
      <div
        style={{
          background: 'var(--color-cream-2)',
          borderRadius: 12,
          padding: 12,
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: gridPixel,
            height: gridPixel,
            touchAction: 'none',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => setActiveColor(null)}
        >
          {/* Background dots + endpoints */}
          {Array.from({ length: puzzle.grid * puzzle.grid }).map((_, i) => {
            const r = Math.floor(i / puzzle.grid);
            const c = i % puzzle.grid;
            const ep = findEndpoint(puzzle, r, c);
            const cx = c * cellSize + cellSize / 2;
            const cy = r * cellSize + cellSize / 2;
            if (ep) {
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: cx - ENDPOINT_R,
                    top: cy - ENDPOINT_R,
                    width: ENDPOINT_R * 2,
                    height: ENDPOINT_R * 2,
                    borderRadius: '50%',
                    background: DOT_COLORS[ep.color],
                    pointerEvents: 'none',
                  }}
                />
              );
            }
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: cx - EMPTY_DOT_R,
                  top: cy - EMPTY_DOT_R,
                  width: EMPTY_DOT_R * 2,
                  height: EMPTY_DOT_R * 2,
                  borderRadius: '50%',
                  background: 'var(--color-cream-3)',
                  pointerEvents: 'none',
                }}
              />
            );
          })}

          {/* SVG path overlay */}
          <svg
            width={gridPixel}
            height={gridPixel}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          >
            {(Object.entries(paths) as [ColorName, Cell[]][]).map(([color, cells]) => {
              if (!cells || cells.length < 2) return null;
              const points = cells
                .map(([r, c]) => {
                  const x = c * cellSize + cellSize / 2;
                  const y = r * cellSize + cellSize / 2;
                  return `${x},${y}`;
                })
                .join(' ');
              return (
                <polyline
                  key={color}
                  points={points}
                  stroke={DOT_COLORS[color]}
                  strokeWidth={STROKE_WIDTH}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity={1}
                />
              );
            })}
          </svg>
        </div>
      </div>
    </div>
    </div>
  );
}
