import React from 'react';

export interface DistributionSegment {
  id: string;
  label: string;
  value: number;
  color: string;
}

export interface DistributionBarProps {
  segments: DistributionSegment[];
  height?: number;
  showLabels?: boolean;
  className?: string;
  onSegmentClick?: (segmentId: string) => void;
}

export const DistributionBar: React.FC<DistributionBarProps> = ({
  segments,
  height = 8,
  showLabels = false,
  className = '',
  onSegmentClick
}) => {
  const total = segments.reduce((acc, s) => acc + s.value, 0);

  return (
    <div className={`w-full space-y-2 ${className}`}>
      {/* Stacked bar */}
      <div
        className="w-full bg-slate-100 dark:bg-slate-800 rounded-full flex overflow-hidden shadow-inner"
        style={{ height }}
      >
        {total > 0 &&
          segments.map(seg => {
            if (seg.value <= 0) return null;
            const percent = (seg.value / total) * 100;

            return (
              <div
                key={seg.id}
                style={{
                  width: `${percent}%`,
                  backgroundColor: seg.color
                }}
                className={`h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full ${
                  onSegmentClick ? 'cursor-pointer hover:opacity-85' : ''
                }`}
                title={`${seg.label}: ${seg.value} (${Math.round(percent)}%)`}
                onClick={() => onSegmentClick?.(seg.id)}
              />
            );
          })}
      </div>

      {/* Optional segment labels */}
      {showLabels && (
        <div className="flex items-center gap-3 flex-wrap text-xs pt-1">
          {segments.map(seg => {
            const percent = total > 0 ? Math.round((seg.value / total) * 100) : 0;
            return (
              <div key={seg.id} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-[#64748B] dark:text-slate-400 font-medium">
                  {seg.label}:
                </span>
                <span className="font-bold text-[#0F172A] dark:text-white font-mono">
                  {seg.value} <span className="font-normal text-[10px]">({percent}%)</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
