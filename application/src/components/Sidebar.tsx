import React from 'react';
import { LayoutDashboard, Pill, CalendarClock, History, FileText, Settings, LogOut } from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User | null;
  onLogout: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, user, onLogout }: SidebarProps): React.JSX.Element {
  const displayName = user?.name || user?.username || 'John Lee Vargas';

  const navItems = [
    { id: 'DashboardFrame', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'MedicationFrame', label: 'My Medications', icon: Pill },
    { id: 'IntakeFrame', label: 'Schedule', icon: CalendarClock },
    { id: 'HistoryFrame', label: 'History', icon: History },
    { id: 'ReportsFrame', label: 'Reports', icon: FileText },
    { id: 'SettingsFrame', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-[240px] bg-white dark:bg-[#09121b] border-r border-[#E3E8EE] dark:border-[#1c3345] flex flex-col h-full shrink-0 select-none transition-colors duration-200">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[#E3E8EE] dark:border-[#1c3345]">
        <div className="w-9 h-9 rounded-xl bg-[#2E7D7E] flex items-center justify-center text-white shadow-sm shrink-0">
          <Pill className="w-5 h-5 -rotate-45" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-[#1E2837] dark:text-white text-xs leading-tight">
            Smart Medication
          </span>
          <span className="font-bold text-[#1E2837] dark:text-white text-xs leading-tight">
            Scheduler
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3.5 py-4 sm:py-5 space-y-1 sm:space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#EBF5F5] dark:bg-[#183641] text-[#2E7D7E] dark:text-[#2dd4bf] shadow-xs'
                  : 'text-[#64748B] dark:text-[#859ba8] hover:bg-[#F3F6F9] dark:hover:bg-[#12222e] hover:text-[#1E2837] dark:hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#2E7D7E] dark:text-[#2dd4bf]' : 'text-[#8B9DA8] dark:text-[#859ba8]'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* User Profile Footer */}
      <div className="p-3.5 border-t border-[#E3E8EE] dark:border-[#1c3345]">
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[#F3F6F9] dark:hover:bg-[#12222e] transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-8 h-8 rounded-full bg-[#2E7D7E]/10 dark:bg-[#26a69a]/20 border border-[#2E7D7E]/30 flex items-center justify-center text-[#2E7D7E] dark:text-[#2dd4bf] font-bold text-xs shrink-0">
              {displayName.charAt(0).toUpperCase()}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#43A047] border-2 border-white dark:border-[#09121b] rounded-full" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-[#1E2837] dark:text-white text-xs truncate">
                {displayName}
              </span>
              <span className="text-[10px] text-[#43A047] font-medium flex items-center gap-1">
                Online
              </span>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Log Out"
            className="w-7 h-7 rounded-lg text-[#8B9DA8] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center justify-center transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
