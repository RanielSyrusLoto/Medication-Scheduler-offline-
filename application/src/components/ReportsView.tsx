import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, BarChart3, TrendingUp, CheckCircle, Calendar, ArrowUpRight, Award, Pill } from 'lucide-react';
import { callApi } from '../utils/pywebview';
import { User, DashboardDataResponse, HistoryLog } from '../types';

interface ReportsViewProps {
  user: User | null;
  refreshKey?: number;
}

export default function ReportsView({ user, refreshKey }: ReportsViewProps): React.JSX.Element {
  const [data, setData] = useState<DashboardDataResponse | null>(null);
  const [history, setHistory] = useState<HistoryLog[]>([]);
  const [exportMsg, setExportMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchReportsData = async () => {
    if (!user?.user_id) return;
    setLoading(true);
    try {
      const [dashRes, histRes] = await Promise.all([
        callApi<DashboardDataResponse>('get_dashboard_data', user.user_id),
        callApi('get_history', user.user_id)
      ]);
      if (dashRes && dashRes.success) {
        setData(dashRes as DashboardDataResponse);
      }
      if (histRes && histRes.success) {
        setHistory(histRes.history || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, [user, refreshKey]);

  const handleExportCSV = async () => {
    if (!user?.user_id) return;
    setExportMsg('');
    const res = await callApi('export_csv', user.user_id);
    if (res && res.success) {
      setExportMsg(res.message || 'Report exported successfully!');
      setTimeout(() => setExportMsg(''), 4000);
    } else {
      setExportMsg('Export failed.');
    }
  };

  const {
    total_meds = 0,
    doses_taken = 0,
    adherence_rate = '100%',
    weekly_counts = [0, 0, 0, 0, 0, 0, 0]
  } = data || {};

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxWeekly = Math.max(...weekly_counts, 5);

  return (
    <div className="p-4 sm:p-6 lg:p-7 space-y-5 sm:space-y-6 overflow-y-auto custom-scrollbar h-full transition-colors duration-200">
      <div className="flex items-center justify-end pb-1 border-b border-[#E3E8EE] dark:border-[#1c3345]">
        <button
          type="button"
          onClick={handleExportCSV}
          className="px-4 py-2 bg-[#2E7D7E] hover:bg-[#26696a] text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Full Report (CSV)</span>
        </button>
      </div>

      {exportMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-xs font-medium animate-fadeIn">
          {exportMsg}
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-[#183641] text-[#2E7D7E] dark:text-[#2dd4bf] flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-bold text-[#1E2837] dark:text-white">
              {adherence_rate}
            </span>
            <p className="text-xs text-[#8B9DA8] dark:text-[#859ba8] font-medium mt-0.5">
              Overall Adherence Rate
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-bold text-[#1E2837] dark:text-white">
              {doses_taken}
            </span>
            <p className="text-xs text-[#8B9DA8] dark:text-[#859ba8] font-medium mt-0.5">
              Completed Doses Logged
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <Pill className="w-6 h-6 -rotate-45" />
          </div>
          <div>
            <span className="text-2xl font-bold text-[#1E2837] dark:text-white">
              {total_meds}
            </span>
            <p className="text-xs text-[#8B9DA8] dark:text-[#859ba8] font-medium mt-0.5">
              Active Prescriptions
            </p>
          </div>
        </div>
      </div>

      {/* Weekly Intake Chart & Treatment Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Weekly Bar Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-[#E3E8EE] dark:border-[#1c3345] mb-5">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#2E7D7E] dark:text-[#2dd4bf]" />
              <h3 className="text-sm font-bold text-[#1E2837] dark:text-white">
                Weekly Intake Consistency
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-[#8B9DA8]">Past 7 Days</span>
          </div>

          <div className="h-48 flex items-end justify-between gap-3 pt-4 pb-2 border-b border-[#E3E8EE] dark:border-[#1c3345]">
            {days.map((day, idx) => {
              const val = weekly_counts[idx] || 0;
              const heightPct = Math.max(10, Math.round((val / maxWeekly) * 100));

              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[10px] font-bold text-[#2E7D7E] dark:text-[#2dd4bf]">
                    {val > 0 ? val : ''}
                  </span>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[28px] rounded-t-lg bg-[#2E7D7E] dark:bg-[#26a69a] transition-all duration-300 hover:opacity-80"
                    title={`${day}: ${val} doses taken`}
                  />
                  <span className="text-[11px] font-medium text-[#8B9DA8] dark:text-[#859ba8]">
                    {day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Treatment Insights (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E3E8EE] dark:border-[#1c3345]">
            <TrendingUp className="w-4 h-4 text-[#43A047]" />
            <h3 className="text-sm font-bold text-[#1E2837] dark:text-white">
              Clinical Insights
            </h3>
          </div>

          <p className="text-xs text-[#64748B] dark:text-[#859ba8] leading-relaxed">
            Maintaining an adherence rate over 80% significantly reduces risk of therapeutic failure and disease recurrence.
          </p>

          <div className="p-3.5 rounded-xl bg-[#F3F6F9] dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] space-y-2">
            <span className="text-[11px] font-bold text-[#1E2837] dark:text-white block">
              Adherence Summary
            </span>
            <p className="text-[11px] text-[#8B9DA8]">
              {doses_taken > 0
                ? `You have logged ${doses_taken} successful doses. Keep maintaining consistent intake schedules!`
                : 'Start logging your daily doses to generate customized compliance insights.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
