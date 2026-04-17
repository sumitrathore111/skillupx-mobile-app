import {
    ArrowLeft,
    CheckCircle,
    ExternalLink,
    Eye,
    FileText,
    Github,
    MessageCircle,
    Package,
    Play,
    Shield,
    ShoppingCart,
    Star,
    Trophy,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useDataContext } from '../../Context/UserDataContext';
import { createOrGetChat } from '../../service/marketplaceChatService';
import {
    checkUserPurchased,
    createPurchase,
    createReview,
    getProjectById,
    getProjectReviews,
    incrementProjectViews,
} from '../../service/marketplaceService';
import {
    getPurchaseVideoStatus,
    getSellerAchievements,
    markVideoAsWatched,
} from '../../service/marketplaceServiceNew';
import type { MarketplaceProject, MarketplaceReview, SellerAchievements } from '../../types/marketplace';
import { CATEGORY_LABELS, LICENSE_LABELS } from '../../types/marketplace';
import ChatWindow from './components/ChatWindow';
import ImageGallery from './components/ImageGallery';
import PurchaseModal from './components/PurchaseModal';
import ReviewSection from './components/ReviewSection';

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const { userprofile, avatrUrl } = useDataContext();
  const navigate = useNavigate();

  const [project, setProject] = useState<MarketplaceProject | null>(null);
  const [reviews, setReviews] = useState<MarketplaceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [showChat, setShowChat] = useState(false);

  // Review form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Video watch tracking
  const [videoWatched, setVideoWatched] = useState({ demo: false, explanation: false });
  const [canReview, setCanReview] = useState(false);

  // Seller achievements
  const [sellerAchievements, setSellerAchievements] = useState<SellerAchievements | null>(null);

  useEffect(() => {
    if (projectId) {
      loadProject();
      incrementProjectViews(projectId);
    }
  }, [projectId]);

  const loadProject = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      const [projectData, reviewsData] = await Promise.all([
        getProjectById(projectId),
        getProjectReviews(projectId),
      ]);

      if (projectData) {
        setProject(projectData);
        setReviews(reviewsData);

        // Load seller achievements
        try {
          const achievements = await getSellerAchievements(projectData.sellerId);
          setSellerAchievements(achievements);
        } catch (err) {
          console.error('Error loading seller achievements:', err);
        }

        if (user?.id) {
          const purchased = await checkUserPurchased(user.id, projectId);
          setHasPurchased(purchased);

          // Load video watch status if purchased
          if (purchased) {
            try {
              const status = await getPurchaseVideoStatus(projectId, user.id);
              if (status) {
                setVideoWatched(status.videoWatched);
                setCanReview(status.canReview);
              }
            } catch (err) {
              console.error('Error loading video status:', err);
            }
          }
        }
      } else {
        toast.error('Project not found');
        navigate('/dashboard/marketplace');
      }
    } catch (error: any) {
      console.error('Error loading project:', error);
      const errorMessage = error?.code === 'permission-denied'
        ? 'Access denied. Please make sure Firestore rules are deployed.'
        : 'Failed to load project. Please try again.';
      toast.error(errorMessage);
      navigate('/dashboard/marketplace');
    } finally {
      setLoading(false);
    }
  };

  // Handle marking video as watched
  const handleMarkVideoWatched = async (videoType: 'demo' | 'explanation') => {
    if (!projectId || !user?.id) return;

    try {
      const result = await markVideoAsWatched(projectId, videoType, user.id);
      setVideoWatched(result.videoWatched);
      setCanReview(result.canReview);

      if (result.canReview) {
        toast.success('🎉 You can now leave a review!', { duration: 4000 });
      } else {
        toast.success(result.message);
      }
    } catch (error) {
      console.error('Error marking video as watched:', error);
      toast.error('Failed to update watch status');
    }
  };

  const handlePurchase = async () => {
    if (!user || !project) return;

    setIsPurchasing(true);
    try {
      await createPurchase(project.id, project, user.id, userprofile?.name || 'User');
      toast.success(project.isFree ? 'Project added to your library!' : 'Purchase successful!');
      setHasPurchased(true);
      setShowPurchaseModal(false);
      loadProject();
    } catch (error) {
      console.error('Error purchasing:', error);
      toast.error('Purchase failed. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleContactSeller = async () => {
    if (!user || !project) return;

    try {
      const result = await createOrGetChat(
        user.id,
        userprofile?.name || 'User',
        avatrUrl || '',
        project.sellerId,
        project.sellerName,
        project.sellerAvatar,
        project.id,
        project.title
      );

      if (result.status === 'pending') {
        if (result.isNew) {
          toast.success('Chat request sent! Waiting for seller to accept.');
        } else {
          toast('Your chat request is pending. Waiting for seller to accept.', {
            icon: '⏳',
          });
        }
        return;
      }

      if (result.status === 'rejected') {
        toast.error('Your chat request was declined by the seller.');
        return;
      }

      // Chat is accepted, open the chat window
      setActiveChat({
        id: result.chatId,
        participants: [user.id, project.sellerId],
        participantNames: {
          [user.id]: userprofile?.name || 'User',
          [project.sellerId]: project.sellerName,
        },
        participantAvatars: {
          [user.id]: avatrUrl || '',
          [project.sellerId]: project.sellerAvatar,
        },
        projectId: project.id,
        projectTitle: project.title,
        status: result.status,
        requesterId: user.id,
        sellerId: project.sellerId,
        lastMessage: '',
        lastMessageTime: new Date(),
        unreadCount: { [user.id]: 0, [project.sellerId]: 0 },
      });
      setShowChat(true);
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Failed to start chat');
    }
  };

  const handleSubmitReview = async () => {
    if (!user || !project || !reviewComment.trim()) {
      toast.error('Please write a review');
      return;
    }

    setIsSubmittingReview(true);
    try {
      await createReview(
        project.id,
        user.id,
        userprofile?.name || 'User',
        avatrUrl || '',
        reviewRating,
        reviewComment
      );
      toast.success('Review submitted!');
      setShowReviewForm(false);
      setReviewComment('');
      setReviewRating(5);
      loadProject();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#00ADB5', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!project) return null;

  const isOwnProject = user?.id === project.sellerId;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard/marketplace')}
          className="mb-6 flex items-center gap-2 text-gray-600 dark:text-white transition-colors"
          onMouseEnter={(e) => e.currentTarget.style.color = '#00ADB5'}
          onMouseLeave={(e) => e.currentTarget.style.color = ''}
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Marketplace
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <ImageGallery images={project.images} alt={project.title} />

            {/* Project Info */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {project.title}
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-white">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="font-semibold">{project.rating}</span>
                      <span>({project.reviewCount} reviews)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{project.views} views</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ShoppingCart className="w-4 h-4" />
                      <span>{project.purchases} sales</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Description
                </h3>
                <p className="text-gray-700 dark:text-white leading-relaxed whitespace-pre-wrap">
                  {project.description}
                </p>
              </div>

              {/* Tech Stack */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Tech Stack
                </h3>
                <div className="flex flex-wrap gap-2">
                  {project.techStack.map((tech, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium"
                      style={{ backgroundColor: 'rgba(0, 173, 181, 0.15)', color: '#00ADB5' }}
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Project Links */}
              {(project.links.github || project.links.liveDemo || project.links.documentation || project.links.video) && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Project Links
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {project.links.github && (
                      <a
                        href={hasPurchased || isOwnProject ? project.links.github : '#'}
                        target={hasPurchased || isOwnProject ? '_blank' : undefined}
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          if (!hasPurchased && !isOwnProject) {
                            e.preventDefault();
                            toast.error('Purchase to access');
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        <Github className="w-5 h-5" />
                        <span>GitHub Repository</span>
                        {!hasPurchased && !isOwnProject && <Shield className="w-4 h-4 ml-auto" />}
                      </a>
                    )}
                    {project.links.liveDemo && (
                      <a
                        href={project.links.liveDemo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <ExternalLink className="w-5 h-5" />
                        <span>Live Demo</span>
                      </a>
                    )}
                    {project.links.documentation && (
                      <a
                        href={hasPurchased || isOwnProject ? project.links.documentation : '#'}
                        target={hasPurchased || isOwnProject ? '_blank' : undefined}
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          if (!hasPurchased && !isOwnProject) {
                            e.preventDefault();
                            toast.error('Purchase to access');
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <FileText className="w-5 h-5" />
                        <span>Documentation</span>
                        {!hasPurchased && !isOwnProject && <Shield className="w-4 h-4 ml-auto" />}
                      </a>
                    )}
                    {project.links.video && (
                      <a
                        href={project.links.video}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <Play className="w-5 h-5" />
                        <span>Video Demo</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Project Videos Section */}
              {(project.links.demoVideo || project.links.explanationVideo) && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    📹 Project Videos
                    <span className="text-xs bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-1 rounded-full">
                      Watch & Review to support the creator!
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {project.links.demoVideo && (
                      <div className={`bg-gradient-to-br rounded-xl p-4 border ${
                        videoWatched.demo
                          ? 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-300 dark:border-green-700'
                          : 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700'
                      }`}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`p-2 rounded-lg ${videoWatched.demo ? 'bg-green-500' : 'bg-purple-500'}`}>
                            {videoWatched.demo ? <CheckCircle className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                              🎬 Demo Video
                              {videoWatched.demo && <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">✓ Watched</span>}
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">See the project in action</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <a
                            href={project.links.demoVideo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full px-4 py-3 bg-purple-600 text-white text-center rounded-lg hover:bg-purple-700 transition-colors font-medium"
                          >
                            Watch Demo Video →
                          </a>
                          {hasPurchased && !videoWatched.demo && (
                            <button
                              onClick={() => handleMarkVideoWatched('demo')}
                              className="w-full px-4 py-2 bg-green-600 text-white text-center rounded-lg hover:bg-green-700 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              I watched this video
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    {project.links.explanationVideo && (
                      <div className={`bg-gradient-to-br rounded-xl p-4 border ${
                        videoWatched.explanation
                          ? 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-300 dark:border-green-700'
                          : 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700'
                      }`}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`p-2 rounded-lg ${videoWatched.explanation ? 'bg-green-500' : 'bg-blue-500'}`}>
                            {videoWatched.explanation ? <CheckCircle className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                              💡 Explanation Video
                              {videoWatched.explanation && <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">✓ Watched</span>}
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Learn about the concept & idea</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <a
                            href={project.links.explanationVideo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full px-4 py-3 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors font-medium"
                          >
                            Watch Explanation Video →
                          </a>
                          {hasPurchased && !videoWatched.explanation && (
                            <button
                              onClick={() => handleMarkVideoWatched('explanation')}
                              className="w-full px-4 py-2 bg-green-600 text-white text-center rounded-lg hover:bg-green-700 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              I watched this video
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Video Watch Progress for Buyers */}
                  {hasPurchased && (project.links.demoVideo || project.links.explanationVideo) && (
                    <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300">Video Watch Progress:</span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded ${videoWatched.demo ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-200 text-gray-500 dark:bg-gray-600 dark:text-gray-400'}`}>
                            Demo {videoWatched.demo ? '✓' : '○'}
                          </span>
                          <span className={`px-2 py-1 rounded ${videoWatched.explanation ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-200 text-gray-500 dark:bg-gray-600 dark:text-gray-400'}`}>
                            Explanation {videoWatched.explanation ? '✓' : '○'}
                          </span>
                        </div>
                      </div>
                      {canReview ? (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-2 text-center">
                          ✅ You can now write a verified review!
                        </p>
                      ) : (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 text-center">
                          ⚠️ Watch both videos to write a verified review
                        </p>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-green-600 dark:text-green-400 mt-3 text-center">
                    🪙 Rate this project above 3.5 stars to reward the creator with coins!
                  </p>
                </div>
              )}

              {/* Project Details */}
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-sm text-gray-600 dark:text-white mb-1">Category</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {CATEGORY_LABELS[project.category]}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-white mb-1">License</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {LICENSE_LABELS[project.licenseType]}
                  </p>
                </div>
              </div>
            </div>

            {/* Reviews */}
            <ReviewSection
              reviews={reviews}
              averageRating={project.rating}
              totalReviews={project.reviewCount}
            />

            {/* Add Review */}
            {hasPurchased && !isOwnProject && (
              <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                {/* Not eligible to review - videos not watched */}
                {!canReview && (project.links.demoVideo || project.links.explanationVideo) ? (
                  <div className="text-center py-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-4">
                      <Play className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Watch Videos to Review
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                      Watch both the demo and explanation videos to unlock the ability to write a verified review.
                    </p>
                    <div className="flex items-center justify-center gap-4 text-sm">
                      <span className={`px-3 py-1 rounded-full ${videoWatched.demo ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                        {videoWatched.demo ? '✓' : '○'} Demo Video
                      </span>
                      <span className={`px-3 py-1 rounded-full ${videoWatched.explanation ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                        {videoWatched.explanation ? '✓' : '○'} Explanation Video
                      </span>
                    </div>
                  </div>
                ) : !showReviewForm ? (
                  <div>
                    {canReview && (
                      <div className="mb-3 p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-center">
                        <span className="text-sm text-green-700 dark:text-green-400">
                          <CheckCircle className="w-4 h-4 inline mr-1" />
                          Your review will be marked as "Verified Watcher"
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => setShowReviewForm(true)}
                      className="w-full px-4 py-3 text-white rounded-lg transition-colors font-semibold hover:opacity-90"
                      style={{ backgroundColor: '#00ADB5' }}
                    >
                      Write a Review
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      Write Your Review
                      {canReview && (
                        <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full">
                          ✓ Verified Watcher
                        </span>
                      )}
                    </h3>

                    {/* Rating */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                        Rating
                      </label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            onClick={() => setReviewRating(rating)}
                            className="focus:outline-none"
                          >
                            <Star
                              className={`w-8 h-8 ${
                                rating <= reviewRating
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-300 dark:text-gray-600'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      {/* Tiered Reward Info */}
                      <div className="mt-2 text-xs">
                        {reviewRating >= 5 && (
                          <p className="text-green-600 dark:text-green-400">
                            🪙 5⭐ = Seller earns <strong>20 coins</strong> (Excellent!)
                          </p>
                        )}
                        {reviewRating === 4 && (
                          <p className="text-blue-600 dark:text-blue-400">
                            🪙 4⭐ = Seller earns <strong>15 coins</strong> (Great!)
                          </p>
                        )}
                        {reviewRating >= 3.5 && reviewRating < 4 && (
                          <p className="text-amber-600 dark:text-amber-400">
                            🪙 3.5⭐ = Seller earns <strong>10 coins</strong> (Good!)
                          </p>
                        )}
                        {reviewRating > 0 && reviewRating < 3.5 && (
                          <p className="text-gray-500 dark:text-gray-400">
                            Ratings below 3.5 don't earn coins for the seller
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Comment */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                        Review
                      </label>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00ADB5]"
                        placeholder="Share your experience with this project..."
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowReviewForm(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmitReview}
                        disabled={isSubmittingReview || !reviewComment.trim()}
                        className="flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                        style={{ backgroundColor: '#00ADB5' }}
                      >
                        {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price & Purchase */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 sticky top-6">
              <div className="text-center mb-6">
                <p className="text-4xl font-bold mb-2" style={{ color: '#00ADB5' }}>
                  {project.isFree ? 'FREE' : `$${project.price}`}
                </p>
                <p className="text-sm text-gray-600 dark:text-white">
                  {LICENSE_LABELS[project.licenseType]}
                </p>
              </div>

              {isOwnProject ? (
                <Link
                  to="/dashboard/marketplace/my-listings"
                  className="block w-full px-4 py-3 bg-gray-600 text-white rounded-lg text-center font-semibold hover:bg-gray-700 transition-colors mb-3"
                >
                  View in My Listings
                </Link>
              ) : hasPurchased ? (
                <div className="text-center py-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg font-semibold mb-3">
                  ✓ Already Purchased
                </div>
              ) : (
                <button
                  onClick={() => setShowPurchaseModal(true)}
                  className="w-full px-4 py-3 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2 mb-3 hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}
                >
                  <ShoppingCart className="w-5 h-5" />
                  {project.isFree ? 'Get for Free' : 'Buy Now'}
                </button>
              )}

              {!isOwnProject && (
                <button
                  onClick={handleContactSeller}
                  className="w-full px-4 py-3 border-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 hover:bg-[#00ADB5]/10"
                  style={{ borderColor: '#00ADB5', color: '#00ADB5' }}
                >
                  <MessageCircle className="w-5 h-5" />
                  Contact Seller
                </button>
              )}

              {/* Seller Info */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-white mb-3">Sold by</p>
                <Link
                  to={`/dashboard/marketplace/seller/${project.sellerId}`}
                  className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
                >
                  <img
                    src={project.sellerAvatar || 'https://via.placeholder.com/40'}
                    alt={project.sellerName}
                    className="w-12 h-12 rounded-full border-2"
                    style={{ borderColor: '#00ADB5' }}
                  />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {project.sellerName}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-white">View Profile</p>
                  </div>
                </Link>

                {/* Seller Achievement Badges */}
                {sellerAchievements && sellerAchievements.badges.length > 0 && (
                  <div className="mt-4 p-3 bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">Seller Achievements</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sellerAchievements.badges.map((badge) => (
                        <div
                          key={badge.id}
                          className="group relative px-2 py-1 bg-white dark:bg-gray-800 rounded-full border border-amber-300 dark:border-amber-600 cursor-help"
                        >
                          <span className="text-sm">{badge.emoji} {badge.name}</span>
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                            {badge.description}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Seller Stats */}
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <span>💰</span>
                        <span>{sellerAchievements.stats.totalSales} sales</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <span>⭐</span>
                        <span>{sellerAchievements.stats.avgRating.toFixed(1)} avg rating</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <span>👁️</span>
                        <span>{sellerAchievements.stats.totalViews} views</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <span>🪙</span>
                        <span>{sellerAchievements.stats.totalCoinsEarned} coins earned</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* What's Included */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                What's Included
              </h3>
              <ul className="space-y-3 text-sm text-gray-700 dark:text-white">
                <li className="flex items-start gap-2">
                  <Package className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Full source code</span>
                </li>
                {project.links.github && (
                  <li className="flex items-start gap-2">
                    <Package className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>GitHub repository access</span>
                  </li>
                )}
                {project.links.documentation && (
                  <li className="flex items-start gap-2">
                    <Package className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Complete documentation</span>
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <Package className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>{LICENSE_LABELS[project.licenseType]}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Package className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Lifetime access</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Modal */}
      <PurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        project={project}
        onConfirm={handlePurchase}
        isPurchasing={isPurchasing}
      />

      {/* Chat Window */}
      {activeChat && (
        <ChatWindow chat={activeChat} isOpen={showChat} onClose={() => setShowChat(false)} />
      )}
    </div>
  );
}



