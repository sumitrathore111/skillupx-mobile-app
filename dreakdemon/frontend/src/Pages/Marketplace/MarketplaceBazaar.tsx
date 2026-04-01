import { motion } from 'framer-motion';
import {
    Plus,
    Search,
    ShoppingBag,
    TrendingUp
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CustomSelect from '../../Component/Global/CustomSelect';
import { getAllProjects } from '../../service/marketplaceService';
import type { MarketplaceProject } from '../../types/marketplace';
import { CATEGORY_LABELS } from '../../types/marketplace';
import ChatRequests from './components/ChatRequests';
import MessagesPanel from './components/MessagesPanel';
import ProjectCard from './components/ProjectCard';

export default function MarketplaceBazaar() {
  const [projects, setProjects] = useState<MarketplaceProject[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<MarketplaceProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [projects, searchQuery, selectedCategory, sortBy]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await getAllProjects();
      setProjects(data);
      setFilteredProjects(data);
    } catch (error: any) {
      console.error('Error loading projects:', error);
      // Set empty array so the UI still renders
      setProjects([]);
      setFilteredProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...projects];

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.techStack.some((tech) => tech.toLowerCase().includes(query))
      );
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'popular':
        filtered.sort((a, b) => b.purchases - a.purchases);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
    }

    setFilteredProjects(filtered);
  };

  const stats = {
    totalProjects: projects.length,
    totalSales: projects.reduce((sum, p) => sum + p.purchases, 0),
    avgRating: projects.length > 0
      ? projects.reduce((sum, p) => sum + p.rating, 0) / projects.length
      : 0,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 sm:mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2" style={{ color: '#00ADB5' }}>
                Project Bazaar 🛒
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-white">
                Buy and sell amazing projects from talented developers
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Chat Requests & Messages */}
              <ChatRequests />
              <MessagesPanel />

              <Link
                to="/dashboard/marketplace/my-purchases"
                className="px-3 sm:px-4 py-2 bg-white dark:bg-gray-800 border-2 rounded-lg hover:bg-[#00ADB5]/10 dark:hover:bg-[#00ADB5]/20 transition-colors flex items-center gap-1 sm:gap-2 font-semibold text-sm sm:text-base whitespace-nowrap"
                style={{ borderColor: '#00ADB5', color: '#00ADB5' }}
              >
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden xs:inline">My </span>Purchases
              </Link>
              <Link
                to="/dashboard/marketplace/my-listings"
                className="px-3 sm:px-4 py-2 bg-white dark:bg-gray-800 border-2 rounded-lg hover:bg-[#00ADB5]/10 dark:hover:bg-[#00ADB5]/20 transition-colors flex items-center gap-1 sm:gap-2 font-semibold text-sm sm:text-base whitespace-nowrap"
                style={{ borderColor: '#00ADB5', color: '#00ADB5' }}
              >
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden xs:inline">My </span>Listings
              </Link>
              <Link
                to="/dashboard/marketplace/create"
                className="px-4 sm:px-6 py-2 text-white rounded-lg transition-all flex items-center gap-1 sm:gap-2 font-semibold text-sm sm:text-base shadow-lg hover:opacity-90 whitespace-nowrap"
                style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                Sell Project
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(0, 173, 181, 0.1)' }}>
                  <ShoppingBag className="w-6 h-6" style={{ color: '#00ADB5' }} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totalProjects}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-white">Projects Listed</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(0, 173, 181, 0.1)' }}>
                  <TrendingUp className="w-6 h-6" style={{ color: '#00ADB5' }} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totalSales}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-white">Total Sales</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow sm:col-span-2 md:col-span-1">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <span className="text-2xl">⭐</span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.avgRating.toFixed(1)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-white">Average Rating</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00ADB5] focus:bg-white dark:focus:bg-gray-600 transition-all"
              />
            </div>

            {/* Category Filter */}
            <CustomSelect
              value={selectedCategory}
              onChange={(value) => setSelectedCategory(value)}
              options={[
                { value: 'all', label: 'All Categories' },
                ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
                  value,
                  label
                }))
              ]}
              className="w-full sm:min-w-[180px] sm:w-auto"
            />

            {/* Sort */}
            <CustomSelect
              value={sortBy}
              onChange={(value) => setSortBy(value)}
              options={[
                { value: 'newest', label: 'Newest First' },
                { value: 'popular', label: 'Most Popular' },
                { value: 'rating', label: 'Highest Rated' },
                { value: 'price-low', label: 'Price: Low to High' },
                { value: 'price-high', label: 'Price: High to Low' }
              ]}
              className="w-full sm:min-w-[180px] sm:w-auto"
            />
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-3 sm:mb-4">
          <p className="text-sm sm:text-base text-gray-600 dark:text-white">
            Showing {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: '#00ADB5', borderTopColor: 'transparent' }} />
            <p className="text-gray-600 dark:text-white font-medium">Loading amazing projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="p-4 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 173, 181, 0.1)' }}>
              <ShoppingBag className="w-12 h-12" style={{ color: '#00ADB5' }} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              No projects found
            </h3>
            <p className="text-gray-600 dark:text-white text-lg mb-6">
              No projects match your search criteria
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="px-6 py-3 text-white rounded-lg transition-colors font-semibold hover:opacity-90"
              style={{ backgroundColor: '#00ADB5' }}
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


