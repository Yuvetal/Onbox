import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Paperclip,
  Clock,
  Send,
  Upload,
  X,
  Calendar,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import type { Sender } from '../types';
import { sendersApi, scheduleApi } from '../services/api';

interface ComposePageProps {
  onBack: () => void;
  onSuccess: (message: string) => void;
  onError: (error: string) => void;
}

export const ComposePage: React.FC<ComposePageProps> = ({ onBack, onSuccess, onError }) => {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState<string>('');
  
  // Recipient tag chips state
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState('');
  
  // Email form content state
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [delayBetweenEmails, setDelayBetweenEmails] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(10);
  
  // Scheduling popover state
  const [showSendLaterModal, setShowSendLaterModal] = useState(false);
  const [scheduledTime, setScheduledTime] = useState<string>('');
  
  // Attachments state
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  
  const [submitting, setSubmitting] = useState(false);

  // Fetch senders list on mount
  useEffect(() => {
    sendersApi
      .list()
      .then((res) => {
        setSenders(res.data);
        if (res.data.length > 0) {
          setSelectedSenderId(res.data[0].id);
        }
      })
      .catch(() => {
        // Fallback default sender
      });
  }, []);

  // Handle adding recipient email tag chips
  const handleAddRecipient = (emailStr: string) => {
    const trimmed = emailStr.trim().toLowerCase();
    if (!trimmed) return;
    if (recipients.includes(trimmed)) return;
    setRecipients([...recipients, trimmed]);
    setRecipientInput('');
  };

  const handleKeyDownRecipient = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      handleAddRecipient(recipientInput);
    }
  };

  const handleRemoveRecipient = (emailToRemove: string) => {
    setRecipients(recipients.filter((r) => r !== emailToRemove));
  };

  // Client-side CSV / Text recipient parser
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Extract emails using regex
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const matches = text.match(emailRegex) || [];
      
      const newRecipients = Array.from(new Set([...recipients, ...matches]));
      setRecipients(newRecipients);
      onSuccess(`Loaded ${matches.length} recipient email(s) from ${file.name}`);
    };
    reader.readAsText(file);
  };

  // Attachment upload handler
  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setAttachments([...attachments, ...filesArray]);
    }
  };

  // Quick Pick preset buttons for Send Later modal
  const applyPresetTime = (preset: 'tomorrow_morning' | 'tomorrow_10' | 'tomorrow_11' | 'tomorrow_3') => {
    const date = new Date();
    date.setDate(date.getDate() + 1);

    if (preset === 'tomorrow_morning' || preset === 'tomorrow_10') {
      date.setHours(10, 0, 0, 0);
    } else if (preset === 'tomorrow_11') {
      date.setHours(11, 0, 0, 0);
    } else if (preset === 'tomorrow_3') {
      date.setHours(15, 0, 0, 0);
    }

    // Format to datetime-local input string: YYYY-MM-DDTHH:mm
    const isoString = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    setScheduledTime(isoString);
  };

  // Submit Schedule Email Request
  const handleSubmit = async () => {
    // Add leftover input if user typed an email without pressing enter
    let finalRecipients = [...recipients];
    if (recipientInput.trim()) {
      const trimmed = recipientInput.trim().toLowerCase();
      if (!finalRecipients.includes(trimmed)) {
        finalRecipients.push(trimmed);
      }
    }

    if (finalRecipients.length === 0) {
      onError('Please enter at least one recipient email address.');
      return;
    }

    if (!subject.trim()) {
      onError('Please enter an email subject.');
      return;
    }

    if (!body.trim()) {
      onError('Please enter email body content.');
      return;
    }

    setSubmitting(true);

    try {
      const selectedSender = senders.find((s) => s.id === selectedSenderId);

      const payload = {
        subject,
        body,
        recipients: finalRecipients,
        senderId: selectedSenderId || undefined,
        senderEmail: selectedSender?.email || undefined,
        startTime: scheduledTime ? new Date(scheduledTime).toISOString() : new Date().toISOString(),
        delayBetweenEmails: Number(delayBetweenEmails) || 0,
        hourlyLimit: Number(hourlyLimit) || 10,
      };

      const res = await scheduleApi.create(payload);
      onSuccess(`Successfully scheduled ${res.count} email(s)!`);
      onBack();
    } catch (err: any) {
      onError(err.message || 'Failed to schedule emails');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 bg-white min-h-screen flex flex-col">
      {/* Top Navigation Bar */}
      <header className="h-16 px-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-30">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Compose New Email
        </button>

        {/* Right Toolbar Icons & Send Button */}
        <div className="flex items-center gap-3">
          {/* File Attachment Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`p-2 rounded-full transition-colors relative ${
              attachments.length > 0
                ? 'bg-emerald-50 text-[#0f9f59] border border-emerald-200'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
            {attachments.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#0f9f59] text-white text-[10px] font-bold flex items-center justify-center">
                {attachments.length}
              </span>
            )}
          </button>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAttachmentUpload}
            multiple
            className="hidden"
          />

          {/* Clock Icon (Send Later Popover Trigger) */}
          <div className="relative">
            <button
              onClick={() => setShowSendLaterModal(!showSendLaterModal)}
              className={`p-2 rounded-full transition-colors flex items-center gap-1.5 text-xs font-semibold ${
                scheduledTime
                  ? 'bg-amber-50 text-amber-700 border border-amber-300'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              title="Schedule time (Send Later)"
            >
              <Clock className="w-4 h-4" />
              {scheduledTime && (
                <span>
                  {new Date(scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </button>

            {/* Send Later Popover Modal matching Figma */}
            {showSendLaterModal && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl p-5 z-50 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#0f9f59]" />
                    Send Later
                  </h3>
                  <button
                    onClick={() => setShowSendLaterModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-600 block">Pick date & time</label>
                  <input
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:border-[#0f9f59] focus:outline-none focus:ring-1 focus:ring-[#0f9f59]"
                  />
                </div>

                {/* Quick Pick Preset Buttons */}
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Quick Presets</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => applyPresetTime('tomorrow_10')}
                      className="text-xs text-left px-2.5 py-1.5 bg-gray-50 hover:bg-emerald-50 hover:text-[#0f9f59] rounded-lg border border-gray-200 font-medium transition-colors"
                    >
                      Tomorrow 10:00 AM
                    </button>
                    <button
                      onClick={() => applyPresetTime('tomorrow_11')}
                      className="text-xs text-left px-2.5 py-1.5 bg-gray-50 hover:bg-emerald-50 hover:text-[#0f9f59] rounded-lg border border-gray-200 font-medium transition-colors"
                    >
                      Tomorrow 11:00 AM
                    </button>
                    <button
                      onClick={() => applyPresetTime('tomorrow_3')}
                      className="text-xs text-left px-2.5 py-1.5 bg-gray-50 hover:bg-emerald-50 hover:text-[#0f9f59] rounded-lg border border-gray-200 font-medium transition-colors"
                    >
                      Tomorrow 3:00 PM
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setScheduledTime('');
                      setShowSendLaterModal(false);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setShowSendLaterModal(false)}
                    className="px-4 py-1.5 text-xs font-semibold bg-[#0f9f59] text-white rounded-full hover:bg-emerald-700 shadow-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Main CTA Button: Send or Send Later */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2 rounded-full bg-[#0f9f59] hover:bg-emerald-700 text-white font-semibold text-sm transition-all shadow-md shadow-emerald-900/10 active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? (
              <span>Scheduling...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{scheduledTime ? 'Send Later' : 'Send'}</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Form Fields Container */}
      <div className="max-w-4xl mx-auto w-full p-8 space-y-6 flex-1">
        {/* From Dropdown */}
        <div className="flex items-center gap-4 pb-3 border-b border-gray-200">
          <label className="w-20 text-xs font-bold text-gray-400 uppercase tracking-wider">From:</label>
          <select
            value={selectedSenderId}
            onChange={(e) => setSelectedSenderId(e.target.value)}
            className="flex-1 bg-transparent text-sm font-semibold text-gray-900 focus:outline-none cursor-pointer"
          >
            {senders.map((s) => (
              <option key={s.id} value={s.id}>
                {s.email}
              </option>
            ))}
          </select>
        </div>

        {/* To Recipient Tag Input + CSV Parser Link */}
        <div className="pb-3 border-b border-gray-200 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">To:</label>
            
            {/* Upload CSV Link */}
            <button
              onClick={() => csvInputRef.current?.click()}
              className="flex items-center gap-1 text-xs font-semibold text-[#0f9f59] hover:text-emerald-700 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload List (CSV/TXT)
            </button>
            <input
              type="file"
              ref={csvInputRef}
              accept=".csv,.txt"
              onChange={handleCsvUpload}
              className="hidden"
            />
          </div>

          {/* Recipient Tag Chips Container */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {recipients.map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#e6f4ea] text-[#0f9f59] border border-[#bbf7d0]"
              >
                {email}
                <button
                  type="button"
                  onClick={() => handleRemoveRecipient(email)}
                  className="hover:text-red-500 rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            <input
              type="email"
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              onKeyDown={handleKeyDownRecipient}
              onBlur={() => handleAddRecipient(recipientInput)}
              placeholder={recipients.length === 0 ? "Type recipient email and press enter..." : "Add another..."}
              className="flex-1 min-w-[200px] bg-transparent text-sm text-gray-900 focus:outline-none placeholder-gray-400 py-1"
            />
          </div>
        </div>

        {/* Side-by-side numeric inputs: Delay between emails & Hourly limit */}
        <div className="grid grid-cols-2 gap-6 pb-3 border-b border-gray-200">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
              Delay between 2 emails (seconds)
            </label>
            <input
              type="number"
              min="0"
              value={delayBetweenEmails}
              onChange={(e) => setDelayBetweenEmails(Number(e.target.value))}
              placeholder="00"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-sm font-semibold text-gray-900 focus:bg-white focus:border-[#0f9f59] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
              Hourly Limit (max per sender)
            </label>
            <input
              type="number"
              min="1"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(Number(e.target.value))}
              placeholder="00"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-sm font-semibold text-gray-900 focus:bg-white focus:border-[#0f9f59] focus:outline-none"
            />
          </div>
        </div>

        {/* Subject Input */}
        <div className="pb-3 border-b border-gray-200">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full bg-transparent text-lg font-bold text-gray-900 focus:outline-none placeholder-gray-400"
          />
        </div>

        {/* Rich Text Editor Formatting Toolbar matching Figma */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col flex-1 min-h-[340px]">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center gap-1 text-gray-600 select-none">
            <button type="button" className="p-1.5 hover:bg-gray-200 rounded transition-colors" title="Undo"><Undo className="w-4 h-4" /></button>
            <button type="button" className="p-1.5 hover:bg-gray-200 rounded transition-colors" title="Redo"><Redo className="w-4 h-4" /></button>
            <div className="w-px h-4 bg-gray-300 mx-1" />
            <button type="button" className="p-1.5 hover:bg-gray-200 rounded font-bold text-xs" title="Font Size">Aa</button>
            <div className="w-px h-4 bg-gray-300 mx-1" />
            <button type="button" className="p-1.5 hover:bg-gray-200 rounded transition-colors" title="Bold"><Bold className="w-4 h-4" /></button>
            <button type="button" className="p-1.5 hover:bg-gray-200 rounded transition-colors" title="Italic"><Italic className="w-4 h-4" /></button>
            <button type="button" className="p-1.5 hover:bg-gray-200 rounded transition-colors" title="Underline"><Underline className="w-4 h-4" /></button>
            <button type="button" className="p-1.5 hover:bg-gray-200 rounded transition-colors" title="Strikethrough"><Strikethrough className="w-4 h-4" /></button>
            <div className="w-px h-4 bg-gray-300 mx-1" />
            <button type="button" className="p-1.5 hover:bg-gray-200 rounded transition-colors" title="Align Left"><AlignLeft className="w-4 h-4" /></button>
            <button type="button" className="p-1.5 hover:bg-gray-200 rounded transition-colors" title="Align Center"><AlignCenter className="w-4 h-4" /></button>
            <button type="button" className="p-1.5 hover:bg-gray-200 rounded transition-colors" title="Align Right"><AlignRight className="w-4 h-4" /></button>
            <div className="w-px h-4 bg-gray-300 mx-1" />
            <button type="button" className="p-1.5 hover:bg-gray-200 rounded transition-colors" title="Bullet List"><List className="w-4 h-4" /></button>
            <button type="button" className="p-1.5 hover:bg-gray-200 rounded transition-colors" title="Numbered List"><ListOrdered className="w-4 h-4" /></button>
            <button type="button" className="p-1.5 hover:bg-gray-200 rounded transition-colors" title="Quote"><Quote className="w-4 h-4" /></button>
          </div>

          {/* Email Body Textarea */}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type Your Message Here..."
            className="w-full flex-1 p-5 text-sm text-gray-900 focus:outline-none resize-none min-h-[260px] leading-relaxed"
          />
        </div>

        {/* Attached Files Chips */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs font-semibold text-gray-500">Attachments:</span>
            {attachments.map((file, idx) => (
              <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
                <Paperclip className="w-3 h-3 text-gray-400" />
                {file.name}
                <button
                  onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                  className="hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
