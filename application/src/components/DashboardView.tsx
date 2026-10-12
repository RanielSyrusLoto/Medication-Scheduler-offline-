import React, { useEffect, useState } from 'react';
import { Pill, Calendar, Check, Clock, Plus, ArrowRight, FileText, CheckCircle2, AlertCircle, Repeat, Package } from 'lucide-react';
import { callApi } from '../utils/pywebview';
import { User, DashboardDataResponse, Schedule, HistoryLog, Medication } from '../types';
import { formatTimeWithAmPm, sortSchedulesByDeadline } from '../utils/timeFormat';

interface DashboardViewProps {
  user: User | null;
  onDataChange?: () => void;
  onNavigate?: (tab: string) => void;
}

export default function DashboardView({ user, onDataChange, onNavigate }: DashboardViewProps): React.JSX.Element {
  const [data, setData] = useState<DashboardDataResponse | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDashboard = async () => {
    if (!user?.user_id) return;
    setLoading(true);
    try {
      const [dashRes, schRes, medRes] = await Promise.all([
        callApi<DashboardDataResponse>('get_dashboard_data', user.user_id),
        callApi('get_schedules', user.user_id),
        callApi('get_medications', user.user_id)
      ]);

      if (dashRes && dashRes.success) {
        setData(dashRes as DashboardDataResponse);
      }
      if (schRes && schRes.success) {
        setSchedules(schRes.schedules || []);
      }
      if (medRes && medRes.success) {
        setMedications(medRes.medications || []);
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

  // Determine which schedules to show in "Today's Schedule" (Sorted with closest intake deadline first)
  const validSchedules = (schedules.length > 0 ? schedules : due_meds).filter((item) => {
    const matchingMed = medications.find((m) => m.med_id === item.med_id);
    const medName = item.med_name || (item as any).name || matchingMed?.name;
    return Boolean(medName && medName.trim());
  });
  const todayScheduleItems = sortSchedulesByDeadline(validSchedules);

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
                const resolveMedImage = (): string => {
                  const directPath = (item as any).image_path || matchingMed?.image_path;
                  if (directPath && directPath.startsWith('data:')) {
                    return directPath;
                  }
                  const nameClean = (medName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                  if (nameClean.includes('paracetamol') || nameClean.includes('biogesic')) return '/drug_images/paracetamol.jpg';
                  if (nameClean.includes('vitaminc') || (nameClean.includes('vitamin') && nameClean.includes('c')) || nameClean.includes('ascorbic')) return '/drug_images/vitaminc.jpg';
                  if (nameClean.includes('multivitamin') || nameClean.includes('centrum') || nameClean.includes('revicon')) return '/drug_images/multivitamin.jpg';
                  if (nameClean.includes('ibuprofen') || nameClean.includes('advil') || nameClean.includes('motrin')) return '/drug_images/ibuprofen.jpg';

                  if (directPath) {
                    if (directPath.startsWith('http') || directPath.startsWith('/')) {
                      return directPath;
                    }
                    return `/drug_images/${directPath.replace('/drug_images/', '')}`;
                  }
                  return `/drug_images/${nameClean}.png`;
                };

                const imgSrc = resolveMedImage();

                return (
                  <div
                    key={item.schedule_id || (item as any).med_id || idx}
                    className="rounded-2xl border border-[#b8cbd9] dark:border-[#2b4154] bg-gradient-to-r from-[#d0dfec]/85 via-[#e0ebf3]/75 to-[#edf3f7]/90 dark:from-[#1b2f40] dark:via-[#162736] dark:to-[#13222f] p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all flex flex-col gap-3 relative overflow-hidden group"
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

                    {/* Top Row: Picture + Drug Name + Strength Badge + Prescription ID (Left) & Time Pill + Check Button (Right) */}
                    <div className="flex items-center justify-between gap-3 relative z-1">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Drug Picture Squircle Container matching reference */}
                        <div className="w-12 h-12 min-w-[48px] min-h-[48px] max-w-[48px] max-h-[48px] aspect-square rounded-2xl overflow-hidden border border-[#bccddc] dark:border-[#2e4354] shrink-0 bg-white dark:bg-[#172838] p-0.5 flex items-center justify-center shadow-xs">
                          <img
                            src={imgSrc}
                            alt={medName}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/drug_images/paracetamol.jpg';
                            }}
                            className="w-full h-full object-cover rounded-xl"
                            style={{ width: '44px', height: '44px' }}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-extrabold text-[#112338] dark:text-white truncate tracking-tight">
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

                      {/* Right: Scheduled Time Pill & Check Mark Button (Mark as Taken) */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 dark:bg-[#172838] border border-[#c0d2e0] dark:border-[#2a3f52] text-xs font-semibold text-[#14324f] dark:text-white shadow-2xs">
                          <Clock className="w-3.5 h-3.5 text-[#14324f] dark:text-[#2dd4bf]" />
                          <span>{timeStr}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleTakeDose(item.med_id)}
                          title="Mark as Taken"
                          className="w-8 h-8 rounded-full border-2 border-[#2E7D7E] dark:border-[#2dd4bf] hover:bg-[#2E7D7E] dark:hover:bg-[#2dd4bf] hover:text-white text-[#2E7D7E] dark:text-[#2dd4bf] flex items-center justify-center transition-all shadow-xs shrink-0 bg-white/95 dark:bg-transparent"
                        >
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        </button>
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
          <div className="bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-2xl p-3.5 shadow-sm space-y-2 shrink-0">
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
          <div className="bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-2xl p-3 sm:p-4 shadow-sm relative overflow-hidden flex flex-col items-center text-center flex-1 min-h-0 justify-between">
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
    </div>
  );
}
