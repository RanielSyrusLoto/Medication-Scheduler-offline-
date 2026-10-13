import React, { useEffect, useState } from 'react';
import { Check, CheckCircle2, Sparkles, X, Clock, Pill, Package, Award } from 'lucide-react';

export interface DoseSuccessData {
  medName: string;
  dosage?: string;
  timeTaken?: string;
  remainingStock?: number | string;
  stockUnit?: string;
}

interface DoseSuccessModalProps {
  data: DoseSuccessData | null;
  onClose: () => void;
}

/**
 * Plays a cheerful, gentle uplifting 3-note chime using Web Audio API.
 * Works 100% offline with zero external audio assets.
 */
function playChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const notes = [
      { freq: 523.25, time: 0.00, dur: 0.22 }, // C5
      { freq: 659.25, time: 0.12, dur: 0.22 }, // E5
      { freq: 783.99, time: 0.24, dur: 0.40 }, // G5
      { freq: 1046.50, time: 0.36, dur: 0.50 } // C6
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0.08, now + time);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + time);
      osc.stop(now + time + dur);
    });
  } catch (err) {
    // Audio context may be restricted by autoplay policy; suppress safely
  }
}

export default function DoseSuccessModal({ data, onClose }: DoseSuccessModalProps): React.JSX.Element | null {
  const [countdownPercent, setCountdownPercent] = useState<number>(100);

  useEffect(() => {
    if (!data) return;

    playChime();
    setCountdownPercent(100);

    const startTime = Date.now();
    const duration = 4000; // 4 seconds auto-dismiss

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPct = Math.max(0, 100 - (elapsed / duration) * 100);
      setCountdownPercent(remainingPct);

      if (elapsed >= duration) {
        clearInterval(interval);
        onClose();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [data, onClose]);

  if (!data) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      {/* Modal Dialog Card */}
      <div
        className="relative w-full max-w-md bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-3xl shadow-2xl p-6 overflow-hidden transition-all transform animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Confetti Decorative Sparkles / Floating Circles */}
        <div className="absolute top-2 left-6 text-amber-400 animate-bounce pointer-events-none text-xs">✨</div>
        <div className="absolute top-6 right-8 text-teal-400 animate-pulse pointer-events-none text-sm">🎉</div>
        <div className="absolute bottom-10 left-4 text-emerald-400 animate-pulse pointer-events-none text-sm">🌟</div>
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-[#8B9DA8] hover:text-[#1E2837] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1c3345] transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Center Animated Icon with Ripple */}
        <div className="flex flex-col items-center text-center mt-2">
          <div className="relative mb-4">
            {/* Outer Pulsing Glow */}
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 dark:bg-emerald-400/20 animate-ping opacity-75" />
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-[#0D9488] to-[#10B981] text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
          </div>

          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-[#0D9488] dark:text-[#2dd4bf] border border-emerald-200 dark:border-emerald-800/40 mb-2">
            <Sparkles className="w-3 h-3" />
            Dose Recorded
          </span>

          <h3 className="text-xl font-extrabold text-[#1E2837] dark:text-white tracking-tight">
            Dose Successfully Taken!
          </h3>
          <p className="text-xs text-[#8B9DA8] dark:text-[#859ba8] mt-1 max-w-xs">
            Your dose has been recorded and your medication inventory has been updated.
          </p>
        </div>

        {/* Medication Details Card */}
        <div className="mt-5 p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#172838] border border-[#E2E8F0] dark:border-[#223647] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-[#0D9488] dark:text-[#2dd4bf] flex items-center justify-center shrink-0">
                <Pill className="w-5 h-5 -rotate-45" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-[#1E2837] dark:text-white truncate">
                  {data.medName}
                </h4>
                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                  Amount: <span className="font-semibold text-[#0D9488] dark:text-[#2dd4bf]">{data.dosage || '1 dose'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs text-[#64748B] dark:text-[#94A3B8] font-medium shrink-0">
              <Clock className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>{data.timeTaken || 'Just now'}</span>
            </div>
          </div>

          {data.remainingStock !== undefined && (
            <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#223647] flex items-center justify-between text-xs">
              <span className="text-[#8B9DA8] dark:text-[#859ba8] flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                Remaining Inventory
              </span>
              <span className="font-bold text-[#1E2837] dark:text-white">
                {data.remainingStock} {data.stockUnit || 'tablets'}
              </span>
            </div>
          )}
        </div>

        {/* Motivational Tip */}
        <div className="mt-3.5 px-3.5 py-2.5 rounded-xl bg-teal-50/60 dark:bg-[#183641]/60 border border-teal-100 dark:border-teal-900/30 flex items-center gap-2.5 text-xs text-[#0D9488] dark:text-[#2dd4bf]">
          <Award className="w-4 h-4 shrink-0" />
          <p className="text-[11px] font-medium leading-relaxed">
            Great job! Staying consistent on time is key to your health and wellness.
          </p>
        </div>

        {/* Action Button */}
        <div className="mt-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-[#0D9488] to-[#10B981] hover:from-[#0b7c72] hover:to-[#0d9b6c] text-white font-bold text-xs rounded-xl shadow-md shadow-teal-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Awesome, Got it!</span>
          </button>
        </div>

        {/* Countdown Auto-Dismiss Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-[#1c2e3f] h-1 rounded-full overflow-hidden mt-4">
          <div
            className="h-full bg-[#0D9488] dark:bg-[#2dd4bf] transition-all duration-75 ease-linear rounded-full"
            style={{ width: `${countdownPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
