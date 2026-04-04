import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Search, LogOut, Loader2, ExternalLink, Calendar, Tag, Vault } from 'lucide-react';

interface SearchResult {
  id: string;
  url: string;
  title: string;
  summary: string;
  keywords: string[];
  topics: string[];
  content_type: string;
  created_at: string;
  similarity: number;
}

interface RecentItem {
  id: string;
  url: string;
  title: string;
  summary: string;
  keywords: string[];
  topics: string[];
  content_type: string;
  created_at: string;
}

export function Dashboard() {
  const { signOut, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentLoading, setRecentLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    loadRecentItems();
  }, []);

  const loadRecentItems = async () => {
    try {
      const { data, error } = await supabase
        .from('content_items')
        .select('id, url, title, summary, keywords, topics, content_type, created_at')
        .eq('status', 'processed')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentItems(data || []);
    } catch (err) {
      console.error('Error loading recent items:', err);
    } finally {
      setRecentLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError('');
    setHasSearched(true);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: searchQuery, limit: 10 }),
        }
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getContentTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      article: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      video: 'bg-red-500/10 text-red-400 border-red-500/30',
      tweet: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
      thread: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      reel: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
      other: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    };
    return colors[type] || colors.other;
  };

  const ResultCard = ({ item, showSimilarity = false }: { item: SearchResult | RecentItem; showSimilarity?: boolean }) => (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition group">
      <div className="flex items-start justify-between gap-4 mb-3">
        <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition line-clamp-2">
          {item.title}
        </h3>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 p-2 hover:bg-slate-700 rounded-lg transition"
        >
          <ExternalLink className="w-5 h-5 text-slate-400" />
        </a>
      </div>

      <p className="text-slate-300 text-sm mb-4 line-clamp-2">{item.summary}</p>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`text-xs px-2 py-1 rounded border ${getContentTypeColor(item.content_type)}`}>
          {item.content_type}
        </span>
        {showSimilarity && 'similarity' in item && (
          <span className="text-xs px-2 py-1 rounded border bg-green-500/10 text-green-400 border-green-500/30">
            {Math.round(item.similarity * 100)}% match
          </span>
        )}
      </div>

      {item.keywords.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {item.keywords.slice(0, 5).map((keyword, idx) => (
            <span key={idx} className="text-xs px-2 py-1 bg-slate-700/50 text-slate-300 rounded">
              <Tag className="w-3 h-3 inline mr-1" />
              {keyword}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Calendar className="w-3 h-3" />
        {formatDate(item.created_at)}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <Vault className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">ContextVault</h1>
                <p className="text-xs text-slate-400">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Search Your Memory</h2>
          <p className="text-slate-400">
            Describe what you're looking for in your own words
          </p>
        </div>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Try "that video about compound interest" or "article on React performance"'
              className="w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-400">{error}</p>
          )}
        </form>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <span className="ml-3 text-slate-400">Searching your vault...</span>
          </div>
        )}

        {!loading && hasSearched && (
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-white mb-4">
              {searchResults.length > 0
                ? `Found ${searchResults.length} result${searchResults.length === 1 ? '' : 's'}`
                : 'No results found'}
            </h3>
            {searchResults.length === 0 && (
              <p className="text-slate-400">Try different keywords or save more content to search through</p>
            )}
            <div className="grid gap-4">
              {searchResults.map((result) => (
                <ResultCard key={result.id} item={result} showSimilarity={true} />
              ))}
            </div>
          </div>
        )}

        {!hasSearched && (
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">
              Recently Saved
            </h3>
            {recentLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : recentItems.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/30 border border-slate-700 rounded-xl">
                <Vault className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Your vault is empty</h3>
                <p className="text-slate-400 mb-4">
                  Install the Chrome extension to start capturing content
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {recentItems.map((item) => (
                  <ResultCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
