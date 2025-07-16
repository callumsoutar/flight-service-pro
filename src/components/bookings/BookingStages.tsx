
import React from 'react';
import clsx from 'clsx';

interface Stage {
  key: string;
  label: string;
}

interface BookingStagesProps {
  stages: Stage[];
  currentStage: number; // index of the current stage
}

export function BookingStages({ stages, currentStage }: BookingStagesProps) {
  return (
    <div className="w-full flex flex-row items-center justify-between gap-2 select-none" style={{height: 32}}>
      <div className="flex-1 flex flex-row items-center gap-0">
        {stages.map((stage, idx) => {
          const isActiveOrComplete = idx <= currentStage;
          const isCurrent = idx === currentStage;
          const isLast = idx === stages.length - 1;
          // Color logic
          let baseColor = '';
          let customBg = undefined;
          let borderClass = '';
          if (isActiveOrComplete) {
            baseColor = 'bg-violet-600 text-white';
            customBg = undefined;
            borderClass = '';
          } else {
            baseColor = 'bg-violet-200 text-violet-800';
            customBg = '#ddd6fe'; // Tailwind violet-200 hex
            borderClass = '';
          }
          // Add outline to current stage
          const outline = isCurrent ? 'border-violet-800 border-2' : 'border-none';
          // Chevron shape
          const chevronClip = !isLast
            ? 'polygon(0 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 0 100%, 16px 50%)'
            : 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 16px 50%)';
          return (
            <div
              key={stage.key}
              className={clsx(
                'relative flex items-center justify-center min-w-0 flex-1 h-full transition-colors duration-200',
                baseColor,
                outline,
                borderClass,
                idx === 0 && 'rounded-l-md',
                isLast && 'rounded-r-md',
                'px-0'
              )}
              style={{
                clipPath: chevronClip,
                zIndex: stages.length - idx,
                height: 32,
                backgroundColor: customBg,
              }}
            >
              <span className="truncate text-center w-full text-xs font-medium px-2 whitespace-nowrap">
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Centralized booking stages and status mapping
export const BOOKING_STAGES = [
  { key: 'briefing', label: 'Briefing' },
  { key: 'checkout', label: 'Check-out' },
  { key: 'flying', label: 'Flying' },
  { key: 'checkin', label: 'Check-in' },
  { key: 'debrief', label: 'Debrief' },
];

export const STATUS_TO_STAGE_IDX: Record<string, number> = {
  unconfirmed: 0,
  confirmed: 0,
  briefing: 0,
  checkout: 1,
  flying: 2,
  checkin: 3,
  complete: 4,
  debrief: 4,
}; 