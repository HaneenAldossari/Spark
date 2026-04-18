import { useEffect, useRef, useState } from 'react';
import type { GameProps } from './games.types';
import { ACCENT } from './games.types';

interface Endpoint { row: number; col: number; color: string }
interface Puzzle { label: string; endpoints: Endpoint[] }

const PUZZLES: Puzzle[] = [
  {
    label: 'Puzzle 1',
    endpoints: [
      { row: 0, col: 0, color: '#534AB7' }, { row: 4, col: 4, color: '#534AB7' },
      { row: 0, col: 4, color: '#1D9E75' }, { row: 4, col: 0, color: '#1D9E75' },
      { row: 0, col: 2, color: '#D85A30' }, { row: 4, col: 2, color: '#D85A30' },
      { row: 2, col: 0, color: '#BA7517' }, { row: 2, col: 4, color: '#BA7517' },
    ],
  },
  {
    label: 'Puzzle 2',
    endpoints: [
      { row: 0, col: 0, color: '#534AB7' }, { row: 2, col: 4, color: '#534AB7' },
      { row: 0, col: 4, color: '#1D9E75' }, { row: 4, col: 4, color: '#1D9E75' },
      { row: 4, col: 0, color: '#D85A30' }, { row: 2, col: 2, color: '#D85A30' },
      { row: 1, col: 1, color: '#BA7517' }, { row: 3, col: 3, color: '#BA7517' },
    ],
  },
  {
    label: 'Puzzle 3',
    endpoints: [
      { row: 0, col: 1, color: '#534AB7' }, { row: 4, col: 3, color: '#534AB7' },
      { row: 0, col: 3, color: '#1D9E75' }, { row: 4, col: 1, color: '#1D9E75' },
      { row: 1, col: 0, color: '#D85A30' }, { row: 3, col: 4, color: '#D85A30' },
      { row: 1, col: 4, color: '#BA7517' }, { row: 3, col: 0, color: '#BA7517' },
    ],
  },
];

const GRID_SIZE = 5;

const STR = {
  en: { puzzle: 'Puzzle', moves: 'Moves', reset: 'Reset', solved: 'Solved in', solvedSuffix: 'moves', next: 'Next puzzle →' },
  ar: { puzzle: 'لغز', moves: 'حركات', reset: 'إعادة', solved: 'حُلّ في', solvedSuffix: 'حركة', next: 'اللغز التالي ←' },
};

const cellKey = (r: number, c: number) => `${r},${c}`;
const isAdjacent = (a: [number, number], b: [number, number]) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;

export default function DotConnectGame({ language, onComplete }: GameProps) {
  const t = STR[language];
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [paths, setPaths] = useState<Map<string, string>>(new Map());
  const [moveCount, setMoveCount] = useState(0);
  const [solved, setSolved] = useState(false);
  const drawing = useRef<{ color: string; cells: [number, number][] } | null>(null);
  const startedAt = useRef<number>(Date.now());
  const totalMoves = useRef(0);
  const totalScore = useRef(0);
  const finished = useRef(false);

  const puzzle = PUZZLES[puzzleIndex]!;
  const endpointMap = new Map<string, Endpoint>();
  puzzle.endpoints.forEach((e) => endpointMap.set(cellKey(e.row, e.col), e));

  function clearColor(color: string) {
    setPaths((prev) => {
      const next = new Map(prev);
      next.forEach((c, k) => { if (c === color) next.delete(k); });
      return next;
    });
  }

  function setCell(r: number, c: number, color: string) {
    setPaths((prev) => {
      const next = new Map(prev);
      next.set(cellKey(r, c), color);
      return next;
    });
  }

  function deleteCell(r: number, c: number) {
    setPaths((prev) => {
      const next = new Map(prev);
      next.delete(cellKey(r, c));
      return next;
    });
  }

  function startDraw(r: number, c: number) {
    const ep = endpointMap.get(cellKey(r, c));
    if (!ep) return;
    clearColor(ep.color);
    drawing.current = { color: ep.color, cells: [[r, c]] };
    setCell(r, c, ep.color);
  }

  function moveDraw(r: number, c: number) {
    const d = drawing.current;
    if (!d) return;
    const last = d.cells[d.cells.length - 1]!;
    if (last[0] === r && last[1] === c) return;
    if (!isAdjacent(last, [r, c])) return;

    const prev = d.cells[d.cells.length - 2];
    if (prev && prev[0] === r && prev[1] === c) {
      // backtrack
      const removed = d.cells.pop()!;
      deleteCell(removed[0], removed[1]);
      return;
    }

    const existingColor = paths.get(cellKey(r, c));
    if (existingColor && existingColor !== d.color) return;
    const ep = endpointMap.get(cellKey(r, c));
    if (ep && ep.color !== d.color) return;

    d.cells.push([r, c]);
    setCell(r, c, d.color);
  }

  function endDraw(r: number, c: number) {
    const d = drawing.current;
    if (!d) { drawing.current = null; return; }
    const ep = endpointMap.get(cellKey(r, c));
    const startCell = d.cells[0]!;
    if (ep && ep.color === d.color && !(ep.row === startCell[0] && ep.col === startCell[1])) {
      setMoveCount((m) => m + 1);
      totalMoves.current += 1;
    }
    drawing.current = null;
  }

  // Check solved on every paths change
  useEffect(() => {
    if (solved) return;
    const allFilled = paths.size === GRID_SIZE * GRID_SIZE;
    const colors = [...new Set(puzzle.endpoints.map((e) => e.color))];
    const allConnected = colors.every((color) => {
      const eps = puzzle.endpoints.filter((e) => e.color === color);
      return eps.every((ep) => paths.get(cellKey(ep.row, ep.col)) === color);
    });
    if (allFilled && allConnected) {
      setSolved(true);
      const minimumMoves = 4;
      const penalty = Math.max(0, moveCount - minimumMoves) * 3;
      totalScore.current += Math.max(40, 100 - penalty);
    }
  }, [paths, solved, puzzle.endpoints, moveCount]);

  function nextOrFinish() {
    if (puzzleIndex < PUZZLES.length - 1) {
      setPuzzleIndex((i) => i + 1);
      setPaths(new Map());
      setMoveCount(0);
      setSolved(false);
    } else {
      if (finished.current) return;
      finished.current = true;
      const avg = Math.round(totalScore.current / PUZZLES.length);
      onComplete({
        gameType: 'dotconnect',
        score: Math.min(100, Math.max(0, avg)),
        durationMs: Date.now() - startedAt.current,
        correct: PUZZLES.length,
        total: PUZZLES.length,
      });
    }
  }

  function reset() {
    setPaths(new Map());
    setMoveCount(0);
    setSolved(false);
  }

  // Pointer event helpers — derive row/col from data attributes on the cell
  function cellFromEvent(e: React.PointerEvent): [number, number] | null {
    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    if (!target) return null;
    const cell = target.closest<HTMLElement>('[data-cell]');
    if (!cell || !cell.dataset.cell) return null;
    const [r, c] = cell.dataset.cell.split(',').map(Number);
    return [r!, c!];
  }

  return (
    <div className="w-full max-w-[420px] mx-auto select-none">
      <div className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.18em] text-ink/55 mb-4">
        <span>{t.puzzle} {puzzleIndex + 1} / {PUZZLES.length}</span>
        <span>{t.moves}: {moveCount}</span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 56px)',
          gap: 3,
          touchAction: 'none',
          userSelect: 'none',
          justifyContent: 'center',
          margin: '0 auto',
          width: 'fit-content',
        }}
        onPointerDown={(e) => {
          const cell = cellFromEvent(e);
          if (!cell) return;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          startDraw(cell[0], cell[1]);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const cell = cellFromEvent(e);
          if (!cell) return;
          moveDraw(cell[0], cell[1]);
        }}
        onPointerUp={(e) => {
          const cell = cellFromEvent(e);
          if (cell) endDraw(cell[0], cell[1]);
          else drawing.current = null;
        }}
        onPointerCancel={() => { drawing.current = null; }}
      >
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
          const r = Math.floor(idx / GRID_SIZE);
          const c = idx % GRID_SIZE;
          const key = cellKey(r, c);
          const fill = paths.get(key);
          const ep = endpointMap.get(key);
          const cellStyle: React.CSSProperties = {
            width: 56,
            height: 56,
            borderRadius: 8,
            background: fill ?? 'var(--color-cream-2)',
            border: fill ? 'none' : '1px solid rgba(14,14,16,0.1)',
            opacity: fill ? 0.9 : 1,
            display: 'grid',
            placeItems: 'center',
          };
          return (
            <div key={key} data-cell={`${r},${c}`} style={cellStyle}>
              {ep && (
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: ep.color,
                    border: '2.5px solid rgba(255,255,255,0.65)',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-3 mt-5">
        {!solved && (
          <button
            onClick={reset}
            style={{
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 8,
              background: 'transparent',
              color: 'var(--color-ink)',
              border: '1px solid rgba(14,14,16,0.25)',
              cursor: 'pointer',
            }}
          >
            {t.reset}
          </button>
        )}
        {solved && (
          <div className="flex flex-col items-center gap-3">
            <div
              style={{
                background: '#E1F5EE',
                color: '#085041',
                padding: '8px 14px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {t.solved} {moveCount} {t.solvedSuffix}
            </div>
            <button
              onClick={nextOrFinish}
              style={{
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 999,
                background: ACCENT.primary,
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {puzzleIndex < PUZZLES.length - 1 ? t.next : '✓'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
