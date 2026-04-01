import { AlertCircle, ChevronDown, ChevronUp, ExternalLink, RefreshCw, Rss, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Update {
  id: string;
  title: string;
  description: string;
  short: string;
  link: string;
  platform: string;
  emoji: string;
  color: string;
  time: string;
  pubDate: Date;
  priority: 'high' | 'medium' | 'low';
}

interface RSSFeed {
  url: string;
  platform: string;
  emoji: string;
  color: string;
}

export default function LiveUpdatesBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedUpdate, setExpandedUpdate] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'tech' | 'ai'>('tech');

  // Tech RSS Feed URLs
  const TECH_FEEDS: RSSFeed[] = [
    { url: 'https://github.blog/feed/', platform: 'GitHub', emoji: '🐙', color: 'from-gray-600 to-gray-800' },
    { url: 'https://blog.google/technology/developers/rss', platform: 'Google Developers', emoji: '🔍', color: 'from-blue-500 to-green-500' },
    { url: 'https://stackoverflow.blog/feed/', platform: 'Stack Overflow', emoji: '📚', color: 'from-orange-500 to-yellow-500' },
    { url: 'https://www.freecodecamp.org/news/rss/', platform: 'freeCodeCamp', emoji: '🔥', color: 'from-green-600 to-teal-600' },
    { url: 'https://dev.to/feed', platform: 'DEV Community', emoji: '👨‍💻', color: 'from-purple-600 to-indigo-600' },
  ];

  // AI/ML RSS Feed URLs
  const AI_FEEDS: RSSFeed[] = [
    { url: 'https://openai.com/blog/rss/', platform: 'OpenAI', emoji: '🤖', color: 'from-green-500 to-emerald-600' },
    { url: 'https://blog.google/technology/ai/rss', platform: 'Google AI', emoji: '🧠', color: 'from-blue-500 to-indigo-600' },
    { url: 'https://huggingface.co/blog/feed.xml', platform: 'Hugging Face', emoji: '🤗', color: 'from-yellow-500 to-orange-500' },
    { url: 'https://www.reddit.com/r/MachineLearning/.rss', platform: 'r/MachineLearning', emoji: '📊', color: 'from-orange-500 to-red-500' },
    { url: 'https://www.reddit.com/r/artificial/.rss', platform: 'r/artificial', emoji: '🔮', color: 'from-purple-500 to-pink-500' },
    { url: 'https://machinelearningmastery.com/feed/', platform: 'ML Mastery', emoji: '📈', color: 'from-teal-500 to-cyan-500' },
    { url: 'https://www.marktechpost.com/feed/', platform: 'MarkTechPost AI', emoji: '📰', color: 'from-red-500 to-rose-600' },
  ];

  const RSS_FEEDS = activeTab === 'tech' ? TECH_FEEDS : AI_FEEDS;

  const parseRSSFeed = async (feedUrl: string, platform: string, emoji: string, color: string): Promise<Update[]> => {
    try {
      // Using RSS2JSON API (free, no API key needed)
      const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.status === 'ok' && data.items) {
        return data.items.slice(0, 3).map((item: any) => ({
          id: `${platform}-${item.pubDate}`,
          title: item.title,
          description: item.description?.replace(/<[^>]*>/g, '').substring(0, 200) + '...' || 'Click to read more',
          short: item.title,
          link: item.link,
          platform: platform,
          emoji: emoji,
          color: color,
          time: getTimeAgo(new Date(item.pubDate)),
          pubDate: new Date(item.pubDate),
          priority: getRecencyPriority(new Date(item.pubDate))
        }));
      }
      return [];
    } catch (err) {
      console.error(`Error fetching ${platform}:`, err);
      return [];
    }
  };

  const getTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return `${Math.floor(seconds / 604800)} weeks ago`;
  };

  const getRecencyPriority = (date: Date): 'high' | 'medium' | 'low' => {
    const hours = (new Date().getTime() - date.getTime()) / (1000 * 60 * 60);
    if (hours < 24) return 'high';
    if (hours < 168) return 'medium';
    return 'low';
  };

  const fetchAllUpdates = async () => {
    setLoading(true);
    setError(null);

    try {
      const feedsToFetch = activeTab === 'tech' ? TECH_FEEDS : AI_FEEDS;
      const allPromises = feedsToFetch.map(feed =>
        parseRSSFeed(feed.url, feed.platform, feed.emoji, feed.color)
      );

      const results = await Promise.all(allPromises);
      const allUpdates = results.flat();

      // Sort by date (newest first)
      allUpdates.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

      setUpdates(allUpdates);
      setLastRefresh(new Date());
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch updates. Please try again.');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAllUpdates();
    }
  }, [isOpen, activeTab]);

  const priorityBadge = {
    high: { color: 'bg-red-500', text: 'NEW' },
    medium: { color: 'bg-yellow-500', text: 'RECENT' },
    low: { color: 'bg-gray-500', text: 'OLDER' }
  };

  return (
    <>
      {/* Bot Button - Fixed in Corner */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-[9999] transition-all duration-300 ${
          isOpen ? 'scale-0' : 'scale-100'
        }`}
        aria-label="Open Tech Updates"
      >
        <div className="relative">
          {/* Ping animation */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#00ADB5] to-cyan-500 rounded-full animate-ping opacity-75"></div>

          {/* Badge count */}
          {updates.length > 0 && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-bounce z-10">
              {updates.length > 99 ? '99+' : updates.length}
            </div>
          )}

          {/* Main button with tech icon */}
          <div className="relative bg-gradient-to-r from-[#00ADB5] to-cyan-500 p-3 rounded-full shadow-2xl hover:scale-110 transition-transform cursor-pointer">
            <Rss className="w-7 h-7 text-white" />
          </div>
        </div>
      </button>

      {/* Bot Panel */}
      <div
        className={`fixed bottom-6 right-6 z-50 transition-all duration-500 transform ${
          isOpen ? 'translate-x-0 opacity-100' : 'translate-x-[500px] opacity-0 pointer-events-none'
        }`}
      >
        <div className="w-[360px] sm:w-[400px] h-[420px] sm:h-[480px] bg-gradient-to-br from-[#1a1a2e]/95 to-[#16213e]/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 flex flex-col overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-[#00ADB5] to-cyan-500 p-3 sm:p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1.5 rounded-full flex items-center justify-center">
                <Rss className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm sm:text-base">
                  {activeTab === 'tech' ? 'Tech Updates' : 'AI News'}
                </h3>
                <p className="text-white/80 text-[10px]">
                  {lastRefresh ? `Updated ${getTimeAgo(lastRefresh)}` : 'Real-time feeds'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={fetchAllUpdates}
                disabled={loading}
                className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all disabled:opacity-50"
                aria-label="Refresh updates"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all"
                aria-label="Close panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-white/5 border-b border-white/10">
            <button
              onClick={() => setActiveTab('tech')}
              className={`flex-1 py-2 px-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'tech'
                  ? 'bg-[#00ADB5]/20 text-[#00ADB5] border-b-2 border-[#00ADB5]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>💻</span> Tech
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 py-2 px-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'ai'
                  ? 'bg-[#00ADB5]/20 text-[#00ADB5] border-b-2 border-[#00ADB5]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>🤖</span> AI & ML
            </button>
          </div>

          {/* Platform Tags */}
          <div className="px-4 py-2 flex flex-wrap gap-2 border-b border-white/10">
            {RSS_FEEDS.map(feed => (
              <span
                key={feed.platform}
                className="bg-white/10 text-white/80 text-[10px] px-2 py-1 rounded-full flex items-center gap-1"
              >
                <span>{feed.emoji}</span>
                <span className="hidden sm:inline">{feed.platform}</span>
              </span>
            ))}
          </div>

          {/* Updates List */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 scrollbar-thin">
            {loading && (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <RefreshCw className="w-8 h-8 text-[#00ADB5] animate-spin" />
                <p className="text-[#00ADB5] text-sm">Fetching latest updates...</p>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <AlertCircle className="w-8 h-8 text-red-400" />
                <p className="text-red-300 text-sm text-center">{error}</p>
                <button
                  onClick={fetchAllUpdates}
                  className="bg-[#00ADB5] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#00ADB5]/80 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {!loading && !error && updates.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Rss className="w-10 h-10 text-[#00ADB5] animate-pulse" />
                <p className="text-gray-400 text-sm">Click refresh to load updates</p>
              </div>
            )}

            {!loading && !error && updates.map((update, index) => {
              const badge = priorityBadge[update.priority];
              const isExpanded = expandedUpdate === update.id;

              return (
                <div
                  key={update.id}
                  className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden hover:border-[#00ADB5]/50 transition-all hover:shadow-xl hover:shadow-[#00ADB5]/10"
                  style={{
                    animation: `slideIn 0.5s ease-out ${index * 0.05}s both`
                  }}
                >
                  <div className={`h-1 bg-gradient-to-r ${update.color}`}></div>

                  <div className="p-3 sm:p-4">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="text-xl sm:text-2xl">{update.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`${badge.color} text-white text-[10px] font-bold px-2 py-0.5 rounded-full`}>
                            {badge.text}
                          </span>
                          <span className="text-gray-400 text-xs">{update.time}</span>
                        </div>
                        <h4 className="text-white font-bold text-xs sm:text-sm mb-1 leading-tight line-clamp-2">
                          {update.title}
                        </h4>
                        {isExpanded && (
                          <p className="text-gray-400 text-xs mb-2 animate-fadeIn">
                            {update.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] bg-white/10 text-[#00ADB5] px-2 py-1 rounded-full">
                            {update.platform}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => window.open(update.link, '_blank')}
                              className="text-[#00ADB5] hover:text-cyan-300 transition-colors p-1"
                              aria-label="Open link"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setExpandedUpdate(isExpanded ? null : update.id)}
                              className="text-[#00ADB5] hover:text-cyan-300 transition-colors p-1"
                              aria-label={isExpanded ? "Collapse" : "Expand"}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-3 sm:p-4 bg-white/5 border-t border-white/10">
            <button
              onClick={fetchAllUpdates}
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#00ADB5] to-cyan-500 text-white py-3 rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-[#00ADB5]/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh Updates'}
            </button>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #00ADB5;
          border-radius: 10px;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </>
  );
}
