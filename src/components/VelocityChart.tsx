import React from 'react';

export interface TimelinePoint {
  second: number;
  wpm: number;
  rawWpm: number;
  errors: number;
}

interface VelocityChartProps {
  data: TimelinePoint[];
}

export const VelocityChart: React.FC<VelocityChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center border border-slate-800/80 rounded-xl bg-slate-900/40 text-sm text-slate-400">
        Complete at least 2 seconds of typing to generate a velocity curve.
      </div>
    );
  }

  const width = 720;
  const height = 200;
  const padLeft = 42;
  const padRight = 18;
  const padTop = 20;
  const padBottom = 32;

  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const maxWpm = Math.max(60, ...data.map((d) => Math.max(d.wpm, d.rawWpm)));
  const yMax = Math.ceil(maxWpm / 20) * 20;

  const points = data.map((pt, idx) => {
    const xRatio = data.length > 1 ? idx / (data.length - 1) : 0.5;
    const x = padLeft + xRatio * plotWidth;
    const yNet = padTop + plotHeight - (pt.wpm / yMax) * plotHeight;
    const yRaw = padTop + plotHeight - (pt.rawWpm / yMax) * plotHeight;
    return { ...pt, x, yNet, yRaw };
  });

  const netLinePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yNet.toFixed(1)}`)
    .join(' ');

  const rawLinePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yRaw.toFixed(1)}`)
    .join(' ');

  const areaPath =
    points.length > 1
      ? `${netLinePath} L ${points[points.length - 1].x.toFixed(1)} ${(padTop + plotHeight).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padTop + plotHeight).toFixed(1)} Z`
      : '';

  const yTicks = [0, Math.round(yMax / 2), yMax];

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        <div className="text-xs text-slate-400">
          <span>Second-by-Second Velocity Profile</span>
          <span className="mx-2 text-slate-600">·</span>
          <span className="font-mono tabular-nums">{data.length}s recorded</span>
        </div>
        <div className="flex items-center gap-5 text-xs text-slate-400">
          <span className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-amber-400 inline-block" />
            <span>Net WPM</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-slate-500 inline-block border-b border-dashed border-slate-400" />
            <span>Raw WPM</span>
          </span>
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-48 overflow-visible"
          role="img"
          aria-label="WPM velocity chart over time"
        >
          <defs>
            <linearGradient id="netWpmFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {yTicks.map((tick) => {
            const y = padTop + plotHeight - (tick / yMax) * plotHeight;
            return (
              <g key={tick}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#1E293B"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-500 text-[11px] font-mono"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Area under Net WPM */}
          {areaPath && <path d={areaPath} fill="url(#netWpmFill)" />}

          {/* Raw WPM dashed path */}
          {points.length > 1 && (
            <path
              d={rawLinePath}
              fill="none"
              stroke="#64748B"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          )}

          {/* Net WPM solid line */}
          {points.length > 1 && (
            <path
              d={netLinePath}
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data nodes */}
          {points.map((p, i) => {
            const showNode =
              points.length <= 15 ||
              i === 0 ||
              i === points.length - 1 ||
              i % Math.ceil(points.length / 12) === 0;
            if (!showNode) return null;
            return (
              <g key={p.second}>
                <circle
                  cx={p.x}
                  cy={p.yNet}
                  r="3.2"
                  className="fill-[#0B0F17] stroke-amber-400"
                  strokeWidth="2"
                />
                <text
                  x={p.x}
                  y={height - 8}
                  textAnchor="middle"
                  className="fill-slate-500 text-[10px] font-mono"
                >
                  {p.second}s
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
