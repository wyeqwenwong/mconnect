import { useCallback, useEffect, useRef, useState } from 'react';
import { KioskStage } from './KioskStage';
import { Splash } from './components/Splash';
import { preloadCritical, preloadRest } from '../lib/preload';
import { EntryScreen } from './screens/EntryScreen';
import { QuestionScreen } from './screens/QuestionScreen';
import { MatchScreen } from './screens/MatchScreen';
import { FeedbackScreen } from './screens/FeedbackScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { drawGame, store } from '../lib/store';
import { isPerfectSpeedrun, totalScore } from '../lib/scoring';
import { setSoundEnabled, playTheme, unlockAudio, sfx } from '../lib/sound';
import type { GameSettings, Question, QuestionResult } from '../lib/types';

type Phase = 'entry' | 'question' | 'feedback' | 'leaderboard';

const IDLE_TIMEOUT_MS = 45_000; // README §5.5: idle timeout returns to entry

export function App() {
  const [phase, setPhase] = useState<Phase>('entry');
  const [player, setPlayer] = useState('');
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [lastResult, setLastResult] = useState<QuestionResult | null>(null);
  const [finalTotal, setFinalTotal] = useState(0);
  const [ready, setReady] = useState(false);
  const [audioReady, setAudioReady] = useState(false);

  // Warm the audio engine on mount: create the AudioContext + instantiate the
  // track elements so they buffer and can start instantly.
  useEffect(() => {
    unlockAudio();
  }, []);

  // Each screen gets its own looping music theme (home / game / result). We try
  // to start it immediately — in the Electron kiosk autoplay is allowed, so the
  // attract music plays on launch with no interaction. On the web, browsers
  // block autoplay until a gesture; the blocked play() is retried when the
  // first tap flips audioReady, so it starts on first touch there.
  useEffect(() => {
    const t = phase === 'entry' ? 'home' : phase === 'leaderboard' ? 'result' : 'game';
    playTheme(t);
  }, [phase, audioReady]);

  // Preload art so screen transitions are smooth; show a splash until the
  // entry-critical assets are decoded, then warm the rest in the background.
  useEffect(() => {
    let alive = true;
    preloadCritical().then(() => {
      if (alive) setReady(true);
      preloadRest();
    });
    return () => {
      alive = false;
    };
  }, []);

  // Panel heartbeat so the admin console can show "K panels online".
  useEffect(() => {
    store.heartbeat();
    const t = setInterval(() => store.heartbeat(), 5_000);
    return () => clearInterval(t);
  }, []);

  // Idle timeout — return to entry if a game is abandoned mid-play.
  const idleRef = useRef<number | undefined>(undefined);
  const resetIdle = useCallback(() => {
    window.clearTimeout(idleRef.current);
    if (phase !== 'entry') {
      idleRef.current = window.setTimeout(() => backToEntry(), IDLE_TIMEOUT_MS);
    }
  }, [phase]);
  useEffect(() => {
    resetIdle();
    return () => window.clearTimeout(idleRef.current);
  }, [phase, resetIdle]);

  function backToEntry() {
    setPhase('entry');
    setPlayer('');
    setIndex(0);
    setResults([]);
    setLastResult(null);
  }

  async function startGame(name: string) {
    // Pull latest settings + pool at game start (admin changes propagate here).
    const game = await drawGame();
    setSoundEnabled(game.settings.sound);
    sfx.start();
    setPlayer(name);
    setSettings(game.settings);
    setQuestions(game.questions);
    setIndex(0);
    setResults([]);
    setPhase('question');
  }

  function handleAnswered(result: QuestionResult) {
    const nextResults = [...results, result];
    setResults(nextResults);
    setLastResult(result);
    if (settings?.perQuestionScoreDisplay) {
      setPhase('feedback');
    } else {
      advance(nextResults);
    }
  }

  function advance(currentResults: QuestionResult[]) {
    if (!settings) return;
    if (index + 1 < questions.length) {
      setIndex((i) => i + 1);
      setPhase('question');
    } else {
      finish(currentResults);
    }
  }

  async function finish(currentResults: QuestionResult[]) {
    if (!settings) return;
    const total = totalScore(currentResults, settings);
    // Still recorded on each result (used in the admin export), just no longer
    // shown as a badge on the results screen.
    const perfect = settings.speedBonus && isPerfectSpeedrun(currentResults);
    setFinalTotal(total);
    await store.submitScore({
      name: player,
      total,
      perfectSpeedrun: perfect,
      panelId: 'kiosk',
      breakdown: currentResults,
    });
    setPhase('leaderboard');
  }

  const runningTotal = results.reduce((s, r) => s + r.pointsEarned, 0);

  const onInteract = () => {
    resetIdle();
    if (!audioReady) {
      unlockAudio();
      setAudioReady(true);
    }
  };

  return (
    <div onPointerDown={onInteract}>
      <KioskStage>
        {!ready && <Splash />}
        {ready && phase === 'entry' && <EntryScreen onStart={startGame} />}

        {phase === 'question' && settings && questions[index] && (
          questions[index].kind === 'match' ? (
            <MatchScreen
              key={questions[index].id + index}
              question={questions[index]}
              index={index}
              total={questions.length}
              playerName={player}
              settings={settings}
              onAnswered={handleAnswered}
            />
          ) : (
            <QuestionScreen
              key={questions[index].id + index}
              question={questions[index]}
              index={index}
              total={questions.length}
              playerName={player}
              settings={settings}
              onAnswered={handleAnswered}
            />
          )
        )}

        {phase === 'feedback' && settings && lastResult && questions[index] && (
          <FeedbackScreen
            question={questions[index]}
            result={lastResult}
            runningTotal={runningTotal}
            showPoints={settings.perQuestionScoreDisplay}
            playerName={player}
            onDone={() => advance(results)}
          />
        )}

        {phase === 'leaderboard' && (
          <LeaderboardScreen
            playerName={player}
            finalTotal={finalTotal}
            onPlayAgain={backToEntry}
          />
        )}
      </KioskStage>
    </div>
  );
}
