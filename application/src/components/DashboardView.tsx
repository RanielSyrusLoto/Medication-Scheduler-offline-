import React, { useEffect, useState } from 'react';
import { Pill, Calendar, Check, Clock, Plus, ArrowRight, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { callApi } from '../utils/pywebview';
import { User, DashboardDataResponse, Schedule, HistoryLog } from '../types';
import { formatTimeWithAmPm } from '../utils/timeFormat';

interface DashboardViewProps {
  user: User | null;
  onDataChange?: () => void;
  onNavigate?: (tab: string) => void;
}

export default function DashboardView({ user, onDataChange, onNavigate }: DashboardViewProps): React.JSX.Element {
  const [data, setData] = useState<DashboardDataResponse | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDashboard = async () => {
    if (!user?.user_id) return;
    setLoading(true);
    try {
      const [dashRes, schRes] = await Promise.all([
        callApi<DashboardDataResponse>('get_dashboard_data', user.user_id),
        callApi('get_schedules', user.user_id)
      ]);

      if (dashRes && dashRes.success) {
        setData(dashRes as DashboardDataResponse);
      }
      if (schRes && schRes.success) {
        setSchedules(schRes.schedules || []);
      }
    } catch (e) {
      console.error('Failed fetching dashboard info', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [user]);

  const handleTakeDose = async (medId: number) => {
    if (!user?.user_id) return;
    const res = await callApi('take_dose', user.user_id, medId);
    if (res.success) {
      fetchDashboard();
      if (onDataChange) onDataChange();
    }
  };

  const {
    total_meds = 0,
    doses_taken = 0,
    due_meds = [],
    recent_history = []
  } = data || {};

  // Compute stats for the 4 top cards
  const totalDosesToday = schedules.length > 0 ? schedules.length : (due_meds.length + doses_taken);
  const takenCount = doses_taken > 0 ? doses_taken : 0;
  const upcomingCount = Math.max(0, due_meds.length > 0 ? due_meds.length : (totalDosesToday - takenCount));

  // Determine which schedules to show in "Today's Schedule"
  const todayScheduleItems = schedules.length > 0 ? schedules : due_meds;

  const colorPalettes = [
    { circle: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/30' },
    { circle: 'bg-teal-100 dark:bg-teal-500/20 text-[#2E7D7E] dark:text-[#2dd4bf]', border: 'border-teal-200 dark:border-teal-500/30' },
    { circle: 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-500/30' },
    { circle: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/30' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-7 flex flex-col h-full overflow-hidden transition-colors duration-200 gap-4 sm:gap-5">
      {/* 1. TOP SECTION: 4 Summary Stat Cards (Fully Responsive Grid) */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Medications */}
        <div className="bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-2xl p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-teal-50 dark:bg-[#183641] text-[#2E7D7E] dark:text-[#2dd4bf] flex items-center justify-center shrink-0">
            <Pill className="w-5 h-5 -rotate-45" />
          </div>
          <div className="min-w-0">
            <span className="text-lg sm:text-xl font-bold text-[#1E2837] dark:text-white tracking-tight truncate block">
              {total_meds}
            </span>
            <p className="text-[11px] text-[#8B9DA8] dark:text-[#859ba8] font-medium truncate">
              Total Medications
            </p>
          </div>
        </div>

        {/* Card 2: Today's Doses */}
        <div className="bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-2xl p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-lg sm:text-xl font-bold text-[#1E2837] dark:text-white tracking-tight truncate block">
              {totalDosesToday}
            </span>
            <p className="text-[11px] text-[#8B9DA8] dark:text-[#859ba8] font-medium truncate">
              Today's Doses
            </p>
          </div>
        </div>

        {/* Card 3: Taken */}
        <div className="bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-2xl p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Check className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <span className="text-lg sm:text-xl font-bold text-[#1E2837] dark:text-white tracking-tight truncate block">
              {takenCount}
            </span>
            <p className="text-[11px] text-[#8B9DA8] dark:text-[#859ba8] font-medium truncate">
              Taken
            </p>
          </div>
        </div>

        {/* Card 4: Upcoming */}
        <div className="bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-2xl p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-orange-50 dark:bg-orange-500/10 text-orange-500 dark:text-orange-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-lg sm:text-xl font-bold text-[#1E2837] dark:text-white tracking-tight truncate block">
              {upcomingCount}
            </span>
            <p className="text-[11px] text-[#8B9DA8] dark:text-[#859ba8] font-medium truncate">
              Upcoming
            </p>
          </div>
        </div>
      </div>

      {/* 2. BOTTOM SECTION: Fully Responsive Desktop Layout */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 items-stretch overflow-hidden">
        {/* Left Column: Today's Schedule Card (ONLY internal items list scrolls) */}
        <div className="md:col-span-7 xl:col-span-7 2xl:col-span-8 bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col h-full overflow-hidden">
          {/* Card Header (Fixed inside card, never scrolls) */}
          <div className="shrink-0 flex items-center justify-between pb-3 sm:pb-3.5 border-b border-[#E3E8EE] dark:border-[#1c3345] mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#2E7D7E] dark:text-[#2dd4bf]" />
              <h2 className="text-sm font-bold text-[#1E2837] dark:text-white tracking-tight">
                Today's Schedule
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('IntakeFrame')}
              className="text-xs font-semibold text-[#2E7D7E] dark:text-[#2dd4bf] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Schedule Items List: ONLY THIS SCROLLS */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1.5 space-y-2.5">
            {todayScheduleItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-10 text-center text-[#8B9DA8] dark:text-[#859ba8] space-y-2">
                <Pill className="w-8 h-8 mx-auto text-[#2E7D7E]/50 dark:text-[#2dd4bf]/50" />
                <p className="text-xs font-medium">No medication doses scheduled for today.</p>
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('IntakeFrame')}
                  className="mt-2 px-4 py-2 bg-[#2E7D7E] text-white text-xs font-semibold rounded-xl hover:bg-[#26696a] transition-all inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Schedule Medication</span>
                </button>
              </div>
            ) : (
              todayScheduleItems.map((item, idx) => {
                const palette = colorPalettes[idx % colorPalettes.length];
                const medName = item.med_name || (item as any).name || 'Medication';
                const timeStr = item.time_value ? formatTimeWithAmPm(item.time_value) : 'Scheduled';
                const dosageStr = item.dosage || (item as any).strength || '1 tablet';
                const instructions = item.instructions || `${item.dose_per_intake || 1} ${item.dose_unit || 'tablet'}`;

                return (
                  <div
                    key={item.schedule_id || (item as any).med_id || idx}
                    className="p-3 rounded-xl border border-[#E3E8EE] dark:border-[#1c3345] bg-[#F3F6F9]/50 dark:bg-[#172838]/40 hover:bg-[#F3F6F9] dark:hover:bg-[#172838] transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {(item as any).image_path ? (
                        <div className="w-10 h-10 min-w-[40px] min-h-[40px] max-w-[40px] max-h-[40px] aspect-square rounded-xl overflow-hidden border border-[#E3E8EE] dark:border-[#1c3345] shrink-0 bg-[#F3F6F9] dark:bg-[#172838] flex items-center justify-center">
                          <img src={(item as any).image_path} alt={medName} className="w-full h-full object-cover rounded-xl" style={{ width: '40px', height: '40px' }} />
                        </div>
                      ) : (
                        <div className={`w-10 h-10 min-w-[40px] min-h-[40px] max-w-[40px] max-h-[40px] aspect-square rounded-xl flex items-center justify-center shrink-0 ${palette.circle}`}>
                          <Pill className="w-5 h-5 -rotate-45" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-[#1E2837] dark:text-white truncate">
                          {medName}
                        </h3>
                        <p className="text-[11px] text-[#8B9DA8] dark:text-[#859ba8] truncate mt-0.5">
                          {dosageStr} • {instructions}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#F3F6F9] dark:bg-[#172838] text-xs font-medium text-[#64748B] dark:text-[#859ba8]">
                        <Clock className="w-3.5 h-3.5 text-[#2E7D7E] dark:text-[#2dd4bf]" />
                        <span>{timeStr}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleTakeDose(item.med_id)}
                        title="Mark as Taken"
                        className="w-8 h-8 rounded-full border-2 border-[#2E7D7E] dark:border-[#2dd4bf] hover:bg-[#2E7D7E] dark:hover:bg-[#2dd4bf] hover:text-white text-[#2E7D7E] dark:text-[#2dd4bf] flex items-center justify-center transition-all shadow-xs shrink-0"
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Stay on Track (Much Bigger Picture!) & Quick Actions (Responsive Desktop Layout) */}
        <div className="md:col-span-5 xl:col-span-5 2xl:col-span-4 flex flex-col gap-4 shrink-0 h-full overflow-y-auto custom-scrollbar pr-0.5">
          {/* Card: Stay on Track! With DYNAMIC RESPONSIVE BIG PICTURE */}
          <div className="bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-2xl p-4 sm:p-5 lg:p-6 shadow-sm relative overflow-hidden flex flex-col items-center text-center flex-1 min-h-[340px] lg:min-h-[400px] xl:min-h-[460px] justify-between">
            {/* BIGGER PICTURE DISPLAY */}
            <div className="w-full flex-1 flex items-center justify-center p-3 mb-3 bg-gradient-to-b from-[#2E7D7E]/5 via-[#2E7D7E]/2 to-transparent dark:from-[#2dd4bf]/10 dark:via-[#2dd4bf]/5 dark:to-transparent rounded-2xl border border-[#2E7D7E]/10 dark:border-[#2dd4bf]/10 overflow-hidden">
              <img
                src="/assets/stay_on_track_art.jpg"
                alt="Health reminder illustration"
                className="w-full h-full max-w-[280px] sm:max-w-[340px] md:max-w-[380px] lg:max-w-[440px] xl:max-w-[520px] 2xl:max-w-[600px] max-h-[300px] sm:max-h-[360px] lg:max-h-[420px] xl:max-h-[480px] 2xl:max-h-[560px] aspect-square object-contain rounded-2xl drop-shadow-xl hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="shrink-0 space-y-1">
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-[#1E2837] dark:text-white tracking-tight">
                Stay on track!
              </h3>
              <p className="text-xs sm:text-[13px] text-[#8B9DA8] dark:text-[#859ba8] leading-relaxed max-w-[280px] mx-auto">
                Your health matters. Keep taking your medications on time.
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF5F5] dark:bg-[#183641] text-[#2E7D7E] dark:text-[#2dd4bf] text-[11px] font-semibold mt-1 shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Consistent Routine</span>
              </div>
            </div>
          </div>

          {/* Card: Quick Actions */}
          <div className="bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-2xl p-4 shadow-sm space-y-2.5 shrink-0">
            <h3 className="text-xs font-bold text-[#1E2837] dark:text-white tracking-tight pb-2 border-b border-[#E3E8EE] dark:border-[#1c3345]">
              Quick Actions
            </h3>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('MedicationFrame')}
                className="w-full py-2.5 px-3.5 bg-[#2E7D7E] hover:bg-[#26696a] text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Medication</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate && onNavigate('IntakeFrame')}
                className="w-full py-2.5 px-3.5 bg-[#F3F6F9] dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] hover:border-[#2E7D7E] dark:hover:border-[#2dd4bf] text-[#1E2837] dark:text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4 text-[#2E7D7E] dark:text-[#2dd4bf]" />
                <span>View Schedule</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate && onNavigate('HistoryFrame')}
                className="w-full py-2.5 px-3.5 bg-[#F3F6F9] dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] hover:border-[#2E7D7E] dark:hover:border-[#2dd4bf] text-[#1E2837] dark:text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4 text-[#2E7D7E] dark:text-[#2dd4bf]" />
                <span>View Reports</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
