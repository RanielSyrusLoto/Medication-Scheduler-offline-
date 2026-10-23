import React, { useEffect, useState } from 'react';
import { Pill, Calendar, Check, Clock, Plus, ArrowRight, FileText, CheckCircle2, AlertCircle, Repeat, Package, Sun, Moon } from 'lucide-react';
import { callApi } from '../utils/pywebview';
import { User, DashboardDataResponse, Schedule, HistoryLog, Medication } from '../types';
import { formatTimeWithAmPm, sortSchedulesByDeadline, isScheduleTimeReached, isAmTime } from '../utils/timeFormat';
import { getMedicationImageUrl } from '../utils/imageHelper';

interface DashboardViewProps {
  user: User | null;
  onDataChange?: () => void;
  onNavigate?: (tab: string) => void;
  onAddMedication?: () => void;
  refreshKey?: number;
}

interface PendingDosePrompt {
  medId: number;
  medName: string;
  timeStr: string;
}

export default function DashboardView({ user, onDataChange, onNavigate, onAddMedication, refreshKey }: DashboardViewProps): React.JSX.Element {
  const [data, setData] = useState<DashboardDataResponse | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pendingDosePrompt, setPendingDosePrompt] = useState<PendingDosePrompt | null>(null);

interface ScheduleResponse {
  success: boolean;
  schedules?: Schedule[];
}

interface MedicationResponse {
  success: boolean;
  medications?: Medication[];
}

const fetchDashboard = async () => {
  if (!user?.user_id) return;
  setLoading(true);

  try {
    const [dashRes, schRes, medRes] = await Promise.allSettled([
      callApi<DashboardDataResponse>('get_dashboard_data', user.user_id),
      callApi<ScheduleResponse>('get_schedules', user.user_id),
      callApi<MedicationResponse>('get_medications', user.user_id)
    ]);

    if (dashRes.status === 'fulfilled') {
      if (dashRes.value.success) {
        setData(dashRes.value);
      } else {
        console.error('Failed fetching dashboard data', dashRes.value.error || dashRes.value.message);
      }
    } else {
      console.error('Failed fetching dashboard data', dashRes.reason);
    }

    if (schRes.status === 'fulfilled') {
      if (schRes.value.success) {
        setSchedules(schRes.value.schedules || []);
      } else {
        console.error('Failed fetching schedules', schRes.value.error || schRes.value.message);
      }
    } else {
      console.error('Failed fetching schedules', schRes.reason);
    }

    if (medRes.status === 'fulfilled') {
      if (medRes.value.success) {
        setMedications(medRes.value.medications || []);
      } else {
        console.error('Failed fetching medications', medRes.value.error || medRes.value.message);
      }
    } else {
      console.error('Failed fetching medications', medRes.reason);
    }
  } catch (e) {
    console.error('Failed fetching dashboard info', e);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchDashboard();
  }, [user, refreshKey]);

  const executeTakeDose = async (medId: number) => {
    if (!user?.user_id) return;
    const res = await callApi('take_dose', user.user_id, medId);
    if (res.success) {
      const med = medications.find((m) => m.med_id === medId);
      const sch = schedules.find((s) => s.med_id === medId);
      const medName = med?.name || sch?.med_name || 'Medication';
      const dosage = sch ? `${sch.dose_per_intake || 1} ${sch.dose_unit || 'tablet'}` : (med?.dosage_form || '1 tablet');
      const remaining = med ? Math.max(0, med.stock - (sch?.dose_per_intake ? Number(sch.dose_per_intake) : 1)) : undefined;

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const imgSrc = getMedicationImageUrl(medName, (sch as any)?.image_path || med?.image_path);

      window.dispatchEvent(
        new CustomEvent('dose-taken-success', {
          detail: {
            medName,
            dosage,
            timeTaken: formatTimeWithAmPm(timeStr),
            remainingStock: remaining,
            stockUnit: med?.stock_unit || 'tablets',
            imageUrl: imgSrc
          }
        })
      );

      fetchDashboard();
      if (onDataChange) onDataChange();
    }
  };

  const handleTakeDose = (item: any, medName: string, timeStr: string) => {
    const isTime = isScheduleTimeReached(item.time_value, item.schedule_date, item.start_date);
    if (isTime) {
      // It's time or past due: take immediately
      executeTakeDose(item.med_id);
    } else {
      // Not time yet: ask for confirmation
      setPendingDosePrompt({
        medId: item.med_id,
        medName,
        timeStr,
      });
    }
  };

  const confirmTakeEarlyDose = () => {
    if (!pendingDosePrompt) return;
    const medId = pendingDosePrompt.medId;
    setPendingDosePrompt(null);
    executeTakeDose(medId);
  };

  const {
    total_meds = 0,
    doses_taken = 0,
    due_meds = [],
    recent_history = []
  } = data || {};

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Determine which schedules to show in "Today's Schedule" (Sorted with closest intake deadline first)
  const validSchedules = (schedules.length > 0 ? schedules : due_meds).filter((item) => {
    const matchingMed = medications.find((m) => m.med_id === item.med_id);
    const medName = item.med_name || (item as any).name || matchingMed?.name;
    if (!medName || !medName.trim()) return false;

    // Check if active today
    const start = (item.start_date || item.schedule_date || '').trim();
    const end = (item.end_date || '').trim();
    if (start && start > todayStr) return false;
    if (end && end < todayStr) return false;
    return true;
  });
  const todayScheduleItems = sortSchedulesByDeadline(validSchedules, data?.today_logs);

  // Compute stats for the 4 top cards
  const totalDosesToday = validSchedules.length > 0 ? validSchedules.length : (due_meds.length + doses_taken);
  const takenCount = doses_taken > 0 ? doses_taken : 0;
  const upcomingCount = Math.max(0, due_meds.length > 0 ? due_meds.length : (totalDosesToday - takenCount));

  const colorPalettes = [
    { circle: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/30' },
    { circle: 'bg-teal-100 dark:bg-teal-500/20 text-[#2E7D7E] dark:text-[#2dd4bf]', border: 'border-teal-200 dark:border-teal-500/30' },
    { circle: 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-500/30' },
    { circle: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/30' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-7 flex flex-col h-full overflow-hidden transition-colors duration-200 gap-4 sm:gap-5">
      {/* 1. TOP SECTION: 4 Summary Stat Cards matching reference design */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Total Medications */}
        <div
          onClick={onAddMedication}
          className="glass-surface relative overflow-hidden rounded-2xl bg-white/75 dark:bg-[#13222f]/75 border border-white/80 dark:border-white/10 p-4 sm:p-4.5 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-3.5 cursor-pointer group select-none"
        >
          {/* Bottom-right decorative curved wave accent */}
          <svg
            className="absolute bottom-0 right-0 z-0 w-36 sm:w-44 h-9 pointer-events-none select-none text-[#E0F2FE]/85 dark:text-[#0284C7]/15"
            viewBox="0 0 180 40"
            fill="none"
            preserveAspectRatio="none"
          >
            <path d="M0 40 C60 40 100 15 180 2 L180 40 Z" fill="currentColor" />
          </svg>

          {/* Left: Circular Icon Avatar */}
          <div className="relative z-10 w-12 h-12 rounded-full bg-[#E0F2FE] dark:bg-[#0c2a42] flex items-center justify-center shrink-0">
            <Pill className="w-5 h-5 -rotate-45 text-[#0284C7] dark:text-[#38BDF8]" />
          </div>

          {/* Center: Number & Label */}
          <div className="relative z-10 min-w-0 flex-1">
            <h3 className="text-xl sm:text-2xl font-black text-[#0F2942] dark:text-white tracking-tight leading-none">
              {total_meds}
            </h3>
            <p className="text-xs font-semibold text-[#7C8F9F] dark:text-[#88A2B6] truncate mt-1">
              Total Medications
            </p>
          </div>

          {/* Right: Sleek Arrow */}
          <ArrowRight className="relative z-10 w-4 h-4 text-[#38BDF8] dark:text-[#38BDF8] ml-auto shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
        </div>

        {/* Card 2: Today's Doses */}
        <div
          onClick={() => onNavigate && onNavigate('IntakeFrame')}
          className="glass-surface relative overflow-hidden rounded-2xl bg-white/75 dark:bg-[#13222f]/75 border border-white/80 dark:border-white/10 p-4 sm:p-4.5 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-3.5 cursor-pointer group select-none"
        >
          {/* Bottom-right decorative curved wave accent */}
          <svg
            className="absolute bottom-0 right-0 z-0 w-36 sm:w-44 h-9 pointer-events-none select-none text-[#CCFBF1]/85 dark:text-[#0D9488]/15"
            viewBox="0 0 180 40"
            fill="none"
            preserveAspectRatio="none"
          >
            <path d="M0 40 C60 40 100 15 180 2 L180 40 Z" fill="currentColor" />
          </svg>

          {/* Left: Circular Icon Avatar */}
          <div className="relative z-10 w-12 h-12 rounded-full bg-[#CCFBF1] dark:bg-[#0c3332] flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-[#0D9488] dark:text-[#2DD4BF]" />
          </div>

          {/* Center: Number & Label */}
          <div className="relative z-10 min-w-0 flex-1">
            <h3 className="text-xl sm:text-2xl font-black text-[#0F2942] dark:text-white tracking-tight leading-none">
              {totalDosesToday}
            </h3>
            <p className="text-xs font-semibold text-[#7C8F9F] dark:text-[#88A2B6] truncate mt-1">
              Today's Doses
            </p>
          </div>

          {/* Right: Sleek Arrow */}
          <ArrowRight className="relative z-10 w-4 h-4 text-[#2DD4BF] dark:text-[#2DD4BF] ml-auto shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
        </div>

        {/* Card 3: Taken */}
        <div
          onClick={() => onNavigate && onNavigate('HistoryFrame')}
          className="glass-surface relative overflow-hidden rounded-2xl bg-white/75 dark:bg-[#13222f]/75 border border-white/80 dark:border-white/10 p-4 sm:p-4.5 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-3.5 cursor-pointer group select-none"
        >
          {/* Bottom-right decorative curved wave accent */}
          <svg
            className="absolute bottom-0 right-0 z-0 w-36 sm:w-44 h-9 pointer-events-none select-none text-[#DCFCE7]/85 dark:text-[#16A34A]/15"
            viewBox="0 0 180 40"
            fill="none"
            preserveAspectRatio="none"
          >
            <path d="M0 40 C60 40 100 15 180 2 L180 40 Z" fill="currentColor" />
          </svg>

          {/* Left: Circular Icon Avatar */}
          <div className="relative z-10 w-12 h-12 rounded-full bg-[#DCFCE7] dark:bg-[#0e3522] flex items-center justify-center shrink-0">
            <Check className="w-5 h-5 stroke-[2.5] text-[#16A34A] dark:text-[#4ADE80]" />
          </div>

          {/* Center: Number & Label */}
          <div className="relative z-10 min-w-0 flex-1">
            <h3 className="text-xl sm:text-2xl font-black text-[#0F2942] dark:text-white tracking-tight leading-none">
              {takenCount}
            </h3>
            <p className="text-xs font-semibold text-[#7C8F9F] dark:text-[#88A2B6] truncate mt-1">
              Taken
            </p>
          </div>

          {/* Right: Sleek Arrow */}
          <ArrowRight className="relative z-10 w-4 h-4 text-[#4ADE80] dark:text-[#4ADE80] ml-auto shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
        </div>

        {/* Card 4: Upcoming */}
        <div
          onClick={() => onNavigate && onNavigate('IntakeFrame')}
          className="glass-surface relative overflow-hidden rounded-2xl bg-white/75 dark:bg-[#13222f]/75 border border-white/80 dark:border-white/10 p-4 sm:p-4.5 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-3.5 cursor-pointer group select-none"
        >
          {/* Bottom-right decorative curved wave accent */}
          <svg
            className="absolute bottom-0 right-0 z-0 w-36 sm:w-44 h-9 pointer-events-none select-none text-[#FEF3C7]/85 dark:text-[#D97706]/15"
            viewBox="0 0 180 40"
            fill="none"
            preserveAspectRatio="none"
          >
            <path d="M0 40 C60 40 100 15 180 2 L180 40 Z" fill="currentColor" />
          </svg>

          {/* Left: Circular Icon Avatar */}
          <div className="relative z-10 w-12 h-12 rounded-full bg-[#FEF3C7] dark:bg-[#382b0e] flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-[#D97706] dark:text-[#FBBF24]" />
          </div>

          {/* Center: Number & Label */}
          <div className="relative z-10 min-w-0 flex-1">
            <h3 className="text-xl sm:text-2xl font-black text-[#0F2942] dark:text-white tracking-tight leading-none">
              {upcomingCount}
            </h3>
            <p className="text-xs font-semibold text-[#7C8F9F] dark:text-[#88A2B6] truncate mt-1">
              Upcoming
            </p>
          </div>

          {/* Right: Sleek Arrow */}
          <ArrowRight className="relative z-10 w-4 h-4 text-[#FBBF24] dark:text-[#FBBF24] ml-auto shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
        </div>
      </div>

      {/* 2. BOTTOM SECTION: Fully Responsive Desktop Layout */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 items-stretch overflow-hidden">
        {/* Left Column: Today's Schedule Card (ONLY internal items list scrolls) */}
        <div className="glass-surface md:col-span-7 xl:col-span-7 2xl:col-span-8 bg-white/75 dark:bg-[#13222f]/75 border border-white/80 dark:border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col h-full overflow-hidden">
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
                const matchingMed = medications.find((m) => m.med_id === item.med_id);
                const medName = item.med_name || (item as any).name || matchingMed?.name || 'Medication';
                const strength = item.strength || (item as any).dosage || matchingMed?.strength || matchingMed?.dosage || '10mg';
                const prescriptionId = item.med_id || matchingMed?.med_id || 801;
                const timeStr = item.time_value ? formatTimeWithAmPm(item.time_value) : '08:00 AM';
                const takeCount = item.dose_per_intake || 1;
                const takeUnit = item.dose_unit || matchingMed?.stock_unit || 'tablet';
                const repeat = item.frequency || 'Every day';
                const stockRemaining = item.stock ?? matchingMed?.stock ?? 0;
                const stockUnit = item.stock_unit || matchingMed?.stock_unit || 'tablets';

                // Resolve drug picture linked to medication
                const imgSrc = getMedicationImageUrl(medName, (item as any).image_path || matchingMed?.image_path);
                const isAm = isAmTime(item.time_value || timeStr);
                const todayLog = (data?.today_logs || []).find((l) => l.med_id === item.med_id);
                const todayStatus = item.today_status || todayLog?.status;

                return (
                  <div
                    key={item.schedule_id || (item as any).med_id || idx}
                    className="glass-surface rounded-2xl border border-white/70 dark:border-white/10 bg-gradient-to-r from-[#d0dfec]/70 via-[#e0ebf3]/60 to-[#edf3f7]/75 dark:from-[#1b2f40]/75 dark:via-[#162736]/70 dark:to-[#13222f]/70 p-3.5 sm:p-4 hover:shadow-md transition-all flex flex-col gap-3 relative overflow-hidden group"
                  >
                    {/* Subtle medical cross & DNA helix watermark matching reference */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-30 select-none">
                      <svg
                        className="w-64 h-28 text-[#487394]/20 dark:text-[#6597be]/15"
                        viewBox="0 0 240 100"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        {/* Medical Cross */}
                        <path d="M100,20 h25 v25 h25 v25 h-25 v25 h-25 v-25 h-25 v-25 h25 z" />
                        {/* DNA Helix */}
                        <path d="M160,22 Q180,50 200,22 T240,22" strokeDasharray="3 3" />
                        <path d="M160,78 Q180,50 200,78 T240,78" strokeDasharray="3 3" />
                        <line x1="170" y1="34" x2="170" y2="66" />
                        <line x1="190" y1="34" x2="190" y2="66" />
                        <line x1="210" y1="34" x2="210" y2="66" />
                        <line x1="230" y1="34" x2="230" y2="66" />
                      </svg>
                    </div>

                    {/* Top Row: Scheduled Time Pill (Left) & Check Mark Button or Status Badge (Right) */}
                    <div className="flex items-center justify-between gap-2 relative z-1">
                      <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/95 dark:bg-[#172838] border border-[#c0d2e0] dark:border-[#2a3f52] text-xs font-semibold text-[#14324f] dark:text-white shadow-2xs whitespace-nowrap shrink-0">
                        {isAm ? (
                          <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        ) : (
                          <Moon className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                        )}
                        <span>{timeStr}</span>
                      </div>

                      {todayStatus === 'TAKEN' ? (
                        <div className="flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 text-xs font-bold text-emerald-700 dark:text-emerald-300 shadow-2xs shrink-0 whitespace-nowrap">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Taken</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {todayStatus === 'MISSED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-[11px] font-bold text-rose-600 dark:text-rose-400 shadow-2xs whitespace-nowrap">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                              <span>Missed</span>
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleTakeDose(item, medName, timeStr)}
                            title={todayStatus === 'MISSED' ? "Take Missed Dose" : "Mark as Taken"}
                            className="w-8 h-8 rounded-full border-2 border-[#2E7D7E] dark:border-[#2dd4bf] hover:bg-[#2E7D7E] dark:hover:bg-[#2dd4bf] hover:text-white text-[#2E7D7E] dark:text-[#2dd4bf] flex items-center justify-center transition-all shadow-xs shrink-0 bg-white/95 dark:bg-transparent"
                          >
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Middle Row: Drug Picture + Drug Name + Strength Badge + Prescription ID (Full width, never cut off or squished) */}
                    <div className="flex items-center gap-3 relative z-1">
                      {/* Drug Picture Squircle Container matching reference */}
                      <div className="w-11 h-11 min-w-[44px] min-h-[44px] max-w-[44px] max-h-[44px] aspect-square rounded-2xl overflow-hidden border border-[#bccddc] dark:border-[#2e4354] shrink-0 bg-white dark:bg-[#172838] p-0.5 flex items-center justify-center shadow-xs">
                        <img
                          src={imgSrc}
                          alt={medName}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/drug_images/paracetamol.jpg';
                          }}
                          className="w-full h-full object-cover rounded-xl"
                          style={{ width: '40px', height: '40px' }}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-extrabold text-[#112338] dark:text-white tracking-tight">
                            {medName}
                          </h4>
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#bcd6ed] dark:border-[#2c5375] text-[#1b6194] dark:text-[#88bfe8] bg-[#e3eef8] dark:bg-[#1b344e] shrink-0">
                            {strength}
                          </span>
                        </div>
                        <span className="text-xs text-[#5e788e] dark:text-[#8ea5b6] block mt-0.5 font-medium">
                          Prescription ID #{prescriptionId}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: 3 Capsule Badges (Take, Repeat, Stock) matching reference */}
                    <div className="flex items-center gap-2 flex-wrap pt-0.5 relative z-1">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#c0d2e0] dark:border-[#385166] bg-white/95 dark:bg-white/5 text-xs font-medium text-[#14324f] dark:text-[#c5d9e8] shadow-2xs">
                        <Pill className="w-3.5 h-3.5 text-[#1b6194] dark:text-[#9bc2db] -rotate-45" />
                        <span>Take: {takeCount} {takeUnit}</span>
                      </div>

                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#c0d2e0] dark:border-[#385166] bg-white/95 dark:bg-white/5 text-xs font-medium text-[#14324f] dark:text-[#c5d9e8] shadow-2xs">
                        <Repeat className="w-3.5 h-3.5 text-[#1b6194] dark:text-[#9bc2db]" />
                        <span>Repeat: {repeat}</span>
                      </div>

                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#c0d2e0] dark:border-[#385166] bg-white/95 dark:bg-white/5 text-xs font-medium text-[#14324f] dark:text-[#c5d9e8] shadow-2xs">
                        <Package className="w-3.5 h-3.5 text-[#1b6194] dark:text-[#9bc2db]" />
                        <span>Stock: {stockRemaining} {stockUnit}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Quick Actions & Stay on Track (Responsive Desktop Layout, Non-Scrollable) */}
        <div className="md:col-span-5 xl:col-span-5 2xl:col-span-4 flex flex-col gap-3 shrink-0 h-full overflow-hidden">
          {/* Card: Quick Actions */}
          <div className="glass-surface bg-white/75 dark:bg-[#13222f]/75 border border-white/80 dark:border-white/10 rounded-2xl p-3.5 space-y-2 shrink-0">
            <h3 className="text-xs font-bold text-[#1E2837] dark:text-white tracking-tight pb-1.5 border-b border-[#E3E8EE] dark:border-[#1c3345]">
              Quick Actions
            </h3>

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('MedicationFrame')}
                className="w-full py-2 px-3.5 bg-[#2E7D7E] hover:bg-[#26696a] text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Medication</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate && onNavigate('IntakeFrame')}
                className="w-full py-2 px-3.5 bg-[#F3F6F9] dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] hover:border-[#2E7D7E] dark:hover:border-[#2dd4bf] text-[#1E2837] dark:text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4 text-[#2E7D7E] dark:text-[#2dd4bf]" />
                <span>View Schedule</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate && onNavigate('HistoryFrame')}
                className="w-full py-2 px-3.5 bg-[#F3F6F9] dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] hover:border-[#2E7D7E] dark:hover:border-[#2dd4bf] text-[#1E2837] dark:text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4 text-[#2E7D7E] dark:text-[#2dd4bf]" />
                <span>View Reports</span>
              </button>
            </div>
          </div>

          {/* Card: Stay on Track! (Fits naturally without overflow/scroll) */}
          <div className="glass-surface bg-white/75 dark:bg-[#13222f]/75 border border-white/80 dark:border-white/10 rounded-2xl p-3 sm:p-4 relative overflow-hidden flex flex-col items-center text-center flex-1 min-h-0 justify-between">
            {/* PICTURE DISPLAY */}
            <div className="w-full flex-1 min-h-0 flex items-center justify-center p-2 mb-2 bg-gradient-to-b from-[#2E7D7E]/5 via-[#2E7D7E]/2 to-transparent dark:from-[#2dd4bf]/10 dark:via-[#2dd4bf]/5 dark:to-transparent rounded-2xl border border-[#2E7D7E]/10 dark:border-[#2dd4bf]/10 overflow-hidden">
              <img
                src="/assets/stay_on_track_art.jpg"
                alt="Health reminder illustration"
                className="w-full h-full max-h-[180px] sm:max-h-[220px] lg:max-h-[260px] aspect-square object-contain rounded-2xl drop-shadow-xl hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="shrink-0 space-y-0.5">
              <h3 className="text-sm sm:text-base font-bold text-[#1E2837] dark:text-white tracking-tight">
                Stay on track!
              </h3>
              <p className="text-[11px] sm:text-xs text-[#8B9DA8] dark:text-[#859ba8] leading-relaxed max-w-[280px] mx-auto">
                Your health matters. Keep taking your medications on time.
              </p>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EBF5F5] dark:bg-[#183641] text-[#2E7D7E] dark:text-[#2dd4bf] text-[10px] font-semibold mt-1 shadow-xs">
                <CheckCircle2 className="w-3 h-3" />
                <span>Consistent Routine</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Early Dose Confirmation Modal */}
      {pendingDosePrompt && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm sm:max-w-md bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm text-[#1E2837] dark:text-white">
                  Not Scheduled Time Yet
                </h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1 leading-relaxed">
                  Are you sure you want to take <span className="font-bold text-[#1E2837] dark:text-white">{pendingDosePrompt.medName}</span>? It's not time yet.
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#F8FAFC] dark:bg-[#172838] border border-[#E2E8F0] dark:border-[#1F364B] rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-[#475569] dark:text-[#94A3B8]">
                <Clock className="w-3.5 h-3.5 text-[#2E7D7E] dark:text-[#2dd4bf]" />
                <span>Scheduled Time:</span>
              </div>
              <span className="font-bold text-[#1E2837] dark:text-white bg-white dark:bg-[#1E3347] px-2.5 py-0.5 rounded-lg border border-[#CBD5E1] dark:border-[#2A455C]">
                {pendingDosePrompt.timeStr}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E3E8EE] dark:border-[#1c3345]">
              <button
                type="button"
                onClick={() => setPendingDosePrompt(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#1A2D3E] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmTakeEarlyDose}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#2E7D7E] hover:bg-[#26696a] text-white shadow-sm transition-all flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Yes, Take Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
