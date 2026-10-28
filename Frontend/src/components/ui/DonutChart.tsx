import React from 'react';

export interface DonutSegment {
  id: string;
  label: string;
  value: number;
  color: string; // Tailwind hex color (e.g. '#2563EB')
}

export interface DonutChartProps {
  data: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string | number;
  showLegend?: boolean;
  className?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 140,
  strokeWidth = 22,
  centerLabel,
  centerValue,
  showLegend = true,
  className = ''
}) => {
  const total = data.reduce((acc, item) => acc + item.value, 0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className={`flex flex-col sm:flex-row items-center gap-4 sm:gap-6 ${className}`}>
      {/* SVG Donut */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#F1F5F9"
            strokeWidth={strokeWidth}
            className="dark:stroke-slate-800"
          />

          {/* Slices */}
          {total > 0 &&
            data.map(segment => {
              if (segment.value <= 0) return null;

              const percent = segment.value / total;
              const strokeDasharray = `${percent * circumference} ${circumference}`;
              const strokeDashoffset = -(accumulatedPercent * circumference);

              accumulatedPercent += percent;

              return (
                <circle
                  key={segment.id}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={segment.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="butt"
                  className="transition-all duration-300 hover:opacity-85"
                >
                  <title>{`${segment.label}: ${segment.value} (${Math.round(percent * 100)}%)`}</title>
                </circle>
              );
            })}
        </svg>

        {/* Center Label & Value */}
        {(centerValue !== undefined || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
            {centerValue !== undefined && (
              <span className="text-base sm:text-lg font-black text-[#0F172A] dark:text-white leading-tight">
                {centerValue}
              </span>
            )}
            {centerLabel && (
              <span className="text-[10px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
                {centerLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex-1 w-full space-y-1.5 min-w-0">
          {data.map(segment => {
            const percent = total > 0 ? Math.round((segment.value / total) * 100) : 0;

            return (
              <div
                key={segment.id}
                className="flex items-center justify-between text-xs py-0.5"
                title={`${segment.label}: ${segment.value}`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: segment.color }}
                  />
                  <span className="font-medium text-[#0F172A] dark:text-slate-200 truncate">
                    {segment.label}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                  <span className="font-bold text-[#0F172A] dark:text-white">
                    {segment.value}
                  </span>
                  <span className="text-[#64748B] dark:text-slate-400 w-8 text-right">
                    {percent}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
