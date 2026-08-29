import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, X } from 'lucide-react';

interface TopBarProps {
  onSearch: (query: string) => void;
  onRefresh: () => void;
  isSearching: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ onSearch, onRefresh, isSearching }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, onSearch]);

  const handleClear = () => {
    setSearchTerm('');
    onSearch('');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search Input Container matching Figma */}
      <div className="relative flex-1 max-w-xl">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search scheduled or sent emails (Elasticsearch)..."
          className="w-full pl-10 pr-9 py-2 bg-gray-100/80 hover:bg-gray-100 focus:bg-white text-sm text-gray-900 placeholder-gray-400 rounded-full border border-transparent focus:border-[#0f9f59] focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
        />
        {searchTerm && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Top Right Action Icons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          className={`p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors ${
            isSearching ? 'animate-spin' : ''
          }`}
          title="Refresh List"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          title="Filter View"
        >
          <Filter className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
