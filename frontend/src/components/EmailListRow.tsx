import React, { useState } from 'react';
import { Star } from 'lucide-react';
import type { Email } from '../types';
import { Badge } from './Badge';

interface EmailListRowProps {
  email: Email;
  onSelect: (email: Email) => void;
}

export const EmailListRow: React.FC<EmailListRowProps> = ({ email, onSelect }) => {
  const [starred, setStarred] = useState(false);

  const toggleStar = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStarred(!starred);
  };

  return (
    <div
      onClick={() => onSelect(email)}
      className="group px-6 py-4 border-b border-gray-100 hover:bg-gray-50/90 transition-colors cursor-pointer flex items-center justify-between gap-4 select-none"
    >
      {/* Left Column: Recipient & Badge */}
      <div className="flex items-center gap-4 min-w-[220px]">
        <div className="w-2 h-2 rounded-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div>
          <span className="text-xs font-semibold text-gray-500 block uppercase tracking-wider">
            To: {email.recipientEmail.split('@')[0]}
          </span>
          <span className="text-xs text-gray-400 font-mono truncate max-w-[160px] block">
            {email.recipientEmail}
          </span>
        </div>
      </div>

      {/* Center Column: Status Badge, Subject & Preview */}
      <div className="flex-1 flex items-center gap-4 overflow-hidden">
        <Badge
          status={email.status}
          scheduledAt={email.scheduledAt}
          rescheduleCount={email.rescheduleCount}
        />

        <div className="overflow-hidden flex-1">
          <span className="font-semibold text-sm text-gray-900 truncate block">
            {email.subject}
          </span>
          <span className="text-xs text-gray-500 truncate block">
            {email.body.replace(/<[^>]*>/g, '').substring(0, 90)}...
          </span>
        </div>
      </div>

      {/* Right Column: Star Icon */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleStar}
          className="p-1 text-gray-300 hover:text-amber-400 transition-colors rounded-full"
          title="Star email"
        >
          <Star className={`w-4 h-4 ${starred ? 'fill-amber-400 text-amber-400' : ''}`} />
        </button>
      </div>
    </div>
  );
};
