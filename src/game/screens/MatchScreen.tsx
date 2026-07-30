import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { asset, iconColor, iconFile } from '../../lib/assets';
import { scoreMatch } from '../../lib/scoring';
import { sfx } from '../../lib/sound';
import { TIME_PER_QUESTION_MS, type GameSettings, type Question, type QuestionResult } from '../../lib/types';

const TICK_MS = 100;
type Pt = { x: number; y: number };

// Match question (ref 3a "match the line"). Left: answer bubbles. Right: A+
// type icons. Player draws a line from each bubble to the icon it belongs to
// (drag, or tap-bubble then tap-icon). Some answers are irrelevant decoys and
// should be left unconnected. Columns are pre-shuffled in drawGame().
export function MatchScreen({
  question,
  index,
  total,
  playerName,
  settings,
  onAnswered,
}: {
  question: Question;
  index: number;
  total: number;
  playerName: string;
  settings: GameSettings;
  onAnswered: (r: QuestionResult) => void;
}) {
  const answers = question.answers ?? [];
  const types = question.types ?? [];

  const [pairs, setPairs] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null); // tap-selected bubble
  const [drag, setDrag] = useState<{ answerId: string; from: Pt; to: Pt; hoverType: string | null } | null>(null);
  const [remaining, setRemaining] = useState(TIME_PER_QUESTION_MS);

  const startRef = useRef(Date.now());
  const doneRef = useRef(false);
  const pairsRef = useRef<Record<string, string>>({});
  pairsRef.current = pairs;

  const areaRef = useRef<HTMLDivElement>(null);
  const bubbleEls = useRef(new Map<string, HTMLElement>());
  const iconEls = useRef(new Map<string, HTMLElement>());
  const [, forceTick] = useState(0);

  // Anchors are layout-based (design px), so recompute once refs exist.
  useLayoutEffect(() => forceTick((x) => x + 1), []);

  function bubbleAnchor(id: string): Pt | null {
    const el = bubbleEls.current.get(id);
    if (!el) return null;
    return { x: el.offsetLeft + el.offsetWidth, y: el.offsetTop + el.offsetHeight / 2 };
  }
  function iconAnchor(id: string): Pt | null {
    const el = iconEls.current.get(id);
    if (!el) return null;
    return { x: el.offsetLeft, y: el.offsetTop + el.offsetHeight / 2 };
  }
  function toLocal(clientX: number, clientY: number): Pt {
    const c = areaRef.current!;
    const r = c.getBoundingClientRect();
    const s = c.offsetWidth / r.width;
    return { x: (clientX - r.left) * s, y: (clientY - r.top) * s };
  }

  function connect(answerId: string, typeId: string) {
    sfx.select();
    // One-to-one: an icon holds only one answer. Linking here bumps off any
    // other answer already connected to this icon.
    setPairs((p) => {
      const next: Record<string, string> = {};
      for (const [aId, tId] of Object.entries(p)) {
        if (tId !== typeId) next[aId] = tId;
      }
      next[answerId] = typeId;
      return next;
    });
    setSelected(null);
  }
  function clearPair(answerId: string) {
    setPairs((p) => {
      const n = { ...p };
      delete n[answerId];
      return n;
    });
  }

  function submit(finalPairs: Record<string, string>) {
    if (doneRef.current) return;
    doneRef.current = true;
    const timeTaken = Date.now() - startRef.current;
    const result = scoreMatch(question, finalPairs, timeTaken, settings);
    if (result.correct) sfx.correct();
    else sfx.wrong();
    onAnswered(result);
  }

  // Countdown + low-time ticks + auto-submit current pairs on expiry.
  useEffect(() => {
    startRef.current = Date.now();
    doneRef.current = false;
    let lastSec = Infinity;
    const iv = setInterval(() => {
      const rem = Math.max(0, TIME_PER_QUESTION_MS - (Date.now() - startRef.current));
      setRemaining(rem);
      const sec = Math.ceil(rem / 1000);
      if (sec <= 5 && sec > 0 && sec !== lastSec) {
        lastSec = sec;
        sfx.tick();
      }
      if (rem <= 0) {
        clearInterval(iv);
        if (!doneRef.current) {
          sfx.timeup();
          submit(pairsRef.current);
        }
      }
    }, TICK_MS);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  // ---- drag handling ----
  const movedRef = useRef(false);
  function onBubblePointerDown(e: React.PointerEvent, answerId: string) {
    if (doneRef.current) return;
    e.preventDefault();
    movedRef.current = false;
    const from = bubbleAnchor(answerId);
    if (!from) return;
    setDrag({ answerId, from, to: from, hoverType: null });
  }
  function iconAt(p: Pt): string | null {
    for (const ty of types) {
      const el = iconEls.current.get(ty.id);
      if (!el) continue;
      const x0 = el.offsetLeft - 20;
      const y0 = el.offsetTop - 20;
      if (p.x >= x0 && p.x <= x0 + el.offsetWidth + 40 && p.y >= y0 && p.y <= y0 + el.offsetHeight + 40) {
        return ty.id;
      }
    }
    return null;
  }
  function onAreaPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    movedRef.current = true;
    const to = toLocal(e.clientX, e.clientY);
    setDrag({ ...drag, to, hoverType: iconAt(to) });
  }
  function onAreaPointerUp(e: React.PointerEvent) {
    if (!drag) return;
    const p = toLocal(e.clientX, e.clientY);
    const hit = iconAt(p);
    if (movedRef.current) {
      if (hit) connect(drag.answerId, hit);
      else clearPair(drag.answerId); // dragged to empty space = clear
    } else {
      // treated as a tap on the bubble → toggle selection / clear
      if (pairs[drag.answerId]) clearPair(drag.answerId);
      else setSelected((s) => (s === drag.answerId ? null : drag.answerId));
    }
    setDrag(null);
  }
  function onIconClick(typeId: string) {
    if (doneRef.current) return;
    if (selected) connect(selected, typeId);
  }

  const secLeft = Math.ceil(remaining / 1000);
  const connectedCount = Object.keys(pairs).length;

  return (
    <div className="screen match">
      <img src={asset('bg3.png')} className="bg" alt="" aria-hidden />

      <header className="c-head">
        <img src={asset('logo.png')} className="c-logo" alt="Meta" />
        <div className="c-chip">👤 {playerName}</div>
      </header>

      <div className="match__prompt">
        {question.prompt ?? 'Match each problem to the strategy it solves'}
        <span className="match__timer">
          {' '}· ⏱ {secLeft}s
        </span>
      </div>
      <div className="match__sub">
        Question {index + 1} of {total}
      </div>

      <div
        className="match__area"
        ref={areaRef}
        onPointerMove={onAreaPointerMove}
        onPointerUp={onAreaPointerUp}
        onPointerLeave={onAreaPointerUp}
      >
        <svg className="match__svg" width="100%" height="100%" preserveAspectRatio="none">
          {Object.entries(pairs).map(([aId, tId]) => {
            const from = bubbleAnchor(aId);
            const to = iconAnchor(tId);
            const ty = types.find((t) => t.id === tId);
            if (!from || !to) return null;
            return (
              <line
                key={aId}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={iconColor(ty?.icon ?? '')}
                strokeWidth={8}
                strokeLinecap="round"
              />
            );
          })}
          {drag && (
            <line
              x1={drag.from.x}
              y1={drag.from.y}
              x2={drag.to.x}
              y2={drag.to.y}
              stroke={
                drag.hoverType
                  ? iconColor(types.find((t) => t.id === drag.hoverType)?.icon ?? '')
                  : '#C7CDD6'
              }
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={drag.hoverType ? undefined : '4 14'}
            />
          )}
        </svg>

        <div className="match__col match__col--bubbles">
          {answers.map((a) => {
            const connected = !!pairs[a.id];
            const isSel = selected === a.id;
            const ty = connected ? types.find((t) => t.id === pairs[a.id]) : null;
            return (
              <button
                key={a.id}
                ref={(el) => {
                  if (el) bubbleEls.current.set(a.id, el);
                }}
                className={'bubble' + (isSel ? ' bubble--sel' : '') + (connected ? ' bubble--on' : '')}
                style={connected && ty ? { boxShadow: `0 0 0 5px ${iconColor(ty.icon)}` } : undefined}
                onPointerDown={(e) => onBubblePointerDown(e, a.id)}
              >
                <span className="bubble__text">{a.text}</span>
              </button>
            );
          })}
        </div>

        <div className="match__col match__col--icons">
          {types.map((ty) => (
            <div className="icon-cell" key={ty.id}>
              <button
                ref={(el) => {
                  if (el) iconEls.current.set(ty.id, el);
                }}
                className={'icon-btn' + (selected ? ' icon-btn--armed' : '')}
                onClick={() => onIconClick(ty.id)}
                title={ty.label}
              >
                <img src={iconFile(ty.icon)} alt={ty.label} />
              </button>
              <span className="icon-label" style={{ color: iconColor(ty.icon) }}>
                {ty.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="match__foot">
        <span className="match__hint">
          {selected ? 'Now tap the matching icon' : 'Drag a bubble to its icon — or tap one, then an icon'}
          {' · '}
          {connectedCount}/{answers.length} linked
        </span>
        <button className="match__submit" onClick={() => submit(pairs)}>
          <img src={asset('next.png')} alt="Submit" />
        </button>
      </div>
    </div>
  );
}
