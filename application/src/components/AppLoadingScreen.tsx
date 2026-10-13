import React, { useState, useEffect } from 'react';
import { Pill } from 'lucide-react';

interface AppLoadingScreenProps {
  onFinish?: () => void;
}

export default function AppLoadingScreen({ onFinish }: AppLoadingScreenProps): React.JSX.Element {
  const [progress, setProgress] = useState<number>(0);
  const [fadingOut, setFadingOut] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            setFadingOut(true);
            setTimeout(() => {
              if (onFinish) onFinish();
            }, 300);
          }, 150);
          return 100;
        }
        return prev + 25;
      });
    }, 180);

    return () => clearInterval(timer);
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F3F6F9] dark:bg-[#0c1722] text-[#1E2837] dark:text-white select-none transition-opacity duration-300 ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg shadow-teal-500/20 mb-4 animate-bounce">
          <img
            src="/app_icon.png"
            alt="Smart Medication Scheduler"
            className="w-full h-full object-contain"
          />
        </div>

        <h1 className="text-base font-bold text-[#1E2837] dark:text-white tracking-tight">
          Smart Medication Scheduler
        </h1>
        <p className="text-xs text-[#8B9DA8] dark:text-[#859ba8] mt-0.5">
          Take your meds. Live healthier.
        </p>

        <div className="w-48 bg-[#E3E8EE] dark:bg-[#172838] rounded-full h-1.5 overflow-hidden mt-6 mb-2">
          <div
            className="h-full bg-[#2E7D7E] dark:bg-[#2dd4bf] transition-all duration-300 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        <span className="text-[11px] text-[#8B9DA8] dark:text-[#859ba8] font-medium">
          Loading application...
        </span>
      </div>
    </div>
  );
}
