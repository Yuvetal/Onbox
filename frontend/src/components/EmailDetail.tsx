import React from 'react';
import { ArrowLeft, Star, Archive, Trash2, ChevronDown, Paperclip, Clock } from 'lucide-react';
import type { Email } from '../types';
import { Badge } from './Badge';

interface EmailDetailProps {
  email: Email;
  onBack: () => void;
}

export const EmailDetail: React.FC<EmailDetailProps> = ({ email, onBack }) => {
  const senderEmailStr = email.sender?.email || 'sender@onb.com';
  const senderInitial = senderEmailStr.charAt(0).toUpperCase();

  const formattedDate = new Date(email.scheduledAt || email.createdAt).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="flex-1 bg-white min-h-screen flex flex-col">
      {/* Header Toolbar */}
      <div className="h-16 px-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-20">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to List
        </button>

        <div className="flex items-center gap-1">
          <button className="p-2 text-gray-400 hover:text-amber-400 hover:bg-gray-100 rounded-full transition-colors">
            <Star className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
            <Archive className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-full transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto w-full p-8 space-y-8">
        {/* Subject Header & Status Badge */}
        <div className="space-y-3 pb-6 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900 leading-snug">{email.subject}</h1>
            <Badge status={email.status} scheduledAt={email.scheduledAt} rescheduleCount={email.rescheduleCount} />
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            <span>Scheduled for {formattedDate}</span>
            {email.delayBetweenEmails > 0 && (
              <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                {email.delayBetweenEmails}s delay
              </span>
            )}
            {email.hourlyLimit > 0 && (
              <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                {email.hourlyLimit} per hour max
              </span>
            )}
          </div>
        </div>

        {/* Sender Info Block */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              {senderInitial}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 text-sm">{senderEmailStr.split('@')[0]}</span>
                <span className="text-xs text-gray-400">&lt;{senderEmailStr}&gt;</span>
              </div>

              <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                <span>to {email.recipientEmail}</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </div>
            </div>
          </div>

          <span className="text-xs font-medium text-gray-400">{formattedDate}</span>
        </div>

        {/* Email Body Content */}
        <div className="prose max-w-none text-gray-800 text-sm leading-relaxed whitespace-pre-wrap space-y-4 pt-2">
          {email.body}
        </div>

        {/* Promotional / Highlighted Callout Box (Figma Yellow Box Style) */}
        <div className="bg-[#fefce8] border-l-4 border-[#eab308] p-4 rounded-r-xl shadow-sm text-yellow-950 space-y-1">
          <p className="text-xs font-semibold text-yellow-800 uppercase tracking-wider">Scheduled Delivery Guarantee</p>
          <p className="text-xs text-yellow-900">
            This email is queued in BullMQ (Job ID: <code className="font-mono text-yellow-800">{email.bullJobId || 'email-' + email.id}</code>).
            It will be delivered atomically via Ethereal SMTP with Redis rate limit protection.
          </p>
        </div>

        {/* Attachment Card Mockup matching Figma spec */}
        <div className="pt-6 border-t border-gray-100 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5" /> 1 Attachment
          </p>

          <div className="inline-flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl cursor-pointer transition-colors max-w-xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
              PDF
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-gray-900 truncate">hiring_assignment_spec.pdf</p>
              <p className="text-[11px] text-gray-500">245 KB</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
