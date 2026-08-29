import React from 'react';
import { Clock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import type { EmailStatus } from '../types';

interface BadgeProps {
  status: EmailStatus;
  scheduledAt?: string;
  rescheduleCount?: number;
}

/**
 * Formats ISO date string into Figma time badge style (e.g. "Tue 9:15:12 AM").
 */
export function formatBadgeTime(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  return `${dayName} ${timeStr}`;
}

export const Badge: React.FC<BadgeProps> = ({ status, scheduledAt, rescheduleCount = 0 }) => {
  if (status === 'SCHEDULED') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          {formatBadgeTime(scheduledAt)}
        </span>
        {rescheduleCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-800 border border-orange-200" title={`Rescheduled ${rescheduleCount} time(s) due to hourly limit`}>
            <RefreshCw className="w-2.5 h-2.5" />
            Rescheduled x{rescheduleCount}
          </span>
        )}
      </div>
    );
  }

  if (status === 'SENT') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-gray-500" />
        Sent
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
      <AlertCircle className="w-3.5 h-3.5 text-red-500" />
      Failed
    </span>
  );
};
