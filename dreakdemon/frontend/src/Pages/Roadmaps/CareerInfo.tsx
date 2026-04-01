import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Briefcase,
    Building,
    ChevronRight,
    GraduationCap,
    TrendingUp
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    DEMAND_LABELS,
    getAllRoadmaps,
    getCareerInfo,
    type CareerInfo,
    type Roadmap
} from '../../service/roadmapService';

const experienceLevelLabels: Record<string, string> = {
  fresher: 'Fresher (0-1 years)',
  junior: 'Junior (1-3 years)',
  mid: 'Mid-Level (3-5 years)',
  senior: 'Senior (5-8 years)',
  lead: 'Lead (8+ years)'
};

export default function CareerInfoPage() {
  const { slug } = useParams<{ slug?: string }>();
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [selectedRoadmap, setSelectedRoadmap] = useState<Roadmap | null>(null);
  const [careers, setCareers] = useState<CareerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [careersLoading, setCareersLoading] = useState(false);

  const loadRoadmaps = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllRoadmaps();
      setRoadmaps(data);

      if (slug) {
        const found = data.find(r => r.slug === slug);
        if (found) {
          setSelectedRoadmap(found);
        }
      } else if (data.length > 0) {
        setSelectedRoadmap(data[0]);
      }
    } catch (error) {
      console.error('Error loading roadmaps:', error);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const loadCareers = useCallback(async () => {
    if (!selectedRoadmap) return;

    try {
      setCareersLoading(true);
      const data = await getCareerInfo(selectedRoadmap._id);
      setCareers(data);
    } catch (error) {
      console.error('Error loading careers:', error);
    } finally {
      setCareersLoading(false);
    }
  }, [selectedRoadmap]);

  useEffect(() => {
    loadRoadmaps();
  }, [loadRoadmaps]);

  useEffect(() => {
    if (selectedRoadmap) {
      loadCareers();
    }
  }, [selectedRoadmap, loadCareers]);

  const formatSalary = (min: number, max: number, currency: string): string => {
    if (currency === 'INR') {
      return `₹${(min / 100000).toFixed(1)}-${(max / 100000).toFixed(1)} LPA`;
    }
    return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-6">
        <div className="max-w-5xl mx-auto animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-8" />
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-6" />
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link
            to="/dashboard/roadmaps"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-[#00ADB5] mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Roadmaps
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <Briefcase className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Career Opportunities
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Explore job roles, salaries, and growth paths
              </p>
            </div>
          </div>
        </motion.div>

        {/* Roadmap Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-900 rounded-xl p-4 mb-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex flex-wrap gap-2">
            {roadmaps.map(roadmap => (
              <button
                key={roadmap._id}
                onClick={() => setSelectedRoadmap(roadmap)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  selectedRoadmap?._id === roadmap._id
                    ? 'bg-[#00ADB5] text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <span>{roadmap.icon}</span>
                <span className="font-medium">{roadmap.title}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Market Overview */}
        {selectedRoadmap && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 mb-8 text-white"
          >
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6" />
              <h2 className="text-xl font-semibold">
                {selectedRoadmap.title} Market Overview
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-2xl font-bold">{careers.length}+</p>
                <p className="text-sm text-white/80">Job Roles</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-2xl font-bold">
                  {careers.filter(c => c.demandLevel === 'high' || c.demandLevel === 'very-high').length}
                </p>
                <p className="text-sm text-white/80">High Demand Roles</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-2xl font-bold">
                  {careers.filter(c => c.experienceLevel === 'fresher').length}
                </p>
                <p className="text-sm text-white/80">Fresher Friendly</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-2xl font-bold">
                  ₹{careers.length > 0
                    ? (Math.max(...careers.map(c => c.salaryRange.max)) / 100000).toFixed(0)
                    : 0}L
                </p>
                <p className="text-sm text-white/80">Max Salary</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Career Cards */}
        {careersLoading ? (
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : careers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Briefcase className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No career info available
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Career information for this roadmap is coming soon
            </p>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {careers.map((career, index) => {
              const demandInfo = DEMAND_LABELS[career.demandLevel];

              return (
                <motion.div
                  key={career._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-[#00ADB5] transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {career.jobTitle}
                      </h3>
                      <span
                        className="px-2.5 py-1 text-xs font-medium rounded-full"
                        style={{
                          background: `${demandInfo.color}20`,
                          color: demandInfo.color
                        }}
                      >
                        {demandInfo.label}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {formatSalary(
                          career.salaryRange.min,
                          career.salaryRange.max,
                          career.salaryRange.currency
                        )}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {experienceLevelLabels[career.experienceLevel]}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {career.description}
                  </p>

                  {/* Required Skills */}
                  <div className="mb-4">
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                      Required Skills
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {career.requiredSkills.slice(0, 5).map(skill => (
                        <span
                          key={skill}
                          className="px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded"
                        >
                          {skill}
                        </span>
                      ))}
                      {career.requiredSkills.length > 5 && (
                        <span className="px-2 py-1 text-xs text-gray-500">
                          +{career.requiredSkills.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Preferred Skills */}
                  {career.preferredSkills.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                        Good to Have
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {career.preferredSkills.slice(0, 4).map(skill => (
                          <span
                            key={skill}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Companies */}
                  {career.companies.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2 flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        Top Hiring Companies
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {career.companies.slice(0, 5).join(', ')}
                      </p>
                    </div>
                  )}

                  {/* Growth Path */}
                  {career.growthPath.length > 0 && (
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Career Growth Path
                      </h4>
                      <div className="flex items-center gap-1 flex-wrap">
                        {career.growthPath.map((step, i) => (
                          <div key={step} className="flex items-center">
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {step}
                            </span>
                            {i < career.growthPath.length - 1 && (
                              <ChevronRight className="w-3 h-3 text-gray-400 mx-1" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Tips Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-purple-500" />
            Career Tips
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                🎯 Focus on Fundamentals
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Strong fundamentals are valued more than knowing many tools superficially.
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                💼 Build Projects
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Real projects demonstrate practical skills better than certifications alone.
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                🤝 Network Actively
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Many opportunities come through referrals. Build your professional network.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
