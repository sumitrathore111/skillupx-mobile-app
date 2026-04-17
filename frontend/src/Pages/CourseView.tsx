import {
    ArrowLeft,
    CheckCircle,
    Clock,
    Download,
    Lock,
    MessageCircle,
    Trophy,
    Youtube,
    Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';

const CourseView: React.FC = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projectSubmissions, setProjectSubmissions] = useState<{[key: number]: {githubUrl: string, liveUrl: string, status: 'pending' | 'approved' | 'rejected', feedback?: string}}>({});
  const [showSubmitModal, setShowSubmitModal] = useState<number | null>(null);
  const [githubUrl, setGithubUrl] = useState('');
  const [liveUrl, setLiveUrl] = useState('');

  // Course data - in production this would come from backend API
  const coursesData: any = {
    'web-101': {
      title: 'JavaScript Fundamentals',
      youtubePlaylist: 'https://www.youtube.com/watch?v=PkZNo7MFNFg',
      price: 499,
      mentorWhatsApp: '+919876543210',
      projects: [
        { title: 'Todo List App', description: 'Build a task management app with local storage', difficulty: 'Easy', estimatedTime: '3 days' },
        { title: 'Weather Dashboard', description: 'Fetch weather data from API and display', difficulty: 'Medium', estimatedTime: '5 days' },
        { title: 'Calculator App', description: 'Scientific calculator with all operations', difficulty: 'Easy', estimatedTime: '2 days' },
        { title: 'Quiz Application', description: 'Interactive quiz with timer and score', difficulty: 'Medium', estimatedTime: '4 days' },
        { title: 'Expense Tracker', description: 'Track income and expenses with charts', difficulty: 'Medium', estimatedTime: '6 days' }
      ]
    },
    'web-102': {
      title: 'React.js Complete Guide',
      youtubePlaylist: 'https://www.youtube.com/watch?v=w7ejDZ8SWv8',
      price: 799,
      mentorWhatsApp: '+919876543210',
      projects: [
        { title: 'Social Media Dashboard', description: 'Build a responsive dashboard with React', difficulty: 'Medium', estimatedTime: '7 days' },
        { title: 'E-commerce Product Page', description: 'Product listing with cart functionality', difficulty: 'Medium', estimatedTime: '8 days' },
        { title: 'Movie Search App', description: 'Search movies using TMDB API', difficulty: 'Easy', estimatedTime: '4 days' },
        { title: 'Blog Platform', description: 'Create, edit, delete blog posts with Firebase', difficulty: 'Hard', estimatedTime: '10 days' },
        { title: 'Real-time Chat App', description: 'Chat application with Firebase Realtime DB', difficulty: 'Hard', estimatedTime: '12 days' }
      ]
    },
    'web-103': {
      title: 'Node.js & Express Backend',
      youtubePlaylist: 'https://www.youtube.com/watch?v=Oe421EPjeBE',
      price: 799,
      mentorWhatsApp: '+919876543210',
      projects: [
        { title: 'RESTful API with MongoDB', description: 'Build complete CRUD API with authentication', difficulty: 'Medium', estimatedTime: '8 days' },
        { title: 'File Upload Service', description: 'Image upload with Cloudinary integration', difficulty: 'Medium', estimatedTime: '5 days' },
        { title: 'Real-time Chat Backend', description: 'WebSocket server with Socket.io', difficulty: 'Hard', estimatedTime: '10 days' },
        { title: 'Payment Gateway Integration', description: 'Razorpay/Stripe payment processing', difficulty: 'Hard', estimatedTime: '7 days' },
        { title: 'Authentication System', description: 'JWT, OAuth, password reset functionality', difficulty: 'Medium', estimatedTime: '6 days' }
      ]
    },
    'web-104': {
      title: 'MERN Stack Complete',
      youtubePlaylist: 'https://www.youtube.com/watch?v=7CqJlxBYj-M',
      price: 999,
      mentorWhatsApp: '+919876543210',
      projects: [
        { title: 'Social Media Platform', description: 'Full-stack Facebook clone with posts, likes, comments', difficulty: 'Hard', estimatedTime: '20 days' },
        { title: 'E-commerce Marketplace', description: 'Complete online store with cart and payments', difficulty: 'Hard', estimatedTime: '25 days' },
        { title: 'Video Streaming App', description: 'YouTube-like platform with video upload', difficulty: 'Hard', estimatedTime: '22 days' },
        { title: 'Project Management Tool', description: 'Trello/Jira alternative with drag-drop', difficulty: 'Hard', estimatedTime: '18 days' },
        { title: 'Learning Management System', description: 'Course platform like Udemy with enrollment', difficulty: 'Hard', estimatedTime: '24 days' }
      ]
    },
    'ai-101': {
      title: 'Machine Learning Fundamentals',
      youtubePlaylist: 'https://www.youtube.com/watch?v=GwIo3gDZCVQ',
      price: 799,
      mentorWhatsApp: '+919876543210',
      projects: [
        { title: 'House Price Predictor', description: 'Linear regression model for real estate', difficulty: 'Easy', estimatedTime: '5 days' },
        { title: 'Email Spam Classifier', description: 'Naive Bayes text classification', difficulty: 'Medium', estimatedTime: '6 days' },
        { title: 'Customer Segmentation', description: 'K-means clustering on purchase data', difficulty: 'Medium', estimatedTime: '7 days' },
        { title: 'Movie Recommendation System', description: 'Collaborative filtering recommender', difficulty: 'Medium', estimatedTime: '8 days' },
        { title: 'Sales Forecasting', description: 'Time series analysis with ARIMA', difficulty: 'Hard', estimatedTime: '9 days' }
      ]
    },
    'ai-102': {
      title: 'Deep Learning with TensorFlow',
      youtubePlaylist: 'https://www.youtube.com/watch?v=tPYj3fFJGjk',
      price: 999,
      mentorWhatsApp: '+919876543210',
      projects: [
        { title: 'Image Classifier', description: 'CNN for CIFAR-10 dataset classification', difficulty: 'Medium', estimatedTime: '10 days' },
        { title: 'Object Detection System', description: 'YOLO/SSD for real-time detection', difficulty: 'Hard', estimatedTime: '14 days' },
        { title: 'Face Recognition App', description: 'FaceNet embeddings for face matching', difficulty: 'Hard', estimatedTime: '12 days' },
        { title: 'Style Transfer Art', description: 'Neural style transfer for images', difficulty: 'Medium', estimatedTime: '8 days' },
        { title: 'Gesture Recognition', description: 'Hand gesture classification with CNN', difficulty: 'Hard', estimatedTime: '11 days' }
      ]
    },
    'ai-103': {
      title: 'Natural Language Processing',
      youtubePlaylist: 'https://www.youtube.com/watch?v=CMrHM8a3hqw',
      price: 999,
      mentorWhatsApp: '+919876543210',
      projects: [
        { title: 'Sentiment Analysis Tool', description: 'Analyze product reviews sentiment', difficulty: 'Medium', estimatedTime: '7 days' },
        { title: 'Chatbot with BERT', description: 'Question-answering chatbot', difficulty: 'Hard', estimatedTime: '12 days' },
        { title: 'Text Summarization', description: 'Automatic news article summarizer', difficulty: 'Hard', estimatedTime: '10 days' },
        { title: 'Named Entity Recognition', description: 'Extract entities from text documents', difficulty: 'Medium', estimatedTime: '8 days' },
        { title: 'Language Translation', description: 'Seq2seq model for translation', difficulty: 'Hard', estimatedTime: '14 days' }
      ]
    },
    'web-105': {
      title: 'Tailwind CSS Mastery',
      youtubePlaylist: 'https://www.youtube.com/watch?v=lCxcTsOHrjo',
      price: 499,
      mentorWhatsApp: '+919876543210',
      projects: [
        { title: 'Landing Page Portfolio', description: 'Modern portfolio with animations', difficulty: 'Easy', estimatedTime: '4 days' },
        { title: 'Dashboard UI', description: 'Admin panel with charts and tables', difficulty: 'Medium', estimatedTime: '6 days' },
        { title: 'E-commerce Product Grid', description: 'Responsive product listing page', difficulty: 'Easy', estimatedTime: '3 days' },
        { title: 'Social Media Feed', description: 'Instagram-like feed layout', difficulty: 'Medium', estimatedTime: '5 days' },
        { title: 'SaaS Pricing Page', description: 'Pricing cards with feature comparison', difficulty: 'Easy', estimatedTime: '3 days' }
      ]
    }
  };

  const course = coursesData[courseId || ''];

  useEffect(() => {
    // Check if user is enrolled
    const enrolled = localStorage.getItem(`enrolled_${courseId}`);
    setIsEnrolled(!!enrolled);
    
    if (enrolled) {
      const submissions = localStorage.getItem(`submissions_${courseId}`);
      if (submissions) {
        setProjectSubmissions(JSON.parse(submissions));
      }
    }
  }, [courseId]);

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Course not found</h2>
          <button onClick={() => navigate('/dashboard/courses')} className="text-cyan-600 hover:underline">
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  const handleEnroll = async () => {
    if (!user) {
      alert('Please login to enroll');
      navigate('/login');
      return;
    }

    setLoading(true);
    
    try {
      // Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);

      await new Promise((resolve) => {
        script.onload = resolve;
      });

      // Razorpay payment options
      const options = {
        key: 'rzp_test_YOUR_KEY_HERE', // Replace with your Razorpay key
        amount: course.price * 100, // Amount in paise
        currency: 'INR',
        name: 'NextStep',
        description: `${course.title} - Course Enrollment`,
        image: 'https://res.cloudinary.com/doytvgisa/image/upload/v1758623200/logo_evymhe.svg',
        handler: function (response: any) {
          // Payment successful
          console.log('Payment successful:', response);
          localStorage.setItem(`enrolled_${courseId}`, 'true');
          localStorage.setItem(`payment_${courseId}`, response.razorpay_payment_id);
          setIsEnrolled(true);
          setLoading(false);
          alert(`✅ Payment successful!\n\nYour enrollment is confirmed. Contact your mentor on WhatsApp to get started with your personalized project roadmap.`);
        },
        prefill: {
          name: user.name || '',
          email: user.email || '',
        },
        theme: {
          color: '#00ADB5'
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
          }
        }
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.on('payment.failed', function (response: any) {
        setLoading(false);
        alert(`Payment failed: ${response.error.description}`);
      });
      
      razorpay.open();
    } catch (error) {
      console.error('Enrollment failed:', error);
      alert('Failed to initialize payment. Please try again.');
      setLoading(false);
    }
  };

  const handleSubmitProject = (index: number) => {
    if (!githubUrl.trim()) {
      alert('Please enter your GitHub repository URL');
      return;
    }

    const newSubmissions = {
      ...projectSubmissions,
      [index]: {
        githubUrl: githubUrl.trim(),
        liveUrl: liveUrl.trim(),
        status: 'pending' as const,
        submittedAt: new Date().toISOString()
      }
    };

    setProjectSubmissions(newSubmissions);
    localStorage.setItem(`submissions_${courseId}`, JSON.stringify(newSubmissions));
    
    setShowSubmitModal(null);
    setGithubUrl('');
    setLiveUrl('');
    alert('✅ Project submitted for review! Your mentor will review it soon.');
  };

  const approvedProjects = Object.values(projectSubmissions).filter(s => s.status === 'approved').length;
  const progress = (approvedProjects / course.projects.length) * 100;
  const allCompleted = approvedProjects === course.projects.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button 
            onClick={() => navigate('/dashboard/courses')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Courses
          </button>
          <h1 className="text-3xl font-bold" style={{ color: '#00ADB5' }}>{course.title}</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2">
            {/* YouTube Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 dark:text-white">
                <Youtube className="w-6 h-6 text-red-500" />
                Course Videos (FREE)
              </h2>
              <button
                onClick={() => window.open(course.youtubePlaylist, '_blank')}
                className="w-full py-3 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-all flex items-center justify-center gap-2"
              >
                <Youtube className="w-5 h-5" />
                Watch on YouTube
              </button>
            </div>

            {/* Projects Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                  <Trophy className="w-6 h-6" style={{ color: '#00ADB5' }} />
                  5 Real-World Projects
                </h2>
                {isEnrolled && (
                  <div className="text-sm font-medium" style={{ color: '#00ADB5' }}>
                    {approvedProjects}/5 Approved
                  </div>
                )}
              </div>

              {isEnrolled && (
                <div className="mb-6">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div 
                      className="h-3 rounded-full transition-all"
                      style={{ 
                        width: `${progress}%`,
                        background: 'linear-gradient(90deg, #00ADB5 0%, #00d4ff 100%)'
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {course.projects.map((project: any, index: number) => {
                  const submission = projectSubmissions[index];
                  const isApproved = submission?.status === 'approved';
                  const isPending = submission?.status === 'pending';
                  const isRejected = submission?.status === 'rejected';

                  return (
                    <div 
                      key={index}
                      className={`border-2 rounded-xl p-4 transition-all ${
                        isEnrolled 
                          ? isApproved
                            ? 'border-green-400 bg-green-50'
                            : isPending
                            ? 'border-yellow-400 bg-yellow-50'
                            : isRejected
                            ? 'border-red-400 bg-red-50'
                            : 'border-gray-200 dark:border-gray-700 hover:border-cyan-300'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          {isEnrolled ? (
                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                              isApproved
                                ? 'bg-green-500 border-green-500'
                                : isPending
                                ? 'bg-yellow-500 border-yellow-500'
                                : isRejected
                                ? 'bg-red-500 border-red-500'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}>
                              {isApproved && <CheckCircle className="w-5 h-5 text-white" />}
                              {isPending && <Clock className="w-5 h-5 text-white" />}
                              {isRejected && <span className="text-white text-xs font-bold">✗</span>}
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                              <Lock className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg mb-1 dark:text-white">{project.title}</h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{project.description}</p>
                          <div className="flex items-center gap-4 text-sm mb-3">
                            <span className={`px-2 py-1 rounded ${
                              project.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                              project.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {project.difficulty}
                            </span>
                            <span className="flex items-center gap-1 text-gray-500">
                              <Clock className="w-4 h-4" />
                              {project.estimatedTime}
                            </span>
                          </div>

                          {isEnrolled && (
                            <>
                              {!submission && (
                                <button
                                  onClick={() => setShowSubmitModal(index)}
                                  className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-600 transition-all"
                                >
                                  Submit Project
                                </button>
                              )}

                              {isPending && (
                                <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 text-sm">
                                  <p className="font-medium text-yellow-800 mb-1">⏳ Under Review</p>
                                  <p className="text-yellow-700">Your mentor is reviewing your submission...</p>
                                </div>
                              )}

                              {isApproved && (
                                <div className="bg-green-100 border border-green-300 rounded-lg p-3 text-sm">
                                  <p className="font-medium text-green-800 mb-1">✅ Approved!</p>
                                  <a href={submission.githubUrl} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline">
                                    View on GitHub →
                                  </a>
                                  {submission.liveUrl && (
                                    <>
                                      {' | '}
                                      <a href={submission.liveUrl} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline">
                                        View Live →
                                      </a>
                                    </>
                                  )}
                                </div>
                              )}

                              {isRejected && (
                                <div className="bg-red-100 border border-red-300 rounded-lg p-3 text-sm">
                                  <p className="font-medium text-red-800 mb-1">❌ Needs Improvement</p>
                                  <p className="text-red-700 mb-2">{submission.feedback || 'Please contact mentor for details'}</p>
                                  <button
                                    onClick={() => setShowSubmitModal(index)}
                                    className="px-3 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600"
                                  >
                                    Resubmit
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            {!isEnrolled ? (
              /* Enrollment Card */
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sticky top-4">
                <div className="text-center mb-6">
                  <div className="text-4xl font-black mb-2" style={{ color: '#00ADB5' }}>
                    ₹{course.price}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">One-time payment</p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">YouTube course videos (FREE)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">5 curated real-world projects</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Personal mentor support</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">WhatsApp guidance</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Verified certificate on completion</span>
                  </div>
                </div>

                <button
                  onClick={handleEnroll}
                  disabled={loading}
                  className="w-full py-4 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}
                >
                  <Zap className="w-5 h-5" />
                  {loading ? 'Processing...' : `Enroll Now - ₹${course.price}`}
                </button>
              </div>
            ) : (
              /* Enrolled - Mentor Contact Card */
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" style={{ color: '#00ADB5' }} />
                    Contact Your Mentor
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Get personalized guidance and roadmap for completing all 5 projects.
                  </p>
                  <a
                    href={`https://wa.me/${course.mentorWhatsApp.replace('+', '')}?text=Hi, I enrolled in ${course.title}. Please guide me!`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-all flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-5 h-5" />
                    WhatsApp Mentor
                  </a>
                </div>

                {allCompleted && (
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl shadow-lg p-6 text-white text-center">
                    <Trophy className="w-16 h-16 mx-auto mb-4" />
                    <h3 className="font-bold text-xl mb-2">Congratulations!</h3>
                    <p className="mb-4">All 5 projects approved by mentor!</p>
                    <button className="w-full py-3 bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 rounded-lg font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2">
                      <Download className="w-5 h-5" />
                      Download Certificate
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submit Project Modal */}
      {showSubmitModal !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4 dark:text-white">Submit Project</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              Submit your completed project for mentor review. You'll receive feedback within 24-48 hours.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 dark:text-white">
                  GitHub Repository URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/username/repo"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 dark:text-white">
                  Live Demo URL (Optional)
                </label>
                <input
                  type="url"
                  value={liveUrl}
                  onChange={(e) => setLiveUrl(e.target.value)}
                  placeholder="https://yourproject.vercel.app"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="bg-cyan-50 dark:bg-cyan-900/30 border border-cyan-200 dark:border-cyan-700 rounded-lg p-3 text-sm">
                <p className="font-medium text-cyan-900 dark:text-cyan-100 mb-1">💡 Tips for approval:</p>
                <ul className="text-cyan-800 dark:text-cyan-200 space-y-1 ml-4 list-disc">
                  <li>Include a README with setup instructions</li>
                  <li>Add comments to your code</li>
                  <li>Test all features before submitting</li>
                  <li>Deploy to Vercel/Netlify for live demo</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowSubmitModal(null);
                  setGithubUrl('');
                  setLiveUrl('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmitProject(showSubmitModal)}
                className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 transition-all"
              >
                Submit for Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseView;
