import React from 'react';
import { Calendar, Sun, Moon, Minus, Square, X } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  activeTab: string;
  user: User | null;
  theme?: 'dark' | 'light' | string;
  onToggleTheme: () => void;
}

export default function Header({ activeTab, user, theme = 'light', onToggleTheme }: HeaderProps): React.JSX.Element {
  const isDark = theme === 'dark';
  const displayName = user?.name || user?.username || 'John Lee';
  const firstName = displayName.split(' ')[0] || displayName;

  const currentHour = new Date().getHours();
  let greetingTime = 'Good Morning';
  if (currentHour >= 12 && currentHour < 17) {
    greetingTime = 'Good Afternoon';
  } else if (currentHour >= 17) {
    greetingTime = 'Good Evening';
  }

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  const getHeaderMeta = () => {
    switch (activeTab) {
      case 'MedicationFrame':
        return {
          title: 'Medication Stock',
          subtitle: 'Manage inventory, dosages, and refill alerts.'
        };
      case 'IntakeFrame':
        return {
          title: 'Medication Schedule',
          subtitle: 'Plan recurring doses, view timetable, and log intakes.'
        };
      case 'HistoryFrame':
        return {
          title: 'Medication History',
          subtitle: 'Audit log of all taken doses, skips, and exported reports.'
        };
      case 'ReportsFrame':
        return {
          title: 'Adherence & Reports',
          subtitle: 'Analyze your treatment consistency and medical compliance.'
        };
      case 'SettingsFrame':
        return {
          title: 'Settings',
          subtitle: 'Configure application themes, sound alerts, and profile.'
        };
      default:
        return {
          title: `${greetingTime}, ${firstName}!`,
          subtitle: "Here's your medication overview for today."
        };
    }
  };

  const meta = getHeaderMeta();

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 lg:px-7 py-3 sm:py-4 bg-white dark:bg-[#13222f] border-b border-[#E3E8EE] dark:border-[#1c3345] transition-colors duration-200 shrink-0">
      <div className="min-w-0 pr-4">
        <h1 className="text-lg sm:text-xl font-bold text-[#1E2837] dark:text-white tracking-tight truncate">
          {meta.title}
        </h1>
        <p className="text-xs text-[#8B9DA8] dark:text-[#859ba8] mt-0.5 truncate">
          {meta.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={onToggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#F3F6F9] dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] text-[#1E2837] dark:text-white hover:border-[#2E7D7E] dark:hover:border-[#26a69a] transition-all shadow-sm"
        >
          {isDark ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-medium text-slate-200">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-[#2E7D7E]" />
              <span className="text-[11px] font-medium text-[#1E2837]">Dark</span>
            </>
          )}
        </button>

        {/* Date Display */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F3F6F9] dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] text-xs font-medium text-[#8B9DA8] dark:text-[#859ba8]">
          <Calendar className="w-3.5 h-3.5 text-[#2E7D7E] dark:text-[#26a69a]" />
          <span className="text-[#1E2837] dark:text-slate-200">{dateStr}</span>
        </div>

        {/* Decorative Window Controls matching Desktop reference */}
        <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-[#E3E8EE] dark:border-[#1c3345]">
          <span className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-amber-400 transition-colors inline-block" />
          <span className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-emerald-400 transition-colors inline-block" />
          <span className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-rose-400 transition-colors inline-block" />
        </div>
      </div>
    </header>
  );
}
