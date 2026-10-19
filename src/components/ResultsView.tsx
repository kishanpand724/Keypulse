import React from 'react';
import { motion } from 'motion/react';
import { RotateCcw, Play, CheckCircle2, XCircle, Award, Clock, Zap, Target } from 'lucide-react';
import { Difficulty, DIFFICULTY_META, Passage } from '../data/passages';
import { TimelinePoint, VelocityChart } from './VelocityChart';

export interface TestResult {
  id: string;
  timestamp: string;
  difficulty: Difficulty;
  passageTitle: string;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  totalCharsTyped: number;
  passageLength: number;
  timeElapsed: number;
  completedPassage: boolean;
  consistency: number;
  timeline: TimelinePoint[];
  missedChars: Record<string, number>;
}

interface ResultsViewProps {
  result: TestResult;
  personalBestWpm: number;
  passage: Passage;
  onTryAgainNewPassage: () => void;
  onRetrySamePassage: () => void;
  onChangeDifficulty: (diff: Difficulty) => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  result,
  personalBestWpm,
  onTryAgainNewPassage,
  onRetrySamePassage,
  onChangeDifficulty,
}) => {
  const isNewRecord = result.wpm > 0 && result.wpm >= personalBestWpm;
  const topMissed = Object.entries(result.missedChars)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="border border-slate-800/90 bg-[#111726] rounded-2xl p-6 sm:p-8"
    >
      {/* Top Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
            <span>{DIFFICULTY_META[result.difficulty].label} Difficulty</span>
            <span aria-hidden="true">·</span>
            <span>{result.passageTitle}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{result.timeElapsed}s elapsed</span>
            {isNewRecord && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-400 font-medium inline-flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  Personal Best
                </span>
              </>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
            {result.completedPassage
              ? 'Passage Completed Ahead of Timer'
              : '60-Second Sprint Complete'}
          </h2>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onRetrySamePassage}
            className="px-4 py-2.5 text-sm font-medium text-slate-200 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span>Retry Same Passage</span>
          </button>
          <button
            type="button"
            onClick={onTryAgainNewPassage}
            className="px-5 py-2.5 text-sm font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Try Again</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 py-7 border-b border-slate-800/80">
        {/* Net WPM */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Net Speed (WPM)</span>
          </div>
          <div className="text-4xl sm:text-5xl font-bold font-mono tabular-nums text-amber-400 tracking-tight">
            {result.wpm}
          </div>
          <div className="mt-1.5 text-xs text-slate-400 font-mono tabular-nums">
            Raw Speed: {result.rawWpm} WPM
          </div>
        </div>

        {/* Accuracy */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span>Typing Accuracy</span>
          </div>
          <div className="text-4xl sm:text-5xl font-bold font-mono tabular-nums text-slate-100 tracking-tight">
            {result.accuracy}%
          </div>
          <div className="mt-1.5 text-xs text-slate-400 font-mono tabular-nums">
            Consistency: {result.consistency}%
          </div>
        </div>

        {/* Correct Characters */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Correct Characters</span>
          </div>
          <div className="text-4xl sm:text-5xl font-bold font-mono tabular-nums text-emerald-400 tracking-tight">
            {result.correctChars}
          </div>
          <div className="mt-1.5 text-xs text-slate-400 font-mono tabular-nums">
            of {result.totalCharsTyped} typed ({Math.round((result.totalCharsTyped / result.passageLength) * 100)}% of text)
          </div>
        </div>

        {/* Incorrect Characters */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Mistakes Recorded</span>
          </div>
          <div className="text-4xl sm:text-5xl font-bold font-mono tabular-nums text-rose-400 tracking-tight">
            {result.incorrectChars}
          </div>
          <div className="mt-1.5 text-xs text-slate-400 font-mono tabular-nums">
            {result.incorrectChars === 0 ? 'Flawless execution' : `${result.incorrectChars} error characters`}
          </div>
        </div>
      </div>

      {/* Velocity Chart Section */}
      <div className="py-7 border-b border-slate-800/80">
        <VelocityChart data={result.timeline} />
      </div>

      {/* Bottom Diagnostics & Difficulty Switcher */}
      <div className="pt-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 mb-2">
            Character Accuracy Diagnostics
          </h3>
          {topMissed.length === 0 ? (
            <p className="text-xs text-emerald-400 font-mono">
              Zero character mismatches detected across the entire session.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <span className="text-slate-400">Most missed characters:</span>
              {topMissed.map(([char, count]) => (
                <span key={char} className="font-mono tabular-nums text-slate-200">
                  <strong className="text-rose-400">
                    {char === ' ' ? '[Space]' : `"${char}"`}
                  </strong>{' '}
                  ×{count}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Next test difficulty:</span>
          </span>
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => onChangeDifficulty(level)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  result.difficulty === level
                    ? 'bg-amber-400 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {DIFFICULTY_META[level].label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
