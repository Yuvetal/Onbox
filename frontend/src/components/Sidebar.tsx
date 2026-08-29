import React, { useState } from 'react';
import { Clock, Send, Plus, ChevronDown, LogOut, MessageSquare, CheckCircle } from 'lucide-react';
import type { User } from '../types';

interface SidebarProps {
  user: User | null;
  activeNav: 'scheduled' | 'sent';
  onNavigate: (nav: 'scheduled' | 'sent') => void;
  onOpenCompose: () => void;
  onLogout: () => void;
  scheduledCount: number;
  sentCount: number;
  slackConnected: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeNav,
  onNavigate,
  onOpenCompose,
  onLogout,
  scheduledCount,
  sentCount,
  slackConnected,
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <aside className="w-64 bg-[#18181b] text-gray-300 min-h-screen flex flex-col justify-between p-4 border-r border-zinc-800 select-none">
      <div className="space-y-6">
        {/* Logo & Brand Header */}
        <div className="flex items-center gap-3 px-2 pt-1">
          <div className="w-9 h-9 rounded-xl bg-[#0f9f59] flex items-center justify-center text-white font-bold text-lg shadow-md shadow-emerald-950">
            ONB
          </div>
          <div>
            <h1 className="text-white font-semibold text-base leading-tight">Mail Scheduler</h1>
            <p className="text-xs text-zinc-500">v1.0 Production</p>
          </div>
        </div>

        {/* User Block & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800 transition-colors"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover border border-zinc-700"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-semibold text-xs border border-emerald-600">
                  {getInitials(user?.name)}
                </div>
              )}
              <div className="text-left truncate">
                <p className="text-sm font-medium text-white leading-tight truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-zinc-400 truncate">{user?.email || 'demo@onb.com'}</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* User Dropdown Menu */}
          {userDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 p-1.5 space-y-1">
              <div className="px-3 py-2 text-xs text-zinc-400 border-b border-zinc-800">
                Signed in as <span className="text-white font-medium block truncate">{user?.email}</span>
              </div>
              <button
                onClick={() => {
                  setUserDropdownOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-950/40 rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          )}
        </div>

        {/* Compose Button (Figma mint green pill outline) */}
        <button
          onClick={onOpenCompose}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-[#e6f4ea] hover:bg-[#dcfce7] text-[#0f9f59] border border-[#bbf7d0] font-semibold text-sm transition-all shadow-sm active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Compose
        </button>

        {/* Navigation Section */}
        <div className="space-y-1.5 pt-2">
          <p className="px-3 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">CORE</p>

          {/* Scheduled Nav Button */}
          <button
            onClick={() => onNavigate('scheduled')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-sm font-medium transition-all ${
              activeNav === 'scheduled'
                ? 'bg-[#e6f4ea] text-[#0f9f59] font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4" />
              <span>Scheduled</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeNav === 'scheduled'
                  ? 'bg-[#0f9f59] text-white'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {scheduledCount}
            </span>
          </button>

          {/* Sent Nav Button */}
          <button
            onClick={() => onNavigate('sent')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-sm font-medium transition-all ${
              activeNav === 'sent'
                ? 'bg-[#e6f4ea] text-[#0f9f59] font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Send className="w-4 h-4" />
              <span>Sent</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeNav === 'sent' ? 'bg-[#0f9f59] text-white' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {sentCount}
            </span>
          </button>
        </div>
      </div>

      {/* Slack Integration Block */}
      <div className="pt-4 border-t border-zinc-800 space-y-2">
        <div className="px-2 flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">Slack Alerts</span>
          {slackConnected ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
              <CheckCircle className="w-3 h-3" /> Connected
            </span>
          ) : (
            <span className="text-[11px] text-zinc-500">Not Linked</span>
          )}
        </div>

        {slackConnected ? (
          <button
            onClick={() => (window.location.href = 'http://localhost:5000/api/slack/disconnect')}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-full text-xs font-medium text-zinc-400 hover:text-red-400 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors"
          >
            Disconnect Slack
          </button>
        ) : (
          <button
            onClick={() => (window.location.href = 'http://localhost:5000/api/slack/authorize')}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-full text-xs font-semibold bg-[#e6f4ea] hover:bg-[#dcfce7] text-[#0f9f59] border border-[#bbf7d0] transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Connect Slack
          </button>
        )}
      </div>
    </aside>
  );
};
