import React, { useState, useEffect } from 'react';
import { Bell, X, Pill, Clock, Check, Droplet, Sun, Moon } from 'lucide-react';
import AppLoadingScreen from './components/AppLoadingScreen';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginModal from './components/LoginModal';
import DashboardView from './components/DashboardView';
import MedicationsView from './components/MedicationsView';
import IntakeView from './components/IntakeView';
import HistoryView from './components/HistoryView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import DoseSuccessModal, { DoseSuccessData } from './components/DoseSuccessModal';
import { callApi } from './utils/pywebview';
import { User, DueAlert } from './types';
import { formatTimeWithAmPm, isAmTime } from './utils/timeFormat';
import { getMedicationImageUrl } from './utils/imageHelper';

export default function App(): React.JSX.Element {
  const [appLoading, setAppLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('DashboardFrame');
  const [dataRefreshKey, setDataRefreshKey] = useState<number>(0);
  const [activeAlert, setActiveAlert] = useState<DueAlert | null>(null);
  const [doseSuccessData, setDoseSuccessData] = useState<DoseSuccessData | null>(null);
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem('med_app_theme') || 'light';
  });

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem('med_app_theme', nextTheme);
      document.documentElement.setAttribute('data-theme', nextTheme);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
    } catch (e) {
      console.error(e);
    }
  }, [theme]);

  useEffect(() => {
    const handleDueAlert = (e: Event) => {
      const customEvent = e as CustomEvent<DueAlert>;
      if (customEvent.detail) {
        setActiveAlert(customEvent.detail);
      }
    };
    window.addEventListener('medication-due-alert', handleDueAlert);
    return () => window.removeEventListener('medication-due-alert', handleDueAlert);
  }, []);

  useEffect(() => {
    const handleDoseSuccess = (e: Event) => {
      const customEvent = e as CustomEvent<DoseSuccessData>;
      if (customEvent.detail) {
        setDoseSuccessData(customEvent.detail);
      }
    };
    window.addEventListener('dose-taken-success', handleDoseSuccess);
    return () => window.removeEventListener('dose-taken-success', handleDoseSuccess);
  }, []);

  useEffect(() => {
    async function checkAutoLogin() {
      try {
        const res = await callApi('get_auto_login_user');
        if (res && res.success && res.user) {
          setUser(res.user);
          return;
        }

        const savedSession = localStorage.getItem('med_user_session');
        if (savedSession) {
          const { user: savedUser, expiry } = JSON.parse(savedSession);
          if (savedUser && expiry && expiry > Date.now()) {
            setUser(savedUser);
            callApi('set_active_user', savedUser.user_id);
          } else {
            localStorage.removeItem('med_user_session');
          }
        }
      } catch (e) {
        console.error('Failed to load saved session:', e);
      }
    }
    checkAutoLogin();
  }, []);

  // Track visited tabs to keep them mounted once visited (Keep-Alive pattern)
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set(['DashboardFrame']));

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      const updated = new Set(prev);
      updated.add(activeTab);
      return updated;
    });
  }, [activeTab]);

  const handleLogout = async () => {
    localStorage.removeItem('med_user_session');
    await callApi('logout');
    setUser(null);
    setVisitedTabs(new Set(['DashboardFrame']));
    setActiveTab('DashboardFrame');
  };

  const handleLoginSuccess = async (u: User) => {
    setUser(u);
    setVisitedTabs(new Set(['DashboardFrame']));
    setActiveTab('DashboardFrame');
    try {
      await callApi('set_active_user', u.user_id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDataChange = () => {
    setDataRefreshKey((prev) => prev + 1);
  };

  if (appLoading) {
    return <AppLoadingScreen onFinish={() => setAppLoading(false)} />;
  }

  if (!user) {
    return <LoginModal onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen w-screen bg-[#F3F6F9] dark:bg-[#0c1722] text-[#1E2837] dark:text-white overflow-hidden select-none transition-colors duration-200">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F3F6F9] dark:bg-[#0c1722]">
        <Header activeTab={activeTab} user={user} theme={theme} onToggleTheme={handleToggleTheme} />

        <main className="flex-1 overflow-hidden relative">
          {visitedTabs.has('DashboardFrame') && (
            <div className={`h-full w-full ${activeTab === 'DashboardFrame' ? 'block' : 'hidden'}`}>
              <DashboardView
                user={user}
                onDataChange={handleDataChange}
                onNavigate={setActiveTab}
                refreshKey={dataRefreshKey}
              />
            </div>
          )}
          {visitedTabs.has('MedicationFrame') && (
            <div className={`h-full w-full ${activeTab === 'MedicationFrame' ? 'block' : 'hidden'}`}>
              <MedicationsView
                user={user}
                onDataChange={handleDataChange}
                refreshKey={dataRefreshKey}
              />
            </div>
          )}
          {visitedTabs.has('IntakeFrame') && (
            <div className={`h-full w-full ${activeTab === 'IntakeFrame' ? 'block' : 'hidden'}`}>
              <IntakeView
                user={user}
                onDataChange={handleDataChange}
                refreshKey={dataRefreshKey}
              />
            </div>
          )}
          {visitedTabs.has('HistoryFrame') && (
            <div className={`h-full w-full ${activeTab === 'HistoryFrame' ? 'block' : 'hidden'}`}>
              <HistoryView
                user={user}
                refreshKey={dataRefreshKey}
              />
            </div>
          )}
          {visitedTabs.has('ReportsFrame') && (
            <div className={`h-full w-full ${activeTab === 'ReportsFrame' ? 'block' : 'hidden'}`}>
              <ReportsView
                user={user}
                refreshKey={dataRefreshKey}
              />
            </div>
          )}
          {visitedTabs.has('SettingsFrame') && (
            <div className={`h-full w-full ${activeTab === 'SettingsFrame' ? 'block' : 'hidden'}`}>
              <SettingsView
                user={user}
                theme={theme}
                onToggleTheme={handleToggleTheme}
                onLogout={handleLogout}
              />
            </div>
          )}
        </main>
      </div>

      {/* Medication Due Alert Toast */}
      {activeAlert && (
        <div className="fixed top-5 right-5 z-[9999] w-[440px] max-w-[94vw] bg-white dark:bg-[#13222f] border border-[#2E7D7E]/50 dark:border-[#2dd4bf]/50 rounded-2xl p-5 shadow-2xl backdrop-blur-md animate-fadeIn">
          <div className="flex items-start justify-between gap-3 pb-3 mb-3 border-b border-[#E3E8EE] dark:border-[#1c3345]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-50 text-[#2E7D7E] dark:bg-[#183641] dark:text-[#2dd4bf] rounded-xl shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#1E2837] dark:text-white text-xs">
                    {activeAlert.title || 'Medication Reminder'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-[#2E7D7E] dark:bg-[#183641] dark:text-[#2dd4bf]">
                    Due Now
                  </span>
                </div>
                <p className="text-[11px] text-[#8B9DA8] dark:text-[#859ba8] mt-0.5">
                  {activeAlert.date || 'Scheduled for today'} &bull; {activeAlert.timestamp || 'Now'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveAlert(null)}
              className="text-[#8B9DA8] hover:text-[#1E2837] dark:hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {activeAlert.medications && activeAlert.medications.length > 0 ? (
            <div className="space-y-2 mb-4 max-h-[220px] overflow-y-auto pr-1">
              {activeAlert.medications.map((m, idx) => (
                <div
                  key={idx}
                  className="bg-[#F3F6F9] dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] rounded-xl p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#94a9b8]/40 dark:border-[#2e4354] bg-white dark:bg-[#13222f] shadow-2xs flex items-center justify-center shrink-0">
                      <img
                        src={getMedicationImageUrl(m.name, (m as any).image_path)}
                        alt={m.name}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/drug_images/paracetamol.jpg';
                        }}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-[#1E2837] dark:text-white text-xs truncate">{m.name}</h4>
                      <span className="text-[10px] text-[#8B9DA8]">{m.dosage}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-[#2E7D7E] dark:text-[#2dd4bf] font-semibold shrink-0">
                    {isAmTime(m.time_value) ? (
                      <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    ) : (
                      <Moon className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                    )}
                    <span>{formatTimeWithAmPm(m.time_value) || 'Today'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#1E2837] dark:text-slate-200 text-xs mb-4 p-3 bg-[#F3F6F9] dark:bg-[#172838] rounded-xl">
              {activeAlert.message}
            </p>
          )}

          <div className="mb-4 px-3 py-2 bg-teal-50/70 text-[#2E7D7E] dark:bg-[#183641] dark:text-[#2dd4bf] rounded-xl flex items-center gap-2 text-[11px] font-medium">
            <Droplet className="w-3.5 h-3.5 shrink-0" />
            <span>Remember to log your intake after taking your dose.</span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E3E8EE] dark:border-[#1c3345]">
            <button
              type="button"
              onClick={() => setActiveAlert(null)}
              className="px-4 py-1.5 bg-[#F3F6F9] dark:bg-[#172838] text-[#64748B] dark:text-[#859ba8] font-semibold rounded-xl text-xs"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveAlert(null);
                setActiveTab('IntakeFrame');
              }}
              className="px-4 py-1.5 bg-[#2E7D7E] hover:bg-[#26696a] text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Take Dose Now</span>
            </button>
          </div>
        </div>
      )}

      {/* Interactive Dose Success Celebration Modal */}
      <DoseSuccessModal
        data={doseSuccessData}
        onClose={() => setDoseSuccessData(null)}
      />
    </div>
  );
}
