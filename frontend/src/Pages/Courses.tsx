import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle,
  Clock,
  Code,
  Play,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Users,
  Youtube
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';

interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  duration: string;
  lessons: number;
  students: number;
  rating: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  tags: string[];
  thumbnail: string;
  category: 'AI' | 'Web Development';
  youtubePlaylist: string;
  price: number;
  mentorWhatsApp: string;
  projects: {
    title: string;
    description: string;
    difficulty: string;
    estimatedTime: string;
  }[];
}

const Courses: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'AI' | 'Web Development'>('all');

  const handleStartCourse = (course: Course) => {
    if (!user) {
      alert('Please login to view course details');
      navigate('/login');
      return;
    }
    // Navigate to course detail page
    navigate(`/dashboard/courses/${course.id}`);
  };

  const handleJoinProject = () => {
    if (!user) {
      alert('Please login to join projects');
      navigate('/login');
      return;
    }
    navigate('/dashboard/projects');
  };

  // All Courses with 5 curated projects each
  const allCourses: Course[] = [
    {
      id: 'web-101',
      title: 'JavaScript Fundamentals',
      description: 'Learn JavaScript from scratch - variables, functions, DOM manipulation, and ES6+',
      instructor: 'freeCodeCamp',
      duration: '4 weeks',
      lessons: 28,
      students: 15670,
      rating: 4.8,
      level: 'Beginner',
      tags: ['JavaScript', 'ES6', 'Web'],
      thumbnail: 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?auto=format&fit=crop&w=800&q=80',
      category: 'Web Development',
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
    {
      id: 'web-102',
      title: 'React.js Complete Guide',
      description: 'Build modern web applications with React, Hooks, Context API, and best practices',
      instructor: 'Traversy Media',
      duration: '6 weeks',
      lessons: 35,
      students: 24320,
      rating: 4.9,
      level: 'Intermediate',
      tags: ['React', 'Hooks', 'Components'],
      thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=800&q=80',
      category: 'Web Development',
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
    {
      id: 'web-103',
      title: 'Node.js & Express Backend',
      description: 'Create powerful REST APIs and server-side applications with Node.js',
      instructor: 'Academind',
      duration: '5 weeks',
      lessons: 30,
      students: 18890,
      rating: 4.7,
      level: 'Intermediate',
      tags: ['Node.js', 'Express', 'API'],
      thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?auto=format&fit=crop&w=800&q=80',
      category: 'Web Development',
      youtubePlaylist: 'https://www.youtube.com/watch?v=Oe421EPjeBE',
      price: 799,
      mentorWhatsApp: '+919876543210',
      projects: [
        { title: 'RESTful Task API', description: 'CRUD API for task management', difficulty: 'Easy', estimatedTime: '5 days' },
        { title: 'Authentication System', description: 'JWT-based auth with login/signup', difficulty: 'Medium', estimatedTime: '7 days' },
        { title: 'Blog Backend API', description: 'Complete blog API with MongoDB', difficulty: 'Medium', estimatedTime: '8 days' },
        { title: 'File Upload Service', description: 'Image upload with Cloudinary/AWS S3', difficulty: 'Medium', estimatedTime: '6 days' },
        { title: 'E-commerce API', description: 'Products, cart, orders, payment integration', difficulty: 'Hard', estimatedTime: '12 days' }
      ]
    },
    {
      id: 'web-104',
      title: 'Full Stack Development - MERN',
      description: 'Become a full stack developer with MongoDB, Express, React, Node.js',
      instructor: 'The Net Ninja',
      duration: '12 weeks',
      lessons: 65,
      students: 32540,
      rating: 4.9,
      level: 'Advanced',
      tags: ['MERN', 'Full Stack', 'MongoDB'],
      thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
      category: 'Web Development',
      youtubePlaylist: 'https://www.youtube.com/watch?v=98BzS5Oz5E4&list=PL4cUxeGkcC9iJ_KkrkBZWZRHVwnzLIoUE',
      price: 999,
      mentorWhatsApp: '+919876543210',
      projects: [
        { title: 'Social Media App', description: 'Full stack app with posts, likes, comments', difficulty: 'Hard', estimatedTime: '15 days' },
        { title: 'Job Portal', description: 'Job listings, applications, employer dashboard', difficulty: 'Hard', estimatedTime: '18 days' },
        { title: 'E-learning Platform', description: 'Course management, video streaming, quizzes', difficulty: 'Hard', estimatedTime: '20 days' },
        { title: 'Real Estate Listing', description: 'Property listings with map integration', difficulty: 'Medium', estimatedTime: '12 days' },
        { title: 'Project Management Tool', description: 'Tasks, teams, Kanban board, real-time updates', difficulty: 'Hard', estimatedTime: '22 days' }
      ]
    },
    {
      id: 'ai-101',
      title: 'AI & Machine Learning Basics',
      description: 'Master AI and ML fundamentals with Python and hands-on projects',
      instructor: 'Andrew Ng - Coursera',
      duration: '8 weeks',
      lessons: 45,
      students: 42340,
      rating: 4.9,
      level: 'Beginner',
      tags: ['AI', 'Machine Learning', 'Python'],
      thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80',
      category: 'AI',
      youtubePlaylist: 'https://www.youtube.com/watch?v=jGwO_UgTS7I&list=PLoROMvodv4rMiGQp3WXShtMGgzqpfVfbU',
      price: 999,
      mentorWhatsApp: '+919876543210',
      projects: [
        { title: 'House Price Predictor', description: 'Linear regression model for price prediction', difficulty: 'Easy', estimatedTime: '6 days' },
        { title: 'Email Spam Classifier', description: 'Classify emails as spam/not spam', difficulty: 'Medium', estimatedTime: '7 days' },
        { title: 'Handwritten Digit Recognition', description: 'MNIST dataset with neural networks', difficulty: 'Medium', estimatedTime: '8 days' },
        { title: 'Movie Recommendation System', description: 'Build collaborative filtering recommender', difficulty: 'Medium', estimatedTime: '10 days' },
        { title: 'Customer Segmentation', description: 'K-means clustering for market segmentation', difficulty: 'Medium', estimatedTime: '9 days' }
      ]
    },
    {
      id: 'ai-102',
      title: 'Deep Learning with Python',
      description: 'Build neural networks and deep learning models from scratch',
      instructor: 'Sentdex',
      duration: '10 weeks',
      lessons: 52,
      students: 28890,
      rating: 4.8,
      level: 'Intermediate',
      tags: ['Deep Learning', 'TensorFlow', 'Neural Networks'],
      thumbnail: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=800&q=80',
      category: 'AI',
      youtubePlaylist: 'https://www.youtube.com/watch?v=WvoLTXIjBYU&list=PLQVvvaa0QuDfhTox0AjmQ6tvTgMBZBEXN',
      price: 999,
      mentorWhatsApp: '+919876543210',
      projects: [
        { title: 'Image Classification CNN', description: 'Build CNN for image classification', difficulty: 'Medium', estimatedTime: '10 days' },
        { title: 'Object Detection Model', description: 'Detect objects in images using YOLO', difficulty: 'Hard', estimatedTime: '14 days' },
        { title: 'Face Recognition System', description: 'Real-time face detection and recognition', difficulty: 'Hard', estimatedTime: '12 days' },
        { title: 'Sentiment Analysis', description: 'LSTM for tweet sentiment classification', difficulty: 'Medium', estimatedTime: '9 days' },
        { title: 'Style Transfer App', description: 'Transfer artistic style to photos', difficulty: 'Hard', estimatedTime: '11 days' }
      ]
    },
    {
      id: 'ai-103',
      title: 'Natural Language Processing',
      description: 'Learn NLP techniques, build chatbots with transformers and LLMs',
      instructor: 'Stanford NLP',
      duration: '6 weeks',
      lessons: 38,
      students: 19560,
      rating: 4.9,
      level: 'Advanced',
      tags: ['NLP', 'Transformers', 'LLM'],
      thumbnail: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?auto=format&fit=crop&w=800&q=80',
      category: 'AI',
      youtubePlaylist: 'https://www.youtube.com/watch?v=rmVRLeJRkl4&list=PLoROMvodv4rOSH4v6133s9LFPRHjEmbmJ',
      price: 999,
      mentorWhatsApp: '+919876543210',
      projects: [
        { title: 'Chatbot with BERT', description: 'Build Q&A chatbot using transformers', difficulty: 'Hard', estimatedTime: '12 days' },
        { title: 'Text Summarization', description: 'Automatic text summarizer using T5', difficulty: 'Medium', estimatedTime: '10 days' },
        { title: 'Language Translation', description: 'Build EN-HI translator with transformers', difficulty: 'Hard', estimatedTime: '14 days' },
        { title: 'Named Entity Recognition', description: 'Extract entities from text using SpaCy', difficulty: 'Medium', estimatedTime: '8 days' },
        { title: 'Content Moderation AI', description: 'Detect toxic/harmful content in text', difficulty: 'Medium', estimatedTime: '9 days' }
      ]
    },
    {
      id: 'web-105',
      title: 'Tailwind CSS Mastery',
      description: 'Design beautiful, responsive websites with utility-first CSS',
      instructor: 'Tailwind Labs',
      duration: '3 weeks',
      lessons: 20,
      students: 12890,
      rating: 4.7,
      level: 'Beginner',
      tags: ['Tailwind', 'CSS', 'Design'],
      thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
      category: 'Web Development',
      youtubePlaylist: 'https://www.youtube.com/watch?v=UBOj6rqRUME',
      price: 499,
      mentorWhatsApp: '+919876543210',
      projects: [
        { title: 'Landing Page', description: 'Modern landing page with animations', difficulty: 'Easy', estimatedTime: '3 days' },
        { title: 'Portfolio Website', description: 'Personal portfolio with dark mode', difficulty: 'Easy', estimatedTime: '4 days' },
        { title: 'Admin Dashboard', description: 'Responsive admin panel UI', difficulty: 'Medium', estimatedTime: '6 days' },
        { title: 'E-commerce Homepage', description: 'Product showcase with filters', difficulty: 'Medium', estimatedTime: '5 days' },
        { title: 'SaaS Website', description: 'Complete SaaS landing with pricing', difficulty: 'Medium', estimatedTime: '7 days' }
      ]
    }
  ];

  const filteredCourses = selectedCategory === 'all' 
    ? allCourses 
    : allCourses.filter(c => c.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <header className="relative overflow-hidden pt-12 pb-20" style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-yellow-300" />
            <span className="px-4 py-1.5 rounded-full text-sm font-medium bg-white/20 backdrop-blur-sm text-white border border-white/30">
              🎓 100% FREE Learning + Real Project Experience
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-4 text-white">
            Learn. Build. Get Certified.
          </h1>
          <p className="text-xl text-white/90 mb-8 max-w-3xl">
            Watch curated YouTube courses → Work on real projects with teams → Earn verified certificates
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl">
            {[
              { icon: Youtube, label: 'Free Courses', value: '8' },
              { icon: Code, label: 'Real Projects', value: '100+' },
              { icon: Users, label: 'Active Learners', value: '2,500+' },
              { icon: Trophy, label: 'Certificates', value: 'Verified' }
            ].map((stat, idx) => (
              <div key={idx} className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20">
                <div className="flex items-center gap-2 text-sm text-white/80 mb-1">
                  <stat.icon className="w-5 h-5" /> {stat.label}
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* How it Works Section */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12" style={{ color: '#00ADB5' }}>
          How NextStep Works
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: '1',
              icon: Youtube,
              title: 'Watch Free Courses',
              description: 'Access curated YouTube playlists from top instructors - 100% FREE',
              color: '#FF0000'
            },
            {
              step: '2',
              icon: Code,
              title: 'Join Real Projects',
              description: 'Browse and join projects posted by developers - apply your skills with real teams',

              color: '#00ADB5'
            },
            {
              step: '3',
              icon: Award,
              title: 'Earn Certificate',
              description: 'Complete projects and get verified certificates for just ₹299-₹499',
              color: '#FFD700'
            }
          ].map((item, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 dark:border-gray-700 hover:border-cyan-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: item.color }}>
                  {item.step}
                </div>
                <item.icon className="w-8 h-8" style={{ color: item.color }} />
              </div>
              <h3 className="text-xl font-bold mb-2 dark:text-white">{item.title}</h3>
              <p className="text-gray-600 dark:text-gray-400">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Category Filter */}
      <section className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 overflow-x-auto">
            {['all', 'Web Development', 'AI'].map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category as any)}
                className={`px-5 py-2 rounded-full font-medium transition-all whitespace-nowrap ${
                  selectedCategory === category
                    ? 'text-white shadow-lg'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                style={{
                  backgroundColor: selectedCategory === category ? '#00ADB5' : ''
                }}
              >
                {category === 'all' ? 'All Courses' : category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Courses Grid */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {filteredCourses.map((course) => (
            <article
              key={course.id}
              className="group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
            >
              {/* Thumbnail */}
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={course.thumbnail} 
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-16 h-16 text-white" />
                </div>
                <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full font-bold text-sm flex items-center gap-1">
                  <Youtube className="w-4 h-4" /> FREE
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    course.level === 'Beginner' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                    course.level === 'Intermediate' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                    'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                  }`}>
                    {course.level}
                  </span>
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{course.rating}</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">{course.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{course.description}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">by {course.instructor}</p>

                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
                  <Clock className="w-4 h-4" />
                  <span>{course.duration}</span>
                  <span className="text-gray-300">•</span>
                  <BookOpen className="w-4 h-4" />
                  <span>{course.lessons} lessons</span>
                </div>

                <div className="flex items-center gap-2 text-sm mb-3" style={{ color: '#00ADB5' }}>
                  <Code className="w-4 h-4" />
                  <span className="font-semibold">5 Curated Projects + Mentor</span>
                </div>

                <div className="border-t dark:border-gray-700 pt-3 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">YouTube: FREE</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Full Package</p>
                      <p className="text-xl font-bold" style={{ color: '#00ADB5' }}>₹{course.price}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleStartCourse(course)}
                  className="w-full mb-2 py-3 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}
                >
                  <Trophy className="w-5 h-5" />
                  View Course Details
                </button>

                <button
                  onClick={handleJoinProject}
                  className="w-full py-2 rounded-xl font-medium border-2 transition-all hover:bg-cyan-50 dark:hover:bg-cyan-900/30"
                  style={{ borderColor: '#00ADB5', color: '#00ADB5' }}
                >
                  Browse Projects →
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-gradient-to-r from-cyan-500 to-blue-600 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-300" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Build Your Portfolio?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join real projects posted by developers and work with experienced teams
          </p>
          <button
            onClick={handleJoinProject}
            className="px-8 py-4 bg-white dark:bg-gray-800 text-cyan-600 dark:text-cyan-400 font-bold rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 flex items-center gap-2 mx-auto text-lg"
          >
            <ArrowRight className="w-6 h-6" />
            Browse Open Projects
          </button>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12" style={{ color: '#00ADB5' }}>
          Why Choose NextStep?
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          {[
            {
              icon: TrendingUp,
              title: 'Real Experience > Video Certificates',
              description: 'Work on live projects with real teams instead of just watching videos'
            },
            {
              icon: Users,
              title: 'Build Your Network',
              description: 'Collaborate with developers, get mentorship, and grow your professional network'
            },
            {
              icon: Code,
              title: 'Portfolio That Stands Out',
              description: 'Showcase actual contributions to real projects, not tutorial clones'
            },
            {
              icon: Award,
              title: 'Verified Certificates',
              description: 'Get certificates endorsed by project creators who worked with you'
            }
          ].map((benefit, idx) => (
            <div key={idx} className="flex gap-4 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 173, 181, 0.1)' }}>
                  <benefit.icon className="w-6 h-6" style={{ color: '#00ADB5' }} />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2 dark:text-white">{benefit.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Courses;
