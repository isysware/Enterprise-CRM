import React from 'react';

export interface MiniBarItem {
  id: string;
  label: string;
  value: number;
  sublabel?: string;
  avatar?: string;
  icon?: React.ReactNode;
  color?: string;
  onClick?: () => void;
}

export interface MiniBarListProps {
  items: MiniBarItem[];
  maxValue?: number;
  className?: string;
}

export const MiniBarList: React.FC<MiniBarListProps> = ({
  items,
  maxValue,
  className = ''
}) => {
  const calculatedMax = maxValue || Math.max(...items.map(i => i.value), 1);

  return (
    <div className={`space-y-3 ${className}`}>
      {items.map(item => {
        const percent = Math.min(Math.round((item.value / calculatedMax) * 100), 100);

        return (
          <div
            key={item.id}
            onClick={item.onClick}
            className={`space-y-1 group ${item.onClick ? 'cursor-pointer' : ''}`}
          >
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                {item.avatar && (
                  <img
                    src={item.avatar}
                    alt={item.label}
                    className="w-4.5 h-4.5 rounded-full object-cover shrink-0 ring-1 ring-[#E5EAF1] dark:ring-slate-700"
                  />
                )}
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                <span className="font-medium text-[#0F172A] dark:text-slate-200 truncate group-hover:text-[#2563EB] transition-colors">
                  {item.label}
                </span>
                {item.sublabel && (
                  <span className="text-[10px] text-[#64748B] dark:text-slate-400 shrink-0">
                    {item.sublabel}
                  </span>
                )}
              </div>

              <div className="font-mono text-[11px] font-bold text-[#0F172A] dark:text-white shrink-0">
                {item.value}
              </div>
            </div>

            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(percent, item.value > 0 ? 3 : 0)}%`,
                  backgroundColor: item.color || '#2563EB'
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
