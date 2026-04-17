import { Bot, Calendar, ChevronRight, Code, Newspaper, RefreshCw, Search, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import SEO from "../Component/SEO";

// Animated Background
const AnimatedBackground = () => (
  <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/50 to-cyan-50/30 dark:from-black dark:via-gray-900 dark:to-black" />
    {/* Floating orbs */}
    <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-br from-blue-400/30 to-cyan-400/20 dark:from-blue-500/20 dark:to-cyan-500/10 rounded-full blur-3xl animate-float" />
    <div className="absolute bottom-32 right-16 w-96 h-96 bg-gradient-to-br from-cyan-400/25 to-blue-400/15 dark:from-cyan-500/15 dark:to-blue-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
    <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-purple-400/20 to-pink-400/15 dark:from-purple-500/15 dark:to-pink-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s', transform: 'translate(-50%, -50%)' }} />
    {/* Geometric shapes */}
    <div className="absolute top-1/4 right-1/3 w-40 h-40 border-4 border-[#00ADB5]/20 dark:border-[#00ADB5]/30 rounded-full animate-spin-slow" />
    <div className="absolute bottom-1/4 left-1/4 w-32 h-32 border-2 border-cyan-400/30 dark:border-cyan-400/20 rounded-full animate-spin-slow" style={{ animationDirection: 'reverse' }} />
  </div>
);

interface NewsArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
  category?: string;
  // RSS feed specific properties
  link?: string;
  guid?: string;
  thumbnail?: string;
  enclosure?: { link?: string };
  pubDate?: string;
}

type CategoryType = 'all' | 'ai' | 'coding' | 'research';

const RSS_FEEDS = [
  { url: 'https://ai.googleblog.com/feeds/posts/default', name: 'Google AI Blog', category: 'ai' },
  { url: 'https://www.analyticsvidhya.com/blog/feed/', name: 'Analytics Vidhya', category: 'ai' },
  { url: 'https://www.reddit.com/r/MachineLearning/.rss', name: 'Reddit ML', category: 'ai' },
  { url: 'https://www.reddit.com/r/artificial/.rss', name: 'Reddit Artificial', category: 'ai' },
  { url: 'https://www.reddit.com/r/learnprogramming/.rss', name: 'Reddit LearnProgramming', category: 'coding' },
  { url: 'https://www.reddit.com/r/coding/.rss', name: 'Reddit Coding', category: 'coding' },
  { url: 'https://www.freecodecamp.org/news/rss/', name: 'freeCodeCamp', category: 'coding' },
  { url: 'https://www.smashingmagazine.com/feed/', name: 'Smashing Magazine', category: 'coding' },
  { url: 'https://www.reddit.com/r/javascript/.rss', name: 'Reddit JavaScript', category: 'coding' },
  { url: 'https://www.reddit.com/r/Python/.rss', name: 'Reddit Python', category: 'coding' },
  { url: 'https://export.arxiv.org/rss/cs.AI', name: 'arXiv AI', category: 'research' },
  { url: 'https://export.arxiv.org/rss/cs.LG', name: 'arXiv Machine Learning', category: 'research' },
  { url: 'https://export.arxiv.org/rss/cs.NE', name: 'arXiv Neural and Evolutionary Computing', category: 'research' },
];

const fetchFromRSS = async (feedUrl: string, sourceName: string, category: string): Promise<NewsArticle[]> => {
  try {
    const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) return [];
    const data = await response.json();
    if (!data.items) return [];
    return data.items.map((item: NewsArticle) => ({
      title: item.title || 'No title',
      description: (item.description || item.content || '').replace(/<[^>]*>/g, '').substring(0, 300) + (item.description?.length > 300 ? '...' : ''),
      content: item.content || item.description || '',
      url: item.link || item.guid || '',
      image: item.thumbnail || item.enclosure?.link || `https://picsum.photos/seed/${Math.random()}/400/200`,
      publishedAt: item.pubDate || new Date().toISOString(),
      source: { name: sourceName, url: feedUrl },
      category: category
    }));
  } catch {
    return [];
  }
};

const TechUpdate = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredArticles, setFilteredArticles] = useState<NewsArticle[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryType>('all');
  const [researchSearch, setResearchSearch] = useState('');
  const [researchPage, setResearchPage] = useState(1);

  const fetchNews = async () => {
    setLoading(true);
    setError(null);
    try {
      const allArticles: NewsArticle[] = [];
      const fetchPromises = RSS_FEEDS.map(feed => fetchFromRSS(feed.url, feed.name, feed.category));
      const results = await Promise.allSettled(fetchPromises);
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          allArticles.push(...result.value);
        }
      });
      if (allArticles.length === 0) throw new Error('No articles could be fetched.');
      const uniqueArticles = allArticles.filter((article, index, self) =>
        index === self.findIndex(a => a.title === article.title)
      );
      uniqueArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      setArticles(uniqueArticles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tech news');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  useEffect(() => {
    let filtered = articles;
    if (activeCategory !== 'all') {
      filtered = filtered.filter((article: NewsArticle) => article.category === activeCategory);
    }
    if (activeCategory === 'research' && researchSearch.trim() !== '') {
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(researchSearch.toLowerCase()) ||
        article.description.toLowerCase().includes(researchSearch.toLowerCase())
      );
    } else if (searchQuery.trim() !== '') {
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredArticles(filtered);
    if (activeCategory === 'research') setResearchPage(1);
  }, [searchQuery, articles, activeCategory, researchSearch]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const displayArticles = activeCategory === 'research'
    ? filteredArticles.slice(0, researchPage * 10)
    : filteredArticles;


  return (
    <div className="relative min-h-screen bg-white dark:bg-black overflow-x-hidden">
      <SEO
        title="Tech Updates & Reviews – Latest Technology News, AI & Coding | SkillUpX"
        description="Read tech reviews and stay ahead with the latest tech news, AI research, coding tutorials, and technology updates. Community-driven tech reviews on SkillUpX – honest reviews from real developers."
        keywords="tech review, tech reviews, technology review, code review, software review, coding platform review, tech news, technology updates, AI news, coding news, programming articles, developer updates, machine learning, web development, latest tech, research papers, AI research papers 2026, coding tutorials, developer blog, artificial intelligence updates, data science news, software development news, curated tech articles, SkillUpX tech reviews, honest tech reviews, developer technology reviews, framework reviews, programming language reviews"
        canonicalUrl="/TechUpdate"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "Tech Updates - SkillUpX",
          "description": "Latest technology news, AI research, and coding tutorials curated for developers.",
          "url": "https://skillupx.online/TechUpdate"
        }}
      />
      {/* Enhanced Animated Background with Grid Overlay and Blobs */}
      <AnimatedBackground />
      {/* Removed grid overlay for a cleaner look */}

      {/* Hero Section - Gradient Badge, Heading, Subtitle */}
      <section className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-16 pb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00ADB5] border border-[#00ADB5]/30 mb-6 animate-magnetic">
          <Sparkles className="w-4 h-4 text-white animate-pulse" />
          <span className="text-sm font-bold text-white">Tech News & Research</span>
        </div>
        <h1 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white mb-4 leading-tight">
          <span className="bg-gradient-to-r from-[#00ADB5] via-cyan-500 to-blue-600 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">Stay Ahead in Tech</span>
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl font-medium">
          Real-time updates, coding news, and the latest research papers for students. Search, filter, and explore the world of AI, ML, and programming.
        </p>
      </section>

      {/* Sticky Search & Category Bar - HomePage Style */}
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center gap-6">
          {/* Search Bar */}
          <div className="flex-1 w-full max-w-2xl">
            {activeCategory === 'research' ? (
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl blur-md opacity-0 group-hover:opacity-30 transition-opacity" />
                <div className="relative flex items-center bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all overflow-hidden">
                  <Search className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search research papers..."
                    value={researchSearch}
                    onChange={(e) => setResearchSearch(e.target.value)}
                    className="flex-1 bg-transparent px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-[#00ADB5] to-purple-600 rounded-2xl blur-md opacity-0 group-hover:opacity-30 transition-opacity" />
                <div className="relative flex items-center bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all overflow-hidden">
                  <Search className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search news & articles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Category Navigation - Gradient Badges */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { key: 'all', label: 'All News', icon: Newspaper, gradient: 'from-blue-500 to-purple-500' },
              { key: 'ai', label: 'AI & ML', icon: Bot, gradient: 'from-purple-500 to-pink-500' },
              { key: 'coding', label: 'Coding', icon: Code, gradient: 'from-green-500 to-teal-500' },
              { key: 'research', label: 'Research', icon: Sparkles, gradient: 'from-yellow-500 to-orange-500' }
            ].map(({ key, label, icon: Icon, gradient }) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key as CategoryType)}
                className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap overflow-hidden ${
                  activeCategory === key
                    ? 'text-white shadow-lg scale-105'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {activeCategory === key && (
                  <div className={`absolute inset-0 bg-gradient-to-r ${gradient} rounded-xl opacity-80`} />
                )}
                <Icon className="w-4 h-4 relative z-10" />
                <span className="relative z-10">{label}</span>
                {activeCategory === key && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1/2 h-1 bg-white/50 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchNews}
            disabled={loading}
            className="relative group px-6 py-3 bg-[#00ADB5] text-white rounded-2xl font-bold shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <div className="relative flex items-center gap-2">
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </div>
          </button>
        </div>
      </div>

      {/* Main Content Section - Section Headers, Bento Grid, HomePage Card Effects */}
      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        {/* Section Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00ADB5] border border-[#00ADB5] mb-4">
            {activeCategory === 'research' ? <Sparkles className="w-4 h-4 text-white animate-pulse" /> : activeCategory === 'ai' ? <Bot className="w-4 h-4 text-white animate-pulse" /> : activeCategory === 'coding' ? <Code className="w-4 h-4 text-white animate-pulse" /> : <Newspaper className="w-4 h-4 text-white animate-pulse" />}
            <span className="text-xs font-semibold text-white">
              {activeCategory === 'research' ? 'Latest Research Papers' : activeCategory === 'ai' ? 'AI & ML News' : activeCategory === 'coding' ? 'Coding News' : 'All Tech News'}
            </span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white mb-2">
            {activeCategory === 'research' ? 'Explore Research in ML, AI, DL' : activeCategory === 'ai' ? 'Artificial Intelligence & Machine Learning' : activeCategory === 'coding' ? 'Programming & Coding Updates' : 'Tech News & Updates'}
          </h2>
          <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            {activeCategory === 'research'
              ? 'Search and discover the latest research papers for students.'
              : activeCategory === 'ai'
                ? 'Stay updated with the latest in AI and ML.'
                : activeCategory === 'coding'
                  ? 'Get the newest updates in programming and coding.'
                  : 'All the latest tech news, coding, and research in one place.'}
          </p>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 border-4 border-[#00ADB5]/30 border-t-[#00ADB5] rounded-full animate-spin" />
              <div className="absolute inset-2 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" style={{ animationDirection: 'reverse' }} />
            </div>
            <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 font-medium">Fetching latest updates...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="max-w-2xl mx-auto">
            <div className="relative bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-3xl p-8 shadow-xl">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-red-900 dark:text-red-300 mb-2">Connection Error</h3>
                  <p className="text-red-700 dark:text-red-400 mb-4">{error}</p>
                  <button onClick={fetchNews} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors">
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Articles State */}
        {!loading && !error && filteredArticles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-24 h-24 rounded-3xl bg-gray-100 dark:bg-gray-900 flex items-center justify-center mb-6">
              <Newspaper className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-xl text-gray-600 dark:text-gray-400 font-medium">No articles found</p>
          </div>
        )}

        {/* Bento Grid Layout - HomePage Card Effects */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 auto-rows-[320px]">
          {displayArticles.map((article: NewsArticle, index) => {
            // Varied grid spans for interesting layout
            const spans = [
              'lg:col-span-6 lg:row-span-2',
              'lg:col-span-6 lg:row-span-1',
              'lg:col-span-4 lg:row-span-1',
              'lg:col-span-4 lg:row-span-1',
              'lg:col-span-4 lg:row-span-1',
              'lg:col-span-8 lg:row-span-1',
              'lg:col-span-4 lg:row-span-2',
              'lg:col-span-5 lg:row-span-1',
              'lg:col-span-7 lg:row-span-1',
            ];
            const spanClass = spans[index % spans.length];

            return (
              <article
                key={index}
                className={`stagger-item group relative ${spanClass} rounded-3xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-[1.04] backdrop-blur-xl bg-white/30 dark:bg-gray-900/40 border border-[#00ADB5]/20 hover:border-[#00ADB5]`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Animated Gradient Overlay */}
                <div className="absolute -inset-2 bg-[#00ADB5]/10 rounded-3xl opacity-40 pointer-events-none" />
                <div className="absolute -inset-1 bg-[#00ADB5]/20 rounded-3xl opacity-30 pointer-events-none" />

                {/* Background Image with Overlay */}
                <div className="absolute inset-0">
                  <img
                    src={article.image}
                    alt={article.title}
                    loading="lazy"
                    width={800}
                    height={600}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 group-hover:brightness-110"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/40 to-transparent" />
                </div>

                {/* Content */}
                <div className="relative h-full flex flex-col justify-end p-6 text-white z-10">
                  {/* Source & Date Badges */}
                  <div className="absolute top-6 left-6 flex items-center gap-2">
                    {/* Source Badge */}
                    <span className="px-3 py-1.5 rounded-full bg-[#00ADB5] text-xs font-bold shadow-md border border-[#00ADB5]/30 animate-pulse">
                      {article.source.name}
                    </span>
                  </div>
                  <div className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-900/80 border border-gray-700/50 text-xs shadow-md">
                    <Calendar className="w-3 h-3 text-white" />
                    <span className="text-white">{formatDate(article.publishedAt)}</span>
                  </div>

                  {/* Title */}
                  <h2 className="text-2xl lg:text-3xl font-black mb-3 line-clamp-2 group-hover:text-[#00ADB5] transition-colors drop-shadow-lg">
                    {article.title}
                  </h2>

                  {/* Description */}
                  <p className="text-base text-gray-200 mb-4 line-clamp-2 opacity-95 drop-shadow">
                    {article.description}
                  </p>

                  {/* Read More Link */}
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-base font-bold text-[#00ADB5] hover:text-white hover:bg-[#00ADB5] px-4 py-2 rounded-xl transition-all duration-300 group/link w-fit shadow-md"
                  >
                    <span>Explore Article</span>
                    <ChevronRight className="w-5 h-5 transition-transform group-hover/link:translate-x-1" />
                  </a>
                </div>

                {/* Animated Hover Border Effect */}
                <div className="absolute inset-0 border-2 border-[#00ADB5]/0 group-hover:border-[#00ADB5] rounded-3xl transition-all duration-300 pointer-events-none animate-pulse" />
              </article>
            );
          })}
        </div>

        {/* Load More Button for Research - HomePage Style */}
        {activeCategory === 'research' && filteredArticles.length > researchPage * 10 && (
          <div className="flex justify-center mt-12">
            <button
              onClick={() => setResearchPage(researchPage + 1)}
              className="relative group px-8 py-4 bg-[#00ADB5] text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden"
            >
              <div className="absolute inset-0 bg-[#00ADB5]/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <span className="relative flex items-center gap-2">
                Load More Papers
                <ChevronRight className="w-5 h-5" />
              </span>
            </button>
          </div>
        )}

        {/* Stats Footer - HomePage Style */}
        {!loading && !error && filteredArticles.length > 0 && (
          <div className="mt-12 flex justify-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/90 dark:bg-gray-900/90 border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg">
              <div className="w-2 h-2 rounded-full bg-[#00ADB5] animate-pulse" />
              <span className="text-sm font-bold text-[#00ADB5]">
                {activeCategory === 'research'
                  ? `${Math.min(filteredArticles.length, researchPage * 10)} of ${filteredArticles.length} papers`
                  : `${filteredArticles.length} of ${articles.length} articles`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TechUpdate;
