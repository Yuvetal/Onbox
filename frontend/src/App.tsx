import { useState, useEffect, useCallback } from 'react';
import type { User, Email, Pagination } from './types';
import { authApi, slackApi, emailsApi, searchApi, API_BASE_URL } from './services/api';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { EmailListRow } from './components/EmailListRow';
import { EmailDetail } from './components/EmailDetail';
import { ComposePage } from './components/ComposePage';
import { LoginPage } from './components/LoginPage';
import { Toast } from './components/Toast';
import { ChevronLeft, ChevronRight, Inbox, MailWarning } from 'lucide-react';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Active view routing: 'scheduled' | 'sent' | 'compose' | 'detail' | 'login'
  const [activeNav, setActiveNav] = useState<'scheduled' | 'sent'>('scheduled');
  const [currentView, setCurrentView] = useState<'list' | 'compose' | 'detail'>('list');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  // Force login page view check via hash (#login)
  const [forceLogin, setForceLogin] = useState(window.location.hash === '#login');

  useEffect(() => {
    const handleHashChange = () => setForceLogin(window.location.hash === '#login');
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Email data & pagination state
  const [scheduledEmails, setScheduledEmails] = useState<Email[]>([]);
  const [scheduledPagination, setScheduledPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  });

  const [sentEmails, setSentEmails] = useState<Email[]>([]);
  const [sentPagination, setSentPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  });

  // Search state
  const [searchResults, setSearchResults] = useState<Email[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Slack status state
  const [slackConnected, setSlackConnected] = useState(false);

  // Toast feedback state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch current user session
  const checkAuth = useCallback(async () => {
    try {
      setAuthLoading(true);
      const res = await authApi.me();
      setUser(res.user);
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // Fetch Slack status
  const checkSlackStatus = useCallback(async () => {
    try {
      const res = await slackApi.status();
      setSlackConnected(res.connected);
    } catch {
      setSlackConnected(false);
    }
  }, []);

  // Fetch Scheduled Emails list
  const loadScheduledEmails = useCallback(async (page = 1) => {
    try {
      const res = await emailsApi.getScheduled(page, 20);
      setScheduledEmails(res.data);
      setScheduledPagination(res.pagination);
    } catch (err: any) {
      console.error('Failed to load scheduled emails:', err.message);
    }
  }, []);

  // Fetch Sent Emails list
  const loadSentEmails = useCallback(async (page = 1) => {
    try {
      const res = await emailsApi.getSent(page, 20);
      setSentEmails(res.data);
      setSentPagination(res.pagination);
    } catch (err: any) {
      console.error('Failed to load sent emails:', err.message);
    }
  }, []);

  // Initial load
  useEffect(() => {
    checkAuth();
    checkSlackStatus();
  }, [checkAuth, checkSlackStatus]);

  useEffect(() => {
    if (user) {
      loadScheduledEmails(scheduledPagination.page);
      loadSentEmails(sentPagination.page);
    }
  }, [user, loadScheduledEmails, loadSentEmails, scheduledPagination.page, sentPagination.page]);

  // Handle Search Input (Elasticsearch backend API)
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await searchApi.query(query);
      setSearchResults(res.data);
    } catch (err: any) {
      console.error('Search failed:', err.message);
    } finally {
      setIsSearching(false);
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    try {
      await authApi.logout();
      setUser(null);
      setForceLogin(true);
      setToast({ type: 'success', message: 'Logged out successfully' });
    } catch (err: any) {
      setToast({ type: 'error', message: err.message });
    }
  };

  // Refresh handler
  const handleRefresh = () => {
    loadScheduledEmails(scheduledPagination.page);
    loadSentEmails(sentPagination.page);
    checkSlackStatus();
    setToast({ type: 'success', message: 'List updated' });
  };

  // Dev Login Shortcut
  const handleDevLogin = async () => {
    window.location.hash = '';
    window.location.href = `${API_BASE_URL}/auth/dev-login`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#0f9f59] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-gray-500">Loading Mail Scheduler...</p>
        </div>
      </div>
    );
  }

  if (!user || forceLogin) {
    return (
      <LoginPage
        onDevLogin={handleDevLogin}
        onLoginSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          setForceLogin(false);
          window.location.hash = '';
        }}
      />
    );
  }

  // Active email list to display
  const activeList = searchResults !== null
    ? searchResults
    : activeNav === 'scheduled'
    ? scheduledEmails
    : sentEmails;

  const currentPagination = activeNav === 'scheduled' ? scheduledPagination : sentPagination;

  return (
    <div className="min-h-screen bg-white flex select-none font-sans text-gray-900">
      {/* Sidebar Navigation */}
      <Sidebar
        user={user}
        activeNav={activeNav}
        onNavigate={(nav) => {
          setActiveNav(nav);
          setCurrentView('list');
          setSelectedEmail(null);
          setSearchResults(null);
        }}
        onOpenCompose={() => setCurrentView('compose')}
        onLogout={handleLogout}
        scheduledCount={scheduledPagination.total}
        sentCount={sentPagination.total}
        slackConnected={slackConnected}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {currentView === 'compose' ? (
          <ComposePage
            onBack={() => setCurrentView('list')}
            onSuccess={(msg) => {
              setToast({ type: 'success', message: msg });
              loadScheduledEmails(1);
            }}
            onError={(err) => setToast({ type: 'error', message: err })}
          />
        ) : currentView === 'detail' && selectedEmail ? (
          <EmailDetail email={selectedEmail} onBack={() => setCurrentView('list')} />
        ) : (
          <>
            {/* Top Search & Filter Bar */}
            <TopBar onSearch={handleSearch} onRefresh={handleRefresh} isSearching={isSearching} />

            {/* List Header Info */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900 capitalize">
                  {searchResults !== null ? 'Search Results' : activeNav}
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                  {activeList.length} items
                </span>
              </div>

              {/* Pagination Controls */}
              {searchResults === null && currentPagination.totalPages > 1 && (
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                  <span>
                    Page {currentPagination.page} of {currentPagination.totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={currentPagination.page <= 1}
                      onClick={() =>
                        activeNav === 'scheduled'
                          ? loadScheduledEmails(currentPagination.page - 1)
                          : loadSentEmails(currentPagination.page - 1)
                      }
                      className="p-1 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={currentPagination.page >= currentPagination.totalPages}
                      onClick={() =>
                        activeNav === 'scheduled'
                          ? loadScheduledEmails(currentPagination.page + 1)
                          : loadSentEmails(currentPagination.page + 1)
                      }
                      className="p-1 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Inbox List Rows Container */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {activeList.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                    {searchResults !== null ? <MailWarning className="w-7 h-7" /> : <Inbox className="w-7 h-7" />}
                  </div>
                  <h3 className="text-base font-bold text-gray-900">
                    {searchResults !== null ? 'No matching emails found' : `No ${activeNav} emails yet`}
                  </h3>
                  <p className="text-xs text-gray-500 max-w-sm mt-1">
                    {searchResults !== null
                      ? 'Try searching with different keywords or recipient emails.'
                      : activeNav === 'scheduled'
                      ? 'Click the "Compose" button in the sidebar to schedule your first email campaign!'
                      : 'Sent emails will automatically appear here once delivered.'}
                  </p>
                </div>
              ) : (
                activeList.map((email) => (
                  <EmailListRow
                    key={email.id}
                    email={email}
                    onSelect={(item) => {
                      setSelectedEmail(item);
                      setCurrentView('detail');
                    }}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Toast Notification Container */}
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}

export default App;
