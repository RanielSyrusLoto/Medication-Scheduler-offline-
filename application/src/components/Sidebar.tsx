import React, { useState } from 'react';
import { LayoutDashboard, Pill, CalendarClock, History, FileText, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User | null;
  onLogout: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, user, onLogout }: SidebarProps): React.JSX.Element {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
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
    <aside className={`${isCollapsed ? 'w-[72px]' : 'w-[240px]'} bg-[#fff6d1] dark:bg-[#09121b] border-r border-[#E3E8EE] dark:border-[#1c3345] flex flex-col h-full shrink-0 select-none transition-[width] duration-200`}>
      {/* Brand Header */}
      <div className={`flex ${isCollapsed ? 'flex-col items-center gap-3.5 px-2' : 'items-center justify-between gap-3.5 px-5'} py-[23px] border-b border-[#E3E8EE] dark:border-[#1c3345]`}>
        <div className={`flex items-center ${isCollapsed ? 'w-full justify-center' : 'gap-3.5'} min-w-0`}>
          <img
            src="/app_icon.png"
            alt="Smart Medication Scheduler"
            className="w-[41px] h-[41px] rounded-xl object-contain shadow-xs shrink-0"
          />
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-[#1E2837] dark:text-white text-[14px] leading-tight">
                Smart Medication
              </span>
              <span className="font-bold text-[#1E2837] dark:text-white text-[14px] leading-tight">
                Scheduler
              </span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsCollapsed((collapsed) => !collapsed)}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`w-[37px] h-[37px] rounded-lg text-[#8B9DA8] hover:text-[#2E7D7E] hover:bg-[#F3F6F9] dark:hover:text-[#2dd4bf] dark:hover:bg-[#12222e] flex items-center justify-center transition-colors shrink-0 ${isCollapsed ? 'self-center' : ''}`}
        >
          {isCollapsed ? <ChevronRight className="w-[18px] h-[18px]" /> : <ChevronLeft className="w-[18px] h-[18px]" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className={`flex-1 overflow-y-auto custom-scrollbar ${isCollapsed ? 'px-2' : 'px-3.5'} py-[18px] sm:py-[23px] space-y-1.5`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              aria-label={item.label}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3.5 px-4'} py-[11.5px] rounded-xl text-[14px] font-semibold transition-all ${
                isActive
                  ? 'bg-[#EBF5F5] dark:bg-[#183641] text-[#2E7D7E] dark:text-[#2dd4bf] shadow-xs'
                  : 'text-[#64748B] dark:text-[#859ba8] hover:bg-[#F3F6F9] dark:hover:bg-[#12222e] hover:text-[#1E2837] dark:hover:text-white'
              }`}
            >
              <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-[#2E7D7E] dark:text-[#2dd4bf]' : 'text-[#8B9DA8] dark:text-[#859ba8]'}`} />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </div>

      {/* User Profile Footer */}
      <div className={`${isCollapsed ? 'p-2' : 'p-3.5'} border-t border-[#E3E8EE] dark:border-[#1c3345]`}>
        <div className={`flex ${isCollapsed ? 'flex-col gap-2.5' : 'items-center justify-between'} p-2 rounded-xl hover:bg-[#F3F6F9] dark:hover:bg-[#12222e] transition-colors`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3.5'} min-w-0`}>
            <div className="relative w-[37px] h-[37px] rounded-full bg-[#2E7D7E]/10 dark:bg-[#26a69a]/20 border border-[#2E7D7E]/30 flex items-center justify-center text-[#2E7D7E] dark:text-[#2dd4bf] font-bold text-[14px] shrink-0">
              {displayName.charAt(0).toUpperCase()}
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#43A047] border-2 border-white dark:border-[#09121b] rounded-full" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-[#1E2837] dark:text-white text-[14px] truncate">
                  {displayName}
                </span>
                <span className="text-[12px] text-[#43A047] font-medium flex items-center gap-1">
                  Online
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onLogout}
            title="Log Out"
            aria-label="Log out"
            className="w-8 h-8 rounded-lg text-[#8B9DA8] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center justify-center transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
