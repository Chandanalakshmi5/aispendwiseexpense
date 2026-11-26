import { useEffect, useRef, useState } from 'react';

/* ============================================================
   Custom SVG Chart Components
   ============================================================ */

type BarChartProps = {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  formatValue?: (v: number) => string;
};

export function BarChart({ data, height = 200, formatValue }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="w-full" style={{ height }}>
      <div className="flex h-full items-end gap-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
            <div className="text-[10px] text-slate-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {formatValue ? formatValue(d.value) : d.value.toFixed(0)}
            </div>
            <div
              className="w-full rounded-t-md transition-all duration-500 ease-out hover:opacity-90 relative"
              style={{
                height: `${(d.value / max) * 100}%`,
                minHeight: d.value > 0 ? '4px' : '0',
                background: d.color
                  ? `linear-gradient(180deg, ${d.color} 0%, ${d.color}80 100%)`
                  : 'linear-gradient(180deg, #38bdf8 0%, #38bdf880 100%)',
              }}
            />
            <div className="text-[10px] text-slate-500 mt-1.5 truncate w-full text-center">
              {d.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type LineChartProps = {
  data: { label: string; value: number }[];
  height?: number;
  formatValue?: (v: number) => string;
  color?: string;
};

export function LineChart({ data, height = 200, formatValue, color = '#38bdf8' }: LineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const width = 600;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const values = data.map((d) => d.value);
  const max = Math.max(...values, 1);
  const min = 0;

  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartW;
    const y = padding.top + chartH - ((d.value - min) / (max - min)) * chartH;
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${padding.left + chartW} ${padding.top + chartH} L ${padding.left} ${padding.top + chartH} Z`;

  return (
    <div className="w-full relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id={`area-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padding.top + chartH - t * chartH;
          return (
            <line
              key={t}
              x1={padding.left}
              y1={y}
              x2={padding.left + chartW}
              y2={y}
              stroke="rgba(100,116,139,0.15)"
              strokeWidth="1"
            />
          );
        })}
        {/* Y labels */}
        {[0, 0.5, 1].map((t) => {
          const y = padding.top + chartH - t * chartH;
          const val = min + t * (max - min);
          return (
            <text
              key={t}
              x={padding.left - 8}
              y={y + 4}
              fill="#6b7385"
              fontSize="10"
              textAnchor="end"
            >
              {formatValue ? formatValue(val) : Math.round(val).toString()}
            </text>
          );
        })}

        {/* Area + line */}
        <path d={areaD} fill={`url(#area-${color.replace('#', '')})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* Hover interaction */}
        {points.map((p, i) => (
          <g key={i}>
            <rect
              x={p.x - chartW / data.length / 2}
              y={padding.top}
              width={chartW / data.length}
              height={chartH}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
            />
            {hoverIdx === i && (
              <>
                <line
                  x1={p.x}
                  y1={padding.top}
                  x2={p.x}
                  y2={padding.top + chartH}
                  stroke="rgba(100,116,139,0.35)"
                  strokeDasharray="4 4"
                />
                <circle cx={p.x} cy={p.y} r="4" fill={color} stroke="#ffffff" strokeWidth="2" />
              </>
            )}
          </g>
        ))}

        {/* X labels */}
        {points.map((p, i) => {
          const showEvery = Math.ceil(data.length / 6);
          if (i % showEvery !== 0 && i !== data.length - 1) return null;
          return (
            <text
              key={i}
              x={p.x}
              y={height - 8}
              fill="#6b7385"
              fontSize="10"
              textAnchor="middle"
            >
              {p.label}
            </text>
          );
        })}
      </svg>
      {hoverIdx !== null && (
        <div
          className="absolute bg-slate-900/95 border border-white/10 rounded-lg px-3 py-1.5 text-xs pointer-events-none whitespace-nowrap z-10"
          style={{
            left: `${(points[hoverIdx].x / width) * 100}%`,
            top: 0,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="text-slate-400">{points[hoverIdx].label}</div>
          <div className="text-white font-semibold">
            {formatValue ? formatValue(points[hoverIdx].value) : points[hoverIdx].value.toFixed(0)}
          </div>
        </div>
      )}
    </div>
  );
}

type DonutChartProps = {
  data: { label: string; value: number; color: string }[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
};

export function DonutChart({ data, size = 180, centerLabel, centerValue }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(100,116,139,0.15)" strokeWidth="16" />
        {total > 0 &&
          data.map((d, i) => {
            const pct = d.value / total;
            const dash = pct * circumference;
            const gap = circumference - dash;
            const rotation = (offset / total) * 360 - 90;
            offset += d.value;
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={d.color}
                strokeWidth="16"
                strokeDasharray={`${dash} ${gap}`}
                strokeLinecap="round"
                transform={`rotate(${rotation} ${cx} ${cy})`}
                style={{ transition: 'stroke-dasharray 0.6s ease-out' }}
              />
            );
          })}
        {centerValue && (
          <text x={cx} y={cy - 4} textAnchor="middle" fill="#2d3748" fontSize="20" fontWeight="700">
            {centerValue}
          </text>
        )}
        {centerLabel && (
          <text x={cx} y={cy + 14} textAnchor="middle" fill="#6b7385" fontSize="11">
            {centerLabel}
          </text>
        )}
      </svg>
    </div>
  );
}

type ProgressBarProps = {
  percent: number;
  color?: string;
  height?: number;
};

export function ProgressBar({ percent, color = '#38bdf8', height = 8 }: ProgressBarProps) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(Math.min(percent, 100)), 100);
    return () => clearTimeout(t);
  }, [percent]);
  return (
    <div className="w-full rounded-full overflow-hidden bg-white/5" style={{ height }}>
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{
          width: `${animated}%`,
          background: `linear-gradient(90deg, ${color} 0%, ${color}aa 100%)`,
        }}
      />
    </div>
  );
}
