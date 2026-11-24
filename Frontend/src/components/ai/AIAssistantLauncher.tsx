import React from 'react';
import { Sparkles, Bot } from 'lucide-react';

interface AIAssistantLauncherProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const AIAssistantLauncher: React.FC<AIAssistantLauncherProps> = ({
  isOpen,
  onToggle
}) => {
  return (
    <div className="fixed bottom-11 right-4 sm:right-6 z-40 select-none">
      <button
        type="button"
        onClick={onToggle}
        title="AI Assistant"
        aria-label="Open AI Assistant"
        aria-expanded={isOpen}
        className={`group flex items-center gap-2 pl-3 pr-3.5 py-2.5 rounded-full shadow-lg border transition-all duration-200 cursor-pointer active:scale-95 ${
          isOpen
            ? 'bg-slate-900 text-white border-slate-700 shadow-slate-900/20'
            : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-blue-500/30 shadow-blue-500/25 hover:shadow-blue-500/40'
        }`}
      >
        <div className="w-5 h-5 rounded-full flex items-center justify-center">
          <Sparkles className="w-4 h-4 transition-transform group-hover:rotate-12" />
        </div>
        <span className="text-xs font-bold tracking-tight hidden sm:inline">
          {isOpen ? 'Close Copilot' : 'CRM Copilot'}
        </span>
        <span className="w-2 h-2 rounded-full bg-blue-200 animate-pulse" />
      </button>
    </div>
  );
};
