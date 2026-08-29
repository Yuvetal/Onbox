import React, { useState } from 'react';
import type { User } from '../types';
import { authApi, API_BASE_URL } from '../services/api';

interface LoginPageProps {
  onDevLogin: () => void;
  onLoginSuccess?: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onDevLogin, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = () => {
    // Redirects browser to real Google OAuth backend handler
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await authApi.loginWithEmail(email.trim());
      if (onLoginSuccess) {
        onLoginSuccess(res.user);
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* Centered Login Card matching Figma */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 sm:p-10 w-full max-w-md space-y-6">
        {/* Brand Logo & Heading */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#0f9f59] text-white font-bold text-xl flex items-center justify-center mx-auto shadow-md shadow-emerald-950/20">
            ONB
          </div>
          <h1 className="text-2xl font-bold text-gray-900 pt-2">Login</h1>
          <p className="text-xs text-gray-500">Sign in to your Mail Scheduler account</p>
        </div>

        {/* Light Green Pill Button: Login with Google (Figma Spec) */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 py-3 px-6 rounded-full bg-[#e6f4ea] hover:bg-[#dcfce7] text-[#0f9f59] border border-[#bbf7d0] font-semibold text-sm transition-all shadow-sm active:scale-[0.98]"
        >
          {/* Google G Icon */}
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Login with Google</span>
        </button>

        {/* Divider text matching Figma */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-gray-200 w-full" />
          <span className="bg-white px-3 text-xs text-gray-400 font-medium whitespace-nowrap">
            or sign up through email
          </span>
        </div>

        {/* Error Alert if any */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
            {error}
          </div>
        )}

        {/* Form Inputs (Light Gray #f3f4f6 rounded) */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 block">Email ID</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-4 py-2.5 bg-gray-100 border border-transparent focus:border-[#0f9f59] focus:bg-white rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-gray-100 border border-transparent focus:border-[#0f9f59] focus:bg-white rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
            />
          </div>

          {/* Solid Green Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-[#0f9f59] hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-md shadow-emerald-950/10 active:scale-[0.98]"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Local Dev Login Quick Link */}
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={onDevLogin}
            className="text-xs text-[#0f9f59] hover:underline font-medium"
          >
            Instant Dev Session (Local Mode)
          </button>
        </div>
      </div>
    </div>
  );
};
