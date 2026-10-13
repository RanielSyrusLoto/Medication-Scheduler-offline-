import React, { useState, useEffect } from 'react';
import { Calendar, FileSpreadsheet, Trash2, Filter, History, Check, Clock, AlertCircle, Search, X } from 'lucide-react';
import { callApi } from '../utils/pywebview';
import { User, HistoryLog } from '../types';
import { formatTimeWithAmPm } from '../utils/timeFormat';

interface HistoryViewProps {
  user: User | null;
  refreshKey?: number;
}

type DateFilterType = 'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM';

export default function HistoryView({ user, refreshKey }: HistoryViewProps): React.JSX.Element {
  const [history, setHistory] = useState<HistoryLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [exportMsg, setExportMsg] = useState<string>('');
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [dateFilter, setDateFilter] = useState<DateFilterType>('ALL');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const fetchHistory = async () => {
    if (!user?.user_id) return;
    setLoading(true);
    const res = await callApi('get_history', user.user_id);
    if (res.success) {
      setHistory(res.history || []);
    }
    setLoading(false);
  };

  const confirmDeleteLog = async () => {
    if (!pendingDeleteId) return;
    const targetId = pendingDeleteId;
    setPendingDeleteId(null);
    const res = await callApi('delete_history_log', targetId);
    if (res.success) {
      fetchHistory();
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user, refreshKey]);

  const handleExportCSV = async () => {
    if (!user?.user_id) return;
    setExportMsg('');
    const res = await callApi('export_csv', user.user_id);
    if (res.success) {
      setExportMsg(res.message || 'Exported to CSV successfully!');
      setTimeout(() => setExportMsg(''), 4000);
    } else {
      setExportMsg('Export failed.');
    }
  };

  const filteredHistory = history.filter((log) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matches =
        (log.med_name || '').toLowerCase().includes(term) ||
        (log.status || '').toLowerCase().includes(term) ||
        (log.timestamp || '').toLowerCase().includes(term);
      if (!matches) return false;
    }

    if (dateFilter === 'ALL') return true;
    if (!log.timestamp) return true;

    const itemDate = new Date(log.timestamp.replace(' ', 'T'));
    if (isNaN(itemDate.getTime())) return true;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24);

    if (dateFilter === 'TODAY') {
      return itemDate.toISOString().split('T')[0] === todayStr;
    }
    if (dateFilter === 'YESTERDAY') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return itemDate.toISOString().split('T')[0] === y.toISOString().split('T')[0];
    }
    if (dateFilter === 'THIS_WEEK') {
      return diffDays >= 0 && diffDays <= 7;
    }
    if (dateFilter === 'THIS_MONTH') {
      return diffDays >= 0 && diffDays <= 30;
    }
    if (dateFilter === 'CUSTOM') {
      if (customStart && new Date(customStart) > itemDate) return false;
      if (customEnd) {
        const endDate = new Date(customEnd);
        endDate.setHours(23, 59, 59, 999);
        if (endDate < itemDate) return false;
      }
      return true;
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-7 flex flex-col h-full overflow-hidden transition-colors duration-200">
      {/* 1. STICKY TOP BAR: Search + Filters + Export (Fixed at Top) */}
      <div className="shrink-0 pb-4 mb-4 border-b border-[#E3E8EE] dark:border-[#1c3345] bg-[#F3F6F9] dark:bg-[#0c1722] z-10">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 flex-wrap">
          {/* Search Input Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B9DA8]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search history by medication name, status, date..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-xl text-xs text-[#1E2837] dark:text-white placeholder-[#8B9DA8] focus:outline-none focus:border-[#2E7D7E] dark:focus:border-[#2dd4bf] shadow-xs transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B9DA8] hover:text-[#1E2837]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
            {/* Timeline Filter Selector */}
            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-xl text-xs font-semibold text-[#1E2837] dark:text-white shadow-xs">
              <Calendar className="w-3.5 h-3.5 text-[#2E7D7E] dark:text-[#2dd4bf]" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
                className="bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="dark:bg-[#13222f]">All Dates</option>
                <option value="TODAY" className="dark:bg-[#13222f]">Today</option>
                <option value="YESTERDAY" className="dark:bg-[#13222f]">Yesterday</option>
                <option value="THIS_WEEK" className="dark:bg-[#13222f]">Past 7 Days</option>
                <option value="THIS_MONTH" className="dark:bg-[#13222f]">Past 30 Days</option>
                <option value="CUSTOM" className="dark:bg-[#13222f]">Custom Range</option>
              </select>
            </div>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] hover:border-[#2E7D7E] dark:hover:border-[#2dd4bf] text-[#1E2837] dark:text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#2E7D7E] dark:text-[#2dd4bf]" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {exportMsg && (
          <div className="mt-3 p-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-xs font-medium animate-fadeIn">
            {exportMsg}
          </div>
        )}
      </div>

      {/* 2. SCROLLABLE TABLE AREA */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-2xl shadow-sm custom-scrollbar">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="sticky top-0 bg-[#F3F6F9] dark:bg-[#172838] z-10 border-b border-[#E3E8EE] dark:border-[#1c3345]">
              <tr className="text-[#8B9DA8] dark:text-[#859ba8] font-bold">
                <th className="py-3.5 px-6">Date & Time</th>
                <th className="py-3.5 px-6">Medication</th>
                <th className="py-3.5 px-6">Dosage</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8EE] dark:divide-[#1c3345]">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#8B9DA8] dark:text-[#859ba8]">
                    No medication history records found for the selected filter.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((log) => {
                  const isTaken = log.status === 'TAKEN';
                  return (
                    <tr
                      key={log.log_id}
                      className="hover:bg-[#F3F6F9]/60 dark:hover:bg-[#172838]/60 transition-colors"
                    >
                      <td className="py-3.5 px-6 font-medium text-[#1E2837] dark:text-white">
                        {formatTimeWithAmPm(log.timestamp)}
                      </td>
                      <td className="py-3.5 px-6 font-bold text-[#1E2837] dark:text-white">
                        {log.med_name}
                      </td>
                      <td className="py-3.5 px-6 text-[#64748B] dark:text-[#859ba8]">
                        Standard Dose
                      </td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isTaken
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
                              : 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30'
                          }`}
                        >
                          {isTaken ? (
                            <>
                              <Check className="w-3 h-3 stroke-[2.5]" />
                              <span>Taken</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>{log.status}</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(log.log_id)}
                          className="p-1 text-[#8B9DA8] hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {pendingDeleteId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-[#1E2837] dark:text-white">Delete Log Entry?</h3>
            <p className="text-xs text-[#8B9DA8]">
              Are you sure you want to delete this historical record?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingDeleteId(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-[#64748B]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteLog}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
