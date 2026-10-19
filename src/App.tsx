/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  RotateCcw,
  Shuffle,
  Volume2,
  VolumeX,
  CheckCircle2,
  XCircle,
  Timer,
  Zap,
  Target,
  Keyboard,
  Trash2,
  ArrowUpRight,
} from 'lucide-react';
import {
  Difficulty,
  DIFFICULTY_META,
  PASSAGES,
  Passage,
  getRandomPassage,
} from './data/passages';
import { soundEngine } from './utils/sound';
import { TimelinePoint } from './components/VelocityChart';
import { ResultsView, TestResult } from './components/ResultsView';

type TestStatus = 'idle' | 'running' | 'finished';

const TIMER_DURATION = 60;
const STORAGE_KEY = 'keypulse_typing_history_v1';

export default function App() {
  // Core state
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [passage, setPassage] = useState<Passage>(() => getRandomPassage('medium'));
  const [typedText, setTypedText] = useState<string>('');
  const [status, setStatus] = useState<TestStatus>('idle');
  const [timeLeft, setTimeLeft] = useState<number>(TIMER_DURATION);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [missedChars, setMissedChars] = useState<Record<string, number>>({});
  const [lastResult, setLastResult] = useState<TestResult | null>(null);
  const [historyFilter, setHistoryFilter] = useState<Difficulty | 'all'>('all');
  const [libraryFilter, setLibraryFilter] = useState<Difficulty | 'all'>('all');

  // Persisted session history
  const [history, setHistory] = useState<TestResult[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Refs for accurate timer & real-time telemetry without stale closures
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const activeCharRef = useRef<HTMLSpanElement | null>(null);
  const passageContainerRef = useRef<HTMLDivElement | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const typedTextRef = useRef<string>('');
  const missedCharsRef = useRef<Record<string, number>>({});
  const timelineRef = useRef<TimelinePoint[]>([]);

  useEffect(() => {
    typedTextRef.current = typedText;
  }, [typedText]);

  useEffect(() => {
    missedCharsRef.current = missedChars;
  }, [missedChars]);

  useEffect(() => {
    timelineRef.current = timeline;
  }, [timeline]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      // Ignore storage quota errors
    }
  }, [history]);

  // Calculate live character metrics
  const charStats = useMemo(() => {
    let correct = 0;
    let incorrect = 0;
    const target = passage.text;
    for (let i = 0; i < typedText.length; i++) {
      if (typedText[i] === target[i]) {
        correct++;
      } else {
        incorrect++;
      }
    }
    const totalTyped = typedText.length;
    const accuracy = totalTyped > 0 ? Math.round((correct / totalTyped) * 100) : 100;
    const progressPercent = Math.min(
      100,
      Math.round((totalTyped / Math.max(1, target.length)) * 100)
    );

    return {
      correct,
      incorrect,
      totalTyped,
      accuracy,
      progressPercent,
    };
  }, [typedText, passage.text]);

  // Calculate live WPM
  const liveMetrics = useMemo(() => {
    if (status === 'idle') {
      return { wpm: 0, rawWpm: 0 };
    }
    const elapsedSeconds = Math.max(1, TIMER_DURATION - timeLeft);
    const elapsedMinutes = elapsedSeconds / 60;
    const wpm = Math.round(charStats.correct / 5 / elapsedMinutes);
    const rawWpm = Math.round(charStats.totalTyped / 5 / elapsedMinutes);
    return { wpm, rawWpm };
  }, [status, timeLeft, charStats.correct, charStats.totalTyped]);

  // Finalize test and build TestResult
  const finalizeTest = useCallback(
    (completedEarly: boolean, exactElapsedSeconds?: number) => {
      const currentTyped = typedTextRef.current;
      const target = passage.text;
      let correct = 0;
      let incorrect = 0;
      for (let i = 0; i < currentTyped.length; i++) {
        if (currentTyped[i] === target[i]) {
          correct++;
        } else {
          incorrect++;
        }
      }

      const totalTyped = currentTyped.length;
      const accuracy = totalTyped > 0 ? Math.round((correct / totalTyped) * 100) : 100;
      const elapsed =
        exactElapsedSeconds !== undefined
          ? Math.max(1, Math.round(exactElapsedSeconds))
          : Math.max(1, TIMER_DURATION - timeLeft);
      const elapsedMinutes = elapsed / 60;

      const finalWpm = Math.round(correct / 5 / elapsedMinutes);
      const finalRawWpm = Math.round(totalTyped / 5 / elapsedMinutes);

      // Compute consistency from timeline points
      const pts = timelineRef.current;
      let consistency = 94;
      if (pts.length > 2 && finalWpm > 0) {
        const wpmValues = pts.map((p) => p.wpm);
        const mean = wpmValues.reduce((a, b) => a + b, 0) / wpmValues.length;
        const variance =
          wpmValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
          wpmValues.length;
        const stdDev = Math.sqrt(variance);
        const cv = mean > 0 ? (stdDev / mean) * 100 : 0;
        consistency = Math.max(40, Math.min(100, Math.round(100 - cv * 0.65)));
      } else if (totalTyped === 0) {
        consistency = 0;
      }

      const finalTimeline: TimelinePoint[] =
        pts.length > 0
          ? pts
          : [
              {
                second: elapsed,
                wpm: finalWpm,
                rawWpm: finalRawWpm,
                errors: incorrect,
              },
            ];

      const resultObj: TestResult = {
        id: `run-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        difficulty,
        passageTitle: passage.title,
        wpm: finalWpm,
        rawWpm: finalRawWpm,
        accuracy,
        correctChars: correct,
        incorrectChars: incorrect,
        totalCharsTyped: totalTyped,
        passageLength: target.length,
        timeElapsed: elapsed,
        completedPassage: completedEarly,
        consistency,
        timeline: finalTimeline,
        missedChars: { ...missedCharsRef.current },
      };

      setStatus('finished');
      setLastResult(resultObj);
      if (totalTyped > 0) {
        setHistory((prev) => [resultObj, ...prev].slice(0, 30));
      }
      soundEngine.playComplete();
    },
    [difficulty, passage.text, passage.title, timeLeft]
  );

  // 60-second countdown interval when status === 'running'
  useEffect(() => {
    if (status !== 'running') return;

    const interval = window.setInterval(() => {
      setTimeLeft((prev) => {
        const nextTime = prev - 1;
        const elapsed = TIMER_DURATION - nextTime;
        const currentTyped = typedTextRef.current;
        const target = passage.text;

        let correct = 0;
        let incorrect = 0;
        for (let i = 0; i < currentTyped.length; i++) {
          if (currentTyped[i] === target[i]) {
            correct++;
          } else {
            incorrect++;
          }
        }

        const elapsedMinutes = Math.max(1 / 60, elapsed / 60);
        const snapshotWpm = Math.round(correct / 5 / elapsedMinutes);
        const snapshotRaw = Math.round(currentTyped.length / 5 / elapsedMinutes);

        setTimeline((old) => [
          ...old,
          {
            second: elapsed,
            wpm: snapshotWpm,
            rawWpm: snapshotRaw,
            errors: incorrect,
          },
        ]);

        if (nextTime <= 0) {
          window.clearInterval(interval);
          return 0;
        }
        return nextTime;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [status, passage.text]);

  // Trigger finalizeTest automatically when timeLeft hits 0
  useEffect(() => {
    if (status === 'running' && timeLeft === 0) {
      finalizeTest(false, TIMER_DURATION);
    }
  }, [status, timeLeft, finalizeTest]);

  // Keep active character scrolled smoothly into view inside the passage box
  useEffect(() => {
    if (activeCharRef.current && passageContainerRef.current) {
      const container = passageContainerRef.current;
      const charEl = activeCharRef.current;
      const charTop = charEl.offsetTop;
      const containerScrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;

      if (charTop - containerScrollTop > containerHeight - 64) {
        container.scrollTo({
          top: charTop - 56,
          behavior: 'smooth',
        });
      } else if (charTop < containerScrollTop + 24) {
        container.scrollTo({
          top: Math.max(0, charTop - 24),
          behavior: 'smooth',
        });
      }
    }
  }, [typedText.length]);

  // Focus the typing input
  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Start test explicitly via Start button
  const handleStartTest = useCallback(() => {
    if (status === 'finished') {
      const nextPassage = getRandomPassage(difficulty, passage.id);
      setPassage(nextPassage);
    }
    setTypedText('');
    setTimeLeft(TIMER_DURATION);
    setTimeline([]);
    setMissedChars({});
    setLastResult(null);
    startTimeRef.current = Date.now();
    setStatus('running');
    if (passageContainerRef.current) {
      passageContainerRef.current.scrollTop = 0;
    }
    setTimeout(() => {
      focusInput();
    }, 10);
  }, [status, difficulty, passage.id, focusInput]);

  // Reset test with either a new random passage or the exact same passage
  const handleResetTest = useCallback(
    (useSamePassage: boolean = false, customDifficulty?: Difficulty) => {
      const activeDiff = customDifficulty ?? difficulty;
      if (!useSamePassage) {
        const nextPassage = getRandomPassage(activeDiff, passage.id);
        setPassage(nextPassage);
      }
      setTypedText('');
      setTimeLeft(TIMER_DURATION);
      setTimeline([]);
      setMissedChars({});
      setLastResult(null);
      startTimeRef.current = null;
      setStatus('idle');
      if (passageContainerRef.current) {
        passageContainerRef.current.scrollTop = 0;
      }
      setTimeout(() => {
        focusInput();
      }, 15);
    },
    [difficulty, passage.id, focusInput]
  );

  // Switch difficulty tier
  const handleSelectDifficulty = useCallback(
    (newDiff: Difficulty) => {
      setDifficulty(newDiff);
      const nextPassage = getRandomPassage(newDiff, passage.id);
      setPassage(nextPassage);
      setTypedText('');
      setTimeLeft(TIMER_DURATION);
      setTimeline([]);
      setMissedChars({});
      setLastResult(null);
      startTimeRef.current = null;
      setStatus('idle');
      if (passageContainerRef.current) {
        passageContainerRef.current.scrollTop = 0;
      }
      setTimeout(() => {
        focusInput();
      }, 15);
    },
    [passage.id, focusInput]
  );

  // Load a specific passage from the library
  const handleLoadSpecificPassage = useCallback(
    (selected: Passage) => {
      setDifficulty(selected.difficulty);
      setPassage(selected);
      setTypedText('');
      setTimeLeft(TIMER_DURATION);
      setTimeline([]);
      setMissedChars({});
      setLastResult(null);
      startTimeRef.current = null;
      setStatus('idle');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => {
        focusInput();
      }, 200);
    },
    [focusInput]
  );

  // Handle typing changes inside textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (status === 'finished') return;

    const nextValue = e.target.value;
    const target = passage.text;

    // Prevent typing beyond passage length
    if (nextValue.length > target.length) return;

    // Auto-start timer on first character typed if idle
    if (status === 'idle' && nextValue.length > 0) {
      startTimeRef.current = Date.now();
      setStatus('running');
    }

    // Check if user added a character (as opposed to Backspace)
    if (nextValue.length > typedText.length) {
      const charIndex = nextValue.length - 1;
      const typedChar = nextValue[charIndex];
      const expectedChar = target[charIndex];
      const isCorrect = typedChar === expectedChar;

      soundEngine.playKeyClick(isCorrect);

      if (!isCorrect && expectedChar) {
        setMissedChars((prev) => ({
          ...prev,
          [expectedChar]: (prev[expectedChar] || 0) + 1,
        }));
      }
    } else {
      soundEngine.playKeyClick(true);
    }

    setTypedText(nextValue);
    typedTextRef.current = nextValue;

    // Check if user has reached the end of the paragraph
    if (nextValue.length === target.length) {
      const elapsedSeconds = startTimeRef.current
        ? Math.max(1, (Date.now() - startTimeRef.current) / 1000)
        : Math.max(1, TIMER_DURATION - timeLeft);
      finalizeTest(true, elapsedSeconds);
    }
  };

  // Keyboard shortcuts inside textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleResetTest(true);
    }
  };

  // Toggle sound feedback
  const toggleSound = () => {
    const nextState = !soundEnabled;
    soundEngine.enabled = nextState;
    setSoundEnabled(nextState);
    if (nextState) {
      soundEngine.playKeyClick(true);
    }
  };

  // Personal Best & Aggregate Stats
  const personalStats = useMemo(() => {
    if (history.length === 0) {
      return { bestWpm: 0, avgWpm: 0, avgAccuracy: 0, totalRuns: 0 };
    }
    const bestWpm = Math.max(...history.map((r) => r.wpm));
    const avgWpm = Math.round(
      history.reduce((acc, r) => acc + r.wpm, 0) / history.length
    );
    const avgAccuracy = Math.round(
      history.reduce((acc, r) => acc + r.accuracy, 0) / history.length
    );
    return {
      bestWpm,
      avgWpm,
      avgAccuracy,
      totalRuns: history.length,
    };
  }, [history]);

  const filteredHistory = useMemo(() => {
    if (historyFilter === 'all') return history;
    return history.filter((item) => item.difficulty === historyFilter);
  }, [history, historyFilter]);

  const filteredLibrary = useMemo(() => {
    if (libraryFilter === 'all') return PASSAGES;
    return PASSAGES.filter((item) => item.difficulty === libraryFilter);
  }, [libraryFilter]);

  // Format countdown timer
  const formattedTime = useMemo(() => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, [timeLeft]);

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-[#0B0F17]/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 py-3.5">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#arena"
            className="text-lg font-bold tracking-tight text-slate-100 font-display whitespace-nowrap shrink-0"
          >
            KeyPulse
          </a>

          {/* Zone 2: 4 concise single-line navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
            <a
              href="#arena"
              className="hover:text-slate-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Typing Arena
            </a>
            <a
              href="#history"
              className="hover:text-slate-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Run History
            </a>
            <a
              href="#passages"
              className="hover:text-slate-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Passage Library
            </a>
            <a
              href="#methodology"
              className="hover:text-slate-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Methodology
            </a>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => handleResetTest(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              New 60s Test
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container (1200px desktop width baseline) */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-16">
        {/* SECTION 1: TYPING ARENA */}
        <section id="arena" className="space-y-6">
          {/* Arena Header & Controls Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-2">
                <span>60-Second Standardized Benchmark</span>
                <span aria-hidden="true">·</span>
                <span>{DIFFICULTY_META[difficulty].tagline}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  Target: {DIFFICULTY_META[difficulty].targetWpm}
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-100 text-balance">
                Precision Typing Speed & Accuracy Arena
              </h1>
            </div>

            {/* Difficulty & Primary Controls Bar */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Difficulty Segmented Selector (Easy, Medium, Hard) */}
              <div
                className="flex items-center gap-1 p-1 bg-[#111726] rounded-lg border border-slate-800/90"
                role="group"
                aria-label="Difficulty level"
              >
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => {
                  const active = difficulty === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => handleSelectDifficulty(level)}
                      className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-amber-400 text-slate-950 font-semibold shadow-xs'
                          : 'text-slate-400 hover:text-slate-100'
                      }`}
                    >
                      {DIFFICULTY_META[level].label}
                    </button>
                  );
                })}
              </div>

              {/* Start / Restart / Shuffle / Audio Action Buttons */}
              <div className="flex items-center gap-2">
                {status === 'idle' && (
                  <button
                    type="button"
                    onClick={handleStartTest}
                    className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleResetTest(true)}
                  title="Restart current passage (Esc)"
                  className="px-3.5 py-2 text-xs font-medium text-slate-200 bg-[#111726] hover:bg-slate-800/90 border border-slate-800/90 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Restart</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleResetTest(false)}
                  title="Load another random passage"
                  className="px-3.5 py-2 text-xs font-medium text-slate-200 bg-[#111726] hover:bg-slate-800/90 border border-slate-800/90 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Shuffle className="w-3.5 h-3.5 text-slate-400" />
                  <span>Random Text</span>
                </button>

                <button
                  type="button"
                  onClick={toggleSound}
                  aria-label={soundEnabled ? 'Mute keystroke sound' : 'Enable keystroke sound'}
                  title={soundEnabled ? 'Keystroke sound on' : 'Keystroke sound muted'}
                  className={`p-2 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                    soundEnabled
                      ? 'bg-amber-400/10 border-amber-400/40 text-amber-300'
                      : 'bg-[#111726] border-slate-800/90 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* LIVE TELEMETRY STRIP (60s Timer, Live WPM, Accuracy %, Correct / Incorrect Chars) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. 60-Second Countdown Timer */}
            <div className="bg-[#111726] border border-slate-800/90 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="flex items-center gap-1.5">
                  <Timer
                    className={`w-3.5 h-3.5 ${
                      status === 'running' && timeLeft <= 10
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  />
                  <span>Countdown Timer</span>
                </span>
                <span className="font-mono tabular-nums text-[11px] text-slate-500">
                  {formattedTime}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={`text-3xl sm:text-4xl font-bold font-mono tabular-nums tracking-tight ${
                    status === 'running' && timeLeft <= 10
                      ? 'text-rose-400'
                      : 'text-slate-100'
                  }`}
                >
                  {timeLeft}s
                </span>
                <span className="text-xs text-slate-400">
                  {status === 'idle'
                    ? 'Ready (60s)'
                    : status === 'running'
                    ? timeLeft <= 10
                      ? 'Final sprint'
                      : 'Active'
                    : 'Finished'}
                </span>
              </div>
            </div>

            {/* 2. Live WPM */}
            <div className="bg-[#111726] border border-slate-800/90 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Live Speed (WPM)</span>
                </span>
                <span className="font-mono tabular-nums text-[11px] text-slate-500">
                  Raw: {liveMetrics.rawWpm}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-3xl sm:text-4xl font-bold font-mono tabular-nums text-amber-400 tracking-tight">
                  {status === 'finished' && lastResult ? lastResult.wpm : liveMetrics.wpm}
                </span>
                <span className="text-xs text-slate-400 font-mono tabular-nums">
                  {personalStats.bestWpm > 0
                    ? `Best: ${personalStats.bestWpm}`
                    : 'words / min'}
                </span>
              </div>
            </div>

            {/* 3. Accuracy Percentage */}
            <div className="bg-[#111726] border border-slate-800/90 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Accuracy</span>
                </span>
                <span className="font-mono tabular-nums text-[11px] text-slate-500">
                  {charStats.totalTyped} typed
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={`text-3xl sm:text-4xl font-bold font-mono tabular-nums tracking-tight ${
                    charStats.accuracy >= 95
                      ? 'text-emerald-400'
                      : charStats.accuracy >= 85
                      ? 'text-slate-100'
                      : 'text-rose-400'
                  }`}
                >
                  {charStats.accuracy}%
                </span>
                <span className="text-xs text-slate-400">
                  {charStats.accuracy === 100
                    ? 'Precision'
                    : charStats.accuracy >= 94
                    ? 'High accuracy'
                    : 'Focus on accuracy'}
                </span>
              </div>
            </div>

            {/* 4. Correct & Incorrect Character Counts */}
            <div className="bg-[#111726] border border-slate-800/90 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Character Tally</span>
                <span className="font-mono tabular-nums text-[11px] text-slate-500">
                  {passage.text.length} total
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-baseline gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 self-center shrink-0" />
                  <span
                    className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-emerald-400 tracking-tight"
                    title="Correct characters"
                  >
                    {charStats.correct}
                  </span>
                  <span className="text-xs text-slate-400">correct</span>
                </div>
                <div className="h-5 w-px bg-slate-800" />
                <div className="flex items-baseline gap-2">
                  <XCircle className="w-4 h-4 text-rose-400 self-center shrink-0" />
                  <span
                    className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-rose-400 tracking-tight"
                    title="Incorrect characters"
                  >
                    {charStats.incorrect}
                  </span>
                  <span className="text-xs text-slate-400">mistakes</span>
                </div>
              </div>
            </div>
          </div>

          {/* REAL-TIME PROGRESS INDICATOR */}
          <div className="bg-[#111726] border border-slate-800/90 rounded-xl px-5 py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="font-medium text-slate-200">{passage.title}</span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="text-slate-400">{passage.category}</span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="text-slate-400">
                  {DIFFICULTY_META[difficulty].label} Tier
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono tabular-nums text-slate-400">
                <span>
                  {charStats.totalTyped} / {passage.text.length} chars
                </span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="text-amber-400 font-semibold">
                  {charStats.progressPercent}% Complete
                </span>
              </div>
            </div>

            {/* Progress Track */}
            <div
              className="w-full h-2 bg-slate-900 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={charStats.progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Passage typing progress"
            >
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-transform duration-150 ease-out origin-left"
                style={{
                  transform: `scaleX(${charStats.progressPercent / 100})`,
                }}
              />
            </div>
          </div>

          {/* MAIN WORKSPACE: EITHER ACTIVE TYPING AREA OR RESULTS SCREEN */}
          <AnimatePresence mode="wait">
            {status === 'finished' && lastResult ? (
              <ResultsView
                key="results-screen"
                result={lastResult}
                personalBestWpm={personalStats.bestWpm}
                passage={passage}
                onTryAgainNewPassage={() => handleResetTest(false)}
                onRetrySamePassage={() => handleResetTest(true)}
                onChangeDifficulty={(diff) => handleSelectDifficulty(diff)}
              />
            ) : (
              <motion.div
                key="typing-canvas"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16 }}
                onClick={focusInput}
                className={`relative rounded-2xl border transition-colors cursor-text ${
                  isFocused
                    ? 'bg-[#111726] border-amber-400/50 shadow-[0_0_0_1px_rgba(251,191,36,0.15)]'
                    : 'bg-[#111726]/90 border-slate-800/90 hover:border-slate-700'
                }`}
              >
                {/* Top Status Bar inside Typing Box */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-3.5 border-b border-slate-800/80 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Keyboard className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {status === 'idle'
                        ? isFocused
                          ? 'Begin typing any character or press Start to launch the 60-second timer'
                          : 'Click here or press Start to focus the typing field'
                        : 'Timer active — type each character accurately; mistakes highlight in red'}
                    </span>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-slate-500">
                    <span>Press Esc to quick-reset</span>
                  </div>
                </div>

                {/* Character-by-Character Highlighted Paragraph Display with Overlaid Input */}
                <div
                  ref={passageContainerRef}
                  className="relative p-6 sm:p-8 max-h-[320px] overflow-y-auto select-none font-mono text-lg sm:text-xl md:text-[22px] leading-[1.85] tracking-wide"
                >
                  <textarea
                    ref={inputRef}
                    value={typedText}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    aria-label="Type the displayed paragraph here"
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-text resize-none z-10"
                  />
                  {passage.text.split('').map((char, index) => {
                    const isTyped = index < typedText.length;
                    const isCurrent = index === typedText.length;
                    const typedChar = typedText[index];
                    const isCorrect = isTyped && typedChar === char;
                    const isMistake = isTyped && typedChar !== char;

                    let charClass = 'text-slate-500';
                    if (isCorrect) {
                      charClass = 'text-emerald-400 bg-emerald-500/12 rounded-[3px]';
                    } else if (isMistake) {
                      charClass =
                        'text-rose-400 bg-rose-500/25 underline decoration-rose-400 decoration-2 underline-offset-4 rounded-[3px]';
                    } else if (isCurrent) {
                      charClass = isFocused
                        ? 'text-slate-100 bg-amber-400/20 border-b-2 border-amber-400 caret-pulse'
                        : 'text-slate-300 border-b-2 border-slate-600';
                    }

                    return (
                      <span
                        key={index}
                        ref={isCurrent ? activeCharRef : null}
                        className={`transition-colors duration-75 ${charClass}`}
                      >
                        {char}
                      </span>
                    );
                  })}
                </div>

                {/* Bottom Action Footer Bar inside Typing Canvas */}
                <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-t border-slate-800/80 bg-[#0E1320]/60 rounded-b-2xl">
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-emerald-400/80 inline-block" />
                      <span>Correct character</span>
                    </span>
                    <span aria-hidden="true" className="text-slate-700">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-rose-400/80 inline-block" />
                      <span>Mistake</span>
                    </span>
                    <span aria-hidden="true" className="text-slate-700">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-amber-400 inline-block" />
                      <span>Active cursor</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {status === 'idle' ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartTest();
                        }}
                        className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Start 60s Timer</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          finalizeTest(false);
                        }}
                        className="px-4 py-2 text-xs font-medium text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Finish & Calculate Now
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResetTest(true);
                      }}
                      className="px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restart</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* SECTION 2: SESSION RUN HISTORY & PERSONAL BENCHMARKS */}
        <section id="history" className="pt-6 border-t border-slate-800/80 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
                <span>Local Telemetry Log</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {personalStats.totalRuns} completed runs
                </span>
                {personalStats.bestWpm > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-amber-400">
                      Personal Best: {personalStats.bestWpm} WPM
                    </span>
                  </>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
                Recent Test History & Benchmarks
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Filter by difficulty */}
              <div className="flex items-center gap-1 p-1 bg-[#111726] rounded-lg border border-slate-800/90">
                {(['all', 'easy', 'medium', 'hard'] as const).map((filterKey) => (
                  <button
                    key={filterKey}
                    type="button"
                    onClick={() => setHistoryFilter(filterKey)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      historyFilter === filterKey
                        ? 'bg-slate-800 text-slate-100'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {filterKey === 'all'
                      ? 'All Tiers'
                      : DIFFICULTY_META[filterKey].label}
                  </button>
                ))}
              </div>

              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHistory([])}
                  className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 bg-[#111726] border border-slate-800/90 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Log</span>
                </button>
              )}
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="border border-slate-800/90 bg-[#111726] rounded-xl p-8 text-center">
              <p className="text-sm text-slate-300 font-medium mb-1">
                No completed typing runs recorded for this tier yet
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-5">
                Complete a 60-second test or finish typing a passage above to log your net WPM, raw speed, accuracy percentage, and character breakdown.
              </p>
              <button
                type="button"
                onClick={handleStartTest}
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start First Timed Run</span>
              </button>
            </div>
          ) : (
            <div className="border border-slate-800/90 bg-[#111726] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/90 text-[11px] font-medium text-slate-400 bg-[#0E1320]">
                      <th className="py-3 px-4">Passage</th>
                      <th className="py-3 px-4">Difficulty</th>
                      <th className="py-3 px-4 text-right">Net WPM</th>
                      <th className="py-3 px-4 text-right">Raw WPM</th>
                      <th className="py-3 px-4 text-right">Accuracy</th>
                      <th className="py-3 px-4 text-right">Correct / Mistakes</th>
                      <th className="py-3 px-4 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {filteredHistory.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-3 px-4 font-medium text-slate-200">
                          {item.passageTitle}
                          <span className="ml-2 text-slate-500 font-mono text-[11px]">
                            {item.timestamp}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {DIFFICULTY_META[item.difficulty].label}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-amber-400">
                          {item.wpm}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-400">
                          {item.rawWpm}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-400">
                          {item.accuracy}%
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          <span className="text-emerald-400">{item.correctChars}</span>
                          <span className="mx-1 text-slate-600">/</span>
                          <span className="text-rose-400">{item.incorrectChars}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-400">
                          {item.timeElapsed}s
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* SECTION 3: CURATED PASSAGE LIBRARY */}
        <section id="passages" className="pt-6 border-t border-slate-800/80 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
                <span>18 Calibrated Passages</span>
                <span aria-hidden="true">·</span>
                <span>3 Complexity Tiers</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
                Passage Library by Difficulty
              </h2>
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#111726] rounded-lg border border-slate-800/90 self-start sm:self-auto">
              {(['all', 'easy', 'medium', 'hard'] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setLibraryFilter(tier)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    libraryFilter === tier
                      ? 'bg-slate-800 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tier === 'all' ? 'All Passages' : DIFFICULTY_META[tier].label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLibrary.map((item) => {
              const isSelected = item.id === passage.id;
              return (
                <div
                  key={item.id}
                  className={`border rounded-xl p-5 flex flex-col justify-between transition-colors ${
                    isSelected
                      ? 'bg-[#151D30] border-amber-400/50'
                      : 'bg-[#111726] border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                      <span className="text-amber-400 font-medium">
                        {DIFFICULTY_META[item.difficulty].label}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{item.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {item.text.length} chars
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-100 mb-2">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed font-mono">
                      {item.text}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center justify-between">
                    <span className="text-[11px] font-mono tabular-nums text-slate-500">
                      ~{Math.round(item.text.length / 5)} standard words
                    </span>
                    <button
                      type="button"
                      onClick={() => handleLoadSpecificPassage(item)}
                      className="text-xs font-semibold text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>{isSelected ? 'Active in Arena' : 'Load Passage'}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION 4: SCORING METHODOLOGY & DIFFICULTY SPECIFICATION */}
        <section id="methodology" className="pt-6 border-t border-slate-800/80 space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
              <span>Standardized Telemetry</span>
              <span aria-hidden="true">·</span>
              <span>5-Character Word Normalization</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
              Scoring Methodology & Difficulty Calibration
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#111726] border border-slate-800/90 rounded-xl p-5">
              <div className="text-xs text-amber-400 font-mono mb-1">
                01 · Net Words Per Minute
              </div>
              <h3 className="text-base font-semibold text-slate-100 mb-2">
                Normalized 5-Char Word Standard
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                To ensure fair comparison across Easy conversational prose and Hard technical passages, every 5 correctly typed keystrokes (including spaces and punctuation) count as 1 standardized word, divided by elapsed minutes.
              </p>
            </div>

            <div className="bg-[#111726] border border-slate-800/90 rounded-xl p-5">
              <div className="text-xs text-emerald-400 font-mono mb-1">
                02 · Character Accuracy Ratio
              </div>
              <h3 className="text-base font-semibold text-slate-100 mb-2">
                Real-Time Error Highlighting
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every character is compared against the target passage index in real time. Correct characters illuminate in emerald green while mismatches highlight in crimson red. You can use Backspace at any point before the timer expires to fix errors.
              </p>
            </div>

            <div className="bg-[#111726] border border-slate-800/90 rounded-xl p-5">
              <div className="text-xs text-slate-300 font-mono mb-1">
                03 · Three Calibrated Tiers
              </div>
              <h3 className="text-base font-semibold text-slate-100 mb-2">
                Progressive Syntactic Density
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Easy passages focus on high-frequency words and steady rhythm. Medium introduces varied clauses and hyphens. Hard challenges top-row reach with numeric telemetry, parentheses, semicolons, and scientific symbols.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-800/80 py-6 mt-12">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>KeyPulse — Precision Typing Speed & Accuracy Tester</span>
          <div className="flex items-center gap-4">
            <a href="#arena" className="hover:text-slate-300 transition-colors">
              Arena
            </a>
            <a href="#history" className="hover:text-slate-300 transition-colors">
              History
            </a>
            <a href="#passages" className="hover:text-slate-300 transition-colors">
              Passages
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
