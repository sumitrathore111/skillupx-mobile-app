import { ArrowRight, Award, BookOpen, CheckCircle, ClipboardList, Code, Compass, FolderOpen, Gift, Globe, History, Lightbulb, Mail, Map, MessageCircle, RefreshCw, Search, Sparkles, Swords, Target, Trophy, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from "../Component/SEO";

const NextStepDocumentation = () => {
  type DocSection = 'getting-started' | 'creator-corner' | 'codearena' | 'learning-roadmaps' | 'developer-connect';
  const [activeSection, setActiveSection] = useState<DocSection>('getting-started');
  const navigate = useNavigate();

  const navItems: { id: DocSection; icon: any; label: string; gradient: string; description: string }[] = [
    { id: 'getting-started', icon: Compass, label: 'Getting Started', gradient: 'from-blue-500 to-cyan-500', description: 'Begin your journey' },
    { id: 'creator-corner', icon: Lightbulb, label: 'Creator Corner', gradient: 'from-purple-500 to-pink-500', description: 'Collaborate & build' },
    { id: 'codearena', icon: Swords, label: 'CodeArena', gradient: 'from-orange-500 to-red-500', description: 'Battle & earn coins' },
    { id: 'learning-roadmaps', icon: Map, label: 'Learning Roadmaps', gradient: 'from-emerald-500 to-teal-500', description: 'Your learning path' },
    { id: 'developer-connect', icon: Users, label: 'Developer Connect', gradient: 'from-indigo-500 to-purple-500', description: 'Network & connect' },
  ];

  const content = {
    'getting-started': {
      title: 'Getting Started with SkillUpX',
      icon: Compass,
      gradient: 'from-blue-500 to-cyan-500',
      sections: [
        {
          heading: '🌟 Welcome to SkillUpX',
          text: 'SkillUpX is the ultimate platform for developers who want to level up! Whether you\'re a beginner starting your coding journey or an experienced developer looking to sharpen your skills, SkillUpX has everything you need.\n\n🎮 Battle in CodeArena & earn coins\n💡 Collaborate on exciting projects\n🛒 Buy & sell templates in Project Bazaar\n📚 Learn from curated courses\n🏆 Earn certificates & climb leaderboards',
          image: '🌟'
        },
        {
          heading: '🚀 Quick Start Guide',
          text: '1️⃣ Create Your Account\nSign up and receive 1000 welcome coins instantly!\n\n2️⃣ Complete Your Profile\nAdd your skills, interests, and goals to get personalized recommendations.\n\n3️⃣ Explore the Platform\n• CodeArena: Battle 1v1 and win coins\n• Creator Corner: Join or create project teams\n• Project Bazaar: Buy templates or sell your work\n• Courses: Learn new technologies\n\n4️⃣ Start Your Journey\nJump into battles, join projects, or start learning!',
          image: '🚀'
        },
        {
          heading: '💰 Coins & Rewards System',
          text: 'Coins are the heart of SkillUpX! Earn and use them across the platform.\n\n💎 How to Earn Coins:\n• 🎁 1000 coins on signup (Welcome Bonus)\n• ⚔️ Win 1v1 coding battles (50-500 coins)\n• ✅ Solve practice problems (10-100 coins)\n• 🔥 Daily login streaks (25-200 coins)\n• 🏆 Leaderboard positions (500-5000 coins)\n\n🛒 Use Coins For:\n• Enter premium battles\n• Purchase from Project Bazaar\n• Unlock exclusive features',
          image: '💰'
        },
        {
          heading: '🎯 Platform Features at a Glance',
          text: '⚔️ CodeArena\nReal-time 1v1 coding battles, global rankings, rematch system, and 3000+ practice problems.\n\n💡 Creator Corner\nPost project ideas, find collaborators, assign tasks, team chat, and earn verified certificates after 50 tasks.\n\n🛒 Project Bazaar\nBuy premium templates, UI components, and complete projects. Sell your creations with 80% revenue share!\n\n📚 Courses\nCurated learning paths, video tutorials, interactive challenges, and skill certifications.',
          image: '🎯'
        },
        {
          heading: '🏅 Achievements & Certificates',
          text: 'Your progress is rewarded at every step!\n\n🎖️ Badges & Ranks:\n• Bronze → Silver → Gold → Platinum → Legendary\n• Unlock special badges for milestones\n• Showcase achievements on your profile\n\n📜 Verified Certificates:\n• Complete 50 tasks in Creator Corner\n• Download and share on LinkedIn\n• QR code verification for authenticity\n\n👑 Leaderboard Glory:\n• Compete globally and regionally\n• Weekly & monthly champions\n• Exclusive rewards for top performers',
          image: '🏅'
        },
        {
          heading: '🤝 Join Our Community',
          text: 'SkillUpX is more than a platform - it\'s a community of passionate developers!\n\n🌍 What You Get:\n• Connect with active developers worldwide\n• Find mentors and collaborators\n• Share knowledge and learn together\n• Participate in community events\n• Get help when you\'re stuck\n\n🚀 Ready to begin?\nCreate your account now and take your first step towards becoming a better developer!',
          image: '🤝'
        }
      ]
    },
    'creator-corner': {
      title: 'Creator Corner - Collaborate & Build Together',
      icon: Lightbulb,
      gradient: 'from-purple-500 to-pink-500',
      sections: [
        {
          heading: '💡 Turn Your Ideas Into Reality',
          text: 'Have a brilliant project idea but no team to build it? Creator Corner is your gateway to finding passionate collaborators! Register your project idea and let talented developers join your mission.\n\n• Post your project ideas with detailed descriptions\n• Set required skills and team size\n• Attract collaborators from our global community\n• Build your dream team without any hassle\n• Transform concepts into working products together',
          image: '💡'
        },
        {
          heading: '🔍 Browse Projects - Find Your Next Adventure',
          text: 'Explore hundreds of exciting project ideas submitted by creators worldwide! Filter by technology, difficulty, or domain to find projects that match your interests.\n\n• Discover innovative project ideas daily\n• Filter by tech stack (React, Node, Python, etc.)\n• See project requirements and team openings\n• Apply to join projects that excite you\n• Learn by working on real-world applications\n• Build your portfolio with diverse projects',
          image: '🔍'
        },
        {
          heading: '✅ Tasks Completed - Track Your Contributions',
          text: 'Every contribution counts! Track your completed tasks across all projects and watch your progress grow. Complete 50 verified tasks to unlock your Verified Certificate!\n\n🏆 Milestone Rewards:\n• 10 Tasks: Bronze Collaborator Badge\n• 25 Tasks: Silver Collaborator Badge\n• 50 Tasks: 🎓 Verified Certificate + Gold Badge\n• 100 Tasks: Platinum Expert Badge\n• 200 Tasks: Diamond Legend Badge\n\n📜 Your Verified Certificate can be downloaded from your profile and shared on LinkedIn!',
          image: '✅'
        },
        {
          heading: '📁 My Projects - Manage Your Creations',
          text: 'Take full control of your project ideas! Create, edit, and manage all your projects from one centralized dashboard.\n\n• Create new project ideas with rich descriptions\n• Edit project details and requirements anytime\n• Delete projects that are no longer active\n• Assign tasks to collaborators\n• Track team progress and contributions\n• Review and approve completed tasks\n• Communicate with your team seamlessly',
          image: '📁'
        },
        {
          heading: '📨 Project Invitations - Build Your Dream Team',
          text: 'As a project owner, you can directly invite talented developers to join your project! Browse Developer Connect and send personalized invitations with a direct join link.\n\n✨ Invite Features:\n• Browse all developers from Developer Connect\n• Search and filter by skills\n• Send personalized invitation messages\n• Unique invite link for each developer\n• Invited users receive in-app message\n• Email notification with join button\n• Links expire after 7 days for security\n• Track pending invitations\n\n🔒 Only project owners can send invites - ensuring team quality control!',
          image: '📨'
        },
        {
          heading: '💬 Team Chat - Seamless Communication',
          text: 'Stay connected with your team through built-in real-time chat! Discuss ideas, share resources, and coordinate tasks without leaving the platform.\n\n• Real-time messaging with team members\n• Share code snippets and files\n• Create task-specific discussion threads\n• Get notifications for important updates\n• Voice and video call integration (coming soon)\n• Keep all project communication in one place',
          image: '💬'
        },
        {
          heading: '🎓 Earn Your Verified Certificate',
          text: 'Your hard work deserves recognition! Complete 50 verified tasks across any projects to earn your official SkillUpX Verified Collaborator Certificate.\n\n📋 Certificate Includes:\n• Your name and profile photo\n• Total tasks completed\n• Projects contributed to\n• Skills demonstrated\n• Unique verification QR code\n• Shareable LinkedIn badge\n\n🌟 This certificate validates your real-world collaboration experience!',
          image: '🎓'
        }
      ]
    },
    'codearena': {
      title: 'CodeArena - Battle, Win & Conquer',
      icon: Swords,
      gradient: 'from-orange-500 to-red-500',
      sections: [
        {
          heading: '⚔️ Epic 1v1 Coding Battles',
          text: 'Enter the arena and face developers from around the world in thrilling 1v1 coding duels! Solve problems faster and more accurately than your opponent to claim victory and earn coins.\n\n• Real-time head-to-head battles\n• Matched with opponents of similar skill\n• Time-limited challenges add intensity\n• Watch your opponent\'s progress live\n• Winner takes the coin reward\n• Improve your problem-solving speed',
          image: '⚔️'
        },
        {
          heading: '🎁 1000 Coins Welcome Bonus',
          text: 'Start your CodeArena journey with a bang! Every new user receives 1000 coins instantly upon registration. Use these coins to enter battles, unlock premium features, and start building your empire!\n\n💰 Ways to Earn More Coins:\n• 🏆 Win 1v1 Battles: 50-500 coins\n• ✅ Solve Practice Problems: 10-100 coins\n• 🔥 Daily Login Streak: 25-200 coins\n• 🎯 Complete Challenges: 100-1000 coins\n• 👑 Leaderboard Positions: 500-5000 coins\n• 🔄 Rematch Victories: 2x coin bonus',
          image: '🎁'
        },
        {
          heading: '🌍 Global Rankings & Leaderboards',
          text: 'Climb the ranks and establish your dominance on the global leaderboard! Compete with the best coders worldwide and prove your skills.\n\n🏅 Ranking Tiers:\n• 🥉 Bronze: 0-1000 rating\n• 🥈 Silver: 1000-1500 rating\n• 🥇 Gold: 1500-2000 rating\n• 💎 Platinum: 2000-2500 rating\n• 👑 Legendary: 2500+ rating\n\n📊 Features:\n• Real-time global rankings\n• Weekly & monthly champions\n• Country-wise leaderboards\n• Exclusive badges for top 100',
          image: '🌍'
        },
        {
          heading: '📜 Battle History & Rematch',
          text: 'Every battle is recorded! Review your past performances, analyze your strategies, and challenge opponents to a rematch for redemption or glory.\n\n• Complete battle history with details\n• View opponent\'s profile and stats\n• One-click rematch request\n• Analyze time taken per problem\n• See winning/losing patterns\n• Track your improvement over time\n• Share epic battle moments',
          image: '📜'
        },
        {
          heading: '🔄 Rematch System',
          text: 'Lost a close battle? Want to prove it was a fluke? Challenge your opponent to a rematch instantly!\n\n• Send rematch request after any battle\n• Opponent has 24 hours to accept\n• 2x coin bonus for rematch victories\n• Build rivalries and track head-to-head stats\n• Prove your improvement over time\n• Special "Revenge Victory" badge available',
          image: '🔄'
        },
        {
          heading: '💪 Practice Arena - 3000+ Problems',
          text: 'Sharpen your skills with our massive collection of 3000+ DSA problems! Practice makes perfect, and every solved problem earns you coins.\n\n📚 Problem Categories:\n• Arrays & Strings: 500+ problems\n• Linked Lists & Stacks: 300+ problems\n• Trees & Graphs: 400+ problems\n• Dynamic Programming: 350+ problems\n• Sorting & Searching: 250+ problems\n• Math & Logic: 300+ problems\n• And many more!\n\n💰 Earn 10-100 coins per problem based on difficulty!',
          image: '💪'
        },
        {
          heading: '🏆 Rewards & Achievements',
          text: 'Unlock exclusive rewards and showcase your achievements! From coins to badges to special titles, your hard work is always recognized.\n\n🎖️ Achievement Categories:\n• Battle Victories (10, 50, 100, 500 wins)\n• Practice Streaks (7, 30, 100 days)\n• Problem Mastery (Easy, Medium, Hard expert)\n• Leaderboard Positions (Top 100, 50, 10)\n• Special Event Champions\n• Community Contributor badges',
          image: '🏆'
        }
      ]
    },
    'learning-roadmaps': {
      title: 'Learning Roadmaps - Your Path to Success',
      icon: Map,
      gradient: 'from-emerald-500 to-teal-500',
      sections: [
        {
          heading: '🗺️ Structured Learning Paths',
          text: 'Welcome to Learning Roadmaps - your personalized guide to mastering new technologies! Follow structured paths designed by experts to take you from beginner to pro.\n\n• Browse curated learning roadmaps\n• Follow step-by-step progression\n• Track your learning progress\n• Learn at your own pace\n• Get recommendations based on goals',
          image: '🗺️'
        },
        {
          heading: '📚 Technology Roadmaps',
          text: 'Explore comprehensive roadmaps for various technologies and career paths!\n\n🛤️ Available Roadmaps:\n• Frontend Development (React, Vue, Angular)\n• Backend Development (Node.js, Python, Java)\n• Full-Stack Web Development\n• Mobile App Development\n• DevOps & Cloud Computing\n• Data Science & Machine Learning\n• System Design & Architecture\n• Competitive Programming',
          image: '📚'
        },
        {
          heading: '✅ Track Your Progress',
          text: 'Mark topics as completed and visualize your learning journey! Stay motivated by seeing how far you\'ve come.\n\n📊 Progress Features:\n• Mark topics as completed\n• Visual progress indicators\n• Skill level tracking\n• Time spent learning\n• Achievement milestones\n• Resume where you left off',
          image: '✅'
        },
        {
          heading: '🎯 Skill-Based Recommendations',
          text: 'Get personalized roadmap suggestions based on your current skills and career goals!\n\n💡 Smart Recommendations:\n• Based on your skill gaps\n• Aligned with career goals\n• Industry-relevant paths\n• Trending technologies\n• Beginner-friendly options\n• Advanced specializations',
          image: '🎯'
        },
        {
          heading: '📖 Curated Resources',
          text: 'Each roadmap step includes curated resources - articles, videos, tutorials, and projects to help you learn effectively.\n\n📦 Resource Types:\n• Video tutorials\n• Documentation links\n• Practice exercises\n• Mini-projects\n• Community discussions\n• Expert tips and tricks',
          image: '📖'
        },
        {
          heading: '🏆 Earn Certificates',
          text: 'Complete roadmaps and earn certificates to showcase your skills! Share your achievements with potential employers.\n\n🎓 Certificate Features:\n• Verified completion certificates\n• Shareable on LinkedIn\n• QR code verification\n• Skill endorsements\n• Portfolio integration\n• Professional recognition',
          image: '🏆'
        }
      ]
    },
    'developer-connect': {
      title: 'Developer Connect - Network & Grow Together',
      icon: Users,
      gradient: 'from-indigo-500 to-purple-500',
      sections: [
        {
          heading: '🌐 Global Developer Network',
          text: 'Connect with thousands of developers from around the world! Developer Connect is your gateway to building meaningful professional relationships, finding collaborators, and growing your network.\n\n• Browse developer profiles\n• Filter by skills, location, and year of study\n• View detailed profiles with tech stacks\n• Share and discover tech reviews\n• Connect with like-minded developers\n• Build your professional network',
          image: '🌐'
        },
        {
          heading: '⭐ Tech Reviews & Recommendations',
          text: 'Discover and share the best learning resources! Help fellow developers find quality platforms, courses, and tools for their learning journey.\n\n💎 Tech Reviews System:\n• Review learning platforms & websites\n• Rate resources with 5-star ratings\n• List pros and cons\n• Share detailed experiences\n• Ask for recommendations\n• Help others find resources\n\n🏆 Your reviews help the entire community learn better!',
          image: '⭐'
        },
        {
          heading: '💬 Direct Messaging',
          text: 'Communicate seamlessly with other developers through our built-in messaging system. Start conversations, share ideas, and build relationships!\n\n• Send direct messages to any developer\n• Real-time chat interface\n• Share code snippets and resources\n• Discuss collaboration opportunities\n• Get help and mentorship\n• Keep all conversations organized\n• Notification system for new messages\n• Receive project invitation links directly in chat',
          image: '💬'
        },
        {
          heading: '📚 Study Groups',
          text: 'Join or create study groups to learn together! Collaborate with peers who share your learning goals and interests.\n\n🎯 Study Group Features:\n• Browse existing study groups\n• Create your own study groups\n• Filter by technology and topics\n• Set group capacity limits\n• Track group members\n• Dedicated group chat\n• Share learning resources\n• Organize study sessions',
          image: '📚'
        },
        {
          heading: '🎓 Student Profiles',
          text: 'Showcase your journey with detailed student profiles! Share your skills, education, projects, and achievements with the community.\n\n📋 Profile Information:\n• Name, college, and year of study\n• Skills and tech stack\n• Bio and interests\n• Problems solved count\n• Projects and contributions\n• Contact information\n• Professional avatar\n• Social media links',
          image: '🎓'
        },
        {
          heading: '🔍 Smart Search & Filters',
          text: 'Find exactly who you\'re looking for with powerful search and filtering tools! Discover developers based on specific criteria.\n\n🎯 Filter Options:\n• Search by name or email\n• Filter by college\n• Filter by year of study\n• Filter by skills/tech stack\n• Sort by problems solved\n• View developer statistics\n• Save favorite profiles\n• Quick connect options',
          image: '🔍'
        },
        {
          heading: '🤝 Collaboration Opportunities',
          text: 'Developer Connect bridges you to Creator Corner and other platform features! Find collaborators for your projects and join exciting teams.\n\n💡 Networking Benefits:\n• Find project collaborators\n• Receive direct project invitations from owners\n• Join projects instantly via invite links\n• Discover mentorship opportunities\n• Join coding communities\n• Participate in group learning\n• Build lasting relationships\n• Grow your professional circle\n• Access exclusive opportunities',
          image: '🤝'
        }
      ]
    }
  };

  const activeContent = content[activeSection as keyof typeof content];
  const ActiveIcon = activeContent.icon;

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <SEO
        title="Documentation – Getting Started, CodeArena, Creator Corner & More"
        description="Complete documentation for SkillUpX platform. Learn how to use CodeArena for coding battles & DSA practice, Creator Corner for projects, Learning Roadmaps for interview prep & career paths, and Developer Connect."
        keywords="SkillUpX documentation, how to use SkillUpX, CodeArena guide, Creator Corner guide, learning roadmaps, developer connect, DSA practice guide, interview preparation guide, career paths, coding battles guide, platform tutorial, coins system guide, rewards system, verified certificates guide, study groups guide, tech reviews, direct messaging, project collaboration guide, 1v1 battle guide, leaderboard system, profile setup guide, Project Bazaar guide, getting started SkillUpX, welcome bonus 1000 coins, badges and ranks, rematch system, global ranking, team chat, project invitations, skill-based recommendations, curated resources, certificate download LinkedIn"
        canonicalUrl="/documentation"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "TechArticle",
          "name": "SkillUpX Documentation",
          "description": "Complete guide to using SkillUpX platform - CodeArena, Creator Corner, Learning Roadmaps, and Developer Connect.",
          "url": "https://skillupx.online/documentation"
        }}
      />
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-br from-blue-400/20 to-cyan-400/10 dark:from-blue-600/10 dark:to-cyan-600/5 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-32 right-16 w-96 h-96 bg-gradient-to-br from-cyan-400/20 to-blue-400/10 dark:from-cyan-600/10 dark:to-blue-600/5 rounded-full blur-3xl animate-blob" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-purple-400/15 to-pink-400/10 dark:from-purple-600/10 dark:to-pink-600/5 rounded-full blur-3xl animate-blob" style={{ animationDelay: '4s' }} />
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 pt-20 md:pt-24 lg:pt-28 pb-12">
        <div className="max-w-6xl mx-auto">

          {/* Hero Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-white/50 dark:border-gray-700/50 shadow-lg mb-6">
              <Sparkles className="w-4 h-4 text-[#00ADB5]" />
              <span className="text-sm font-bold text-gray-800 dark:text-gray-200">📚 SkillUpX Documentation</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white mb-4 leading-tight">
              Your Complete Guide to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00ADB5] to-cyan-600">SkillUpX</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-medium">
              Explore our features, master the platform, and accelerate your developer journey
            </p>
          </div>

          {/* Navigation Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-12">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`group relative p-4 sm:p-5 rounded-2xl transition-all duration-300 transform hover:-translate-y-1 ${
                    isActive
                      ? `bg-gradient-to-br ${item.gradient} text-white shadow-xl scale-105`
                      : 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-2 border-gray-200/50 dark:border-gray-700/50 hover:border-[#00ADB5]/50 hover:shadow-xl'
                  }`}
                >
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-3 transition-all duration-300 ${
                    isActive ? 'bg-white/20' : `bg-gradient-to-br ${item.gradient} text-white`
                  }`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <h3 className={`font-bold text-sm sm:text-base mb-1 ${isActive ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                    {item.label}
                  </h3>
                  <p className={`text-xs hidden sm:block ${isActive ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                    {item.description}
                  </p>
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-white rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Section Header */}
          <div className="mb-8">
            <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r ${activeContent.gradient} text-white shadow-xl mb-4`}>
              <ActiveIcon className="w-6 h-6" />
              <span className="font-bold text-lg">{activeContent.title}</span>
            </div>
            <div className="h-1 w-32 bg-gradient-to-r from-[#00ADB5] to-cyan-600 rounded-full"></div>
          </div>

          {/* Special Banners */}
          {activeSection === 'codearena' && (
            <div className="mb-8 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-3xl p-6 sm:p-8 text-white shadow-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <Gift className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black">🎁 1000 Coins Welcome Bonus!</h3>
                  <p className="text-white/90 font-medium">Join CodeArena and receive 1000 coins instantly to start your battles</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-xl">
                  <Swords className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-bold text-sm sm:text-base">1v1 Battles</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-xl">
                  <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-bold text-sm sm:text-base">Rematch</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-xl">
                  <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-bold text-sm sm:text-base">Global Ranking</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-xl">
                  <Code className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-bold text-sm sm:text-base">3000+ DSA</span>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'creator-corner' && (
            <div className="mb-8 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 rounded-3xl p-6 sm:p-8 text-white shadow-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <Users className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black">🚀 Build Together, Grow Together!</h3>
                  <p className="text-white/90 font-medium">Find collaborators, build amazing projects, and earn your Verified Certificate</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-xl">
                  <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-bold text-sm sm:text-base">Browse Projects</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-xl">
                  <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-bold text-sm sm:text-base">Track Tasks</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-xl">
                  <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-bold text-sm sm:text-base">My Projects</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-xl">
                  <Award className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-bold text-sm sm:text-base">Get Certified</span>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'learning-roadmaps' && (
            <div className="mb-8 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl p-6 sm:p-8 text-white shadow-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <Map className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black">🗺️ Your Personalized Learning Journey!</h3>
                  <p className="text-white/90 font-medium">Follow structured roadmaps, track progress, and master new technologies step by step</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-xl">
                  <Compass className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-bold text-sm sm:text-base">Curated Paths</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-xl">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-bold text-sm sm:text-base">Track Progress</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-xl">
                  <Award className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-bold text-sm sm:text-base">Earn Certificates</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-xl">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-bold text-sm sm:text-base">Curated Resources</span>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'developer-connect' && (
            <div className="mb-8 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-6 sm:p-8 text-white shadow-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <Users className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black">🌐 Connect with 12K+ Developers!</h3>
                  <p className="text-white/90 font-medium">Build your network, share tech reviews, join study groups, and grow together</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-xl">
                  <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-bold text-sm sm:text-base">Network</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-xl">
                  <Award className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-bold text-sm sm:text-base">Reviews</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-xl">
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-bold text-sm sm:text-base">Message</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-xl">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-bold text-sm sm:text-base">Study Groups</span>
                </div>
              </div>
            </div>
          )}

          {/* Content Sections */}
          <div className="grid gap-6">
            {activeContent.sections.map((section: { heading: string; text: string; image: string }, index: number) => (
              <div
                key={index}
                className="group bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-2 border-gray-200/50 dark:border-gray-700/50 rounded-3xl p-6 sm:p-8 hover:border-[#00ADB5]/30 hover:shadow-2xl transition-all duration-500 hover:-translate-y-1"
              >
                <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                  <div className="text-5xl sm:text-6xl group-hover:scale-110 transition-transform duration-300 flex-shrink-0">{section.image}</div>
                  <div className="flex-1">
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 dark:text-white mb-3 sm:mb-4 group-hover:text-[#00ADB5] transition-colors duration-300">
                      {section.heading}
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line font-medium text-sm sm:text-base">{section.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Features for Creator Corner */}
          {activeSection === 'creator-corner' && (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 border-2 border-purple-200 dark:border-purple-800 rounded-2xl p-6 text-center">
                <Search className="w-12 h-12 text-purple-500 mx-auto mb-3" />
                <h3 className="font-black text-lg text-gray-900 dark:text-white mb-2">Browse Projects</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Discover exciting project ideas from creators worldwide</p>
              </div>
              <div className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 dark:from-pink-500/20 dark:to-rose-500/20 border-2 border-pink-200 dark:border-pink-800 rounded-2xl p-6 text-center">
                <CheckCircle className="w-12 h-12 text-pink-500 mx-auto mb-3" />
                <h3 className="font-black text-lg text-gray-900 dark:text-white mb-2">Tasks Completed</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Track your progress & earn certificate at 50 tasks</p>
              </div>
              <div className="bg-gradient-to-br from-rose-500/10 to-orange-500/10 dark:from-rose-500/20 dark:to-orange-500/20 border-2 border-rose-200 dark:border-rose-800 rounded-2xl p-6 text-center">
                <FolderOpen className="w-12 h-12 text-rose-500 mx-auto mb-3" />
                <h3 className="font-black text-lg text-gray-900 dark:text-white mb-2">My Projects</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Create, edit & manage your project ideas</p>
              </div>
            </div>
          )}

          {/* Certificate Preview for Creator Corner */}
          {activeSection === 'creator-corner' && (
            <div className="mt-8">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">🎓 Your Verified Certificate</h3>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Complete 50 tasks to unlock this certificate</p>
              </div>

              {/* Certificate Card */}
              <div className="relative max-w-2xl mx-auto">
                {/* Decorative glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-rose-500/30 blur-3xl -z-10" />

                {/* Certificate */}
                <div className="bg-gradient-to-br from-amber-50 via-white to-amber-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 border-4 border-amber-400 dark:border-amber-600 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                  {/* Corner decorations */}
                  <div className="absolute top-0 left-0 w-20 h-20 border-t-4 border-l-4 border-amber-500 rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-20 h-20 border-t-4 border-r-4 border-amber-500 rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-20 h-20 border-b-4 border-l-4 border-amber-500 rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-20 h-20 border-b-4 border-r-4 border-amber-500 rounded-br-xl" />

                  {/* Watermark pattern */}
                  <div className="absolute inset-0 opacity-5 dark:opacity-10">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[150px] font-black text-amber-900 dark:text-amber-400 select-none">
                      NS
                    </div>
                  </div>

                  <div className="relative text-center">
                    {/* Logo & Header */}
                    <div className="flex items-center justify-center gap-3 mb-3">
                      {/* SkillUpX Logo */}
                      <div className="relative">
                        <img
                          src="https://res.cloudinary.com/doytvgisa/image/upload/v1758623200/logo_evymhe.svg"
                          alt="SkillUpX Logo"
                          className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
                        />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-md">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <div className="text-left">
                        <span className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00ADB5] to-cyan-600">SkillUpX</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Building Tomorrow's Developers</p>
                      </div>
                    </div>

                    <h4 className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 font-bold tracking-[0.3em] uppercase mb-4">Certificate of Achievement</h4>

                    <div className="w-32 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto mb-4" />

                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">This is to certify that</p>

                    {/* Name */}
                    <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-1 font-serif italic">
                      John Doe
                    </h3>

                    {/* Email */}
                    <p className="text-sm text-[#00ADB5] dark:text-cyan-400 font-medium mb-3">
                      ✉️ johndoe@example.com
                    </p>

                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">has successfully completed</p>

                    {/* Achievement */}
                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full font-bold mb-4">
                      <CheckCircle className="w-5 h-5" />
                      <span>50 Verified Tasks</span>
                    </div>

                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                      and is hereby recognized as a
                    </p>

                    {/* Title */}
                    <h4 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 mb-4">
                      Verified Collaborator
                    </h4>

                    <div className="w-32 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto mb-4" />

                    {/* Stats Row */}
                    <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-4">
                      <div className="text-center">
                        <div className="text-lg font-black text-[#00ADB5]">50</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Tasks</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-black text-purple-500">8</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Projects</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-black text-pink-500">5</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Skills</div>
                      </div>
                    </div>

                    {/* Date & Verification */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-amber-200 dark:border-amber-800">
                      <div className="text-left">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Issue Date</p>
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">December 22, 2025</p>
                      </div>

                      {/* QR Code placeholder */}
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-lg flex items-center justify-center border-2 border-gray-300 dark:border-gray-600">
                        <div className="grid grid-cols-3 gap-0.5">
                          {[...Array(9)].map((_, i) => (
                            <div key={i} className={`w-3 h-3 ${[0, 2, 3, 5, 6, 8].includes(i) ? 'bg-gray-800 dark:bg-gray-200' : 'bg-transparent'}`} />
                          ))}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Certificate ID</p>
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300 font-mono">NS-2025-XXXXX</p>
                      </div>
                    </div>

                    {/* Signature */}
                    <div className="mt-4 pt-4">
                      <div className="w-24 h-0.5 bg-gray-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-500 dark:text-gray-400">SkillUpX Team</p>
                    </div>
                  </div>

                  {/* Gold seal */}
                  <div className="absolute -bottom-4 -right-4 sm:bottom-4 sm:right-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 rounded-full flex items-center justify-center shadow-xl border-4 border-amber-300">
                      <Award className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                  </div>
                </div>

                {/* Download hint */}
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                  📥 Download and share on LinkedIn to showcase your skills!
                </p>
              </div>
            </div>
          )}

          {/* Quick Features for Developer Connect */}
          {activeSection === 'developer-connect' && (
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 text-center">
                <Users className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">Developer Directory</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Browse 12K+ devs</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 border-2 border-purple-200 dark:border-purple-800 rounded-2xl p-4 text-center">
                <Award className="w-10 h-10 text-purple-500 mx-auto mb-2" />
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">Tech Reviews</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Share & discover</p>
              </div>
              <div className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 dark:from-pink-500/20 dark:to-rose-500/20 border-2 border-pink-200 dark:border-pink-800 rounded-2xl p-4 text-center">
                <MessageCircle className="w-10 h-10 text-pink-500 mx-auto mb-2" />
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">Messaging</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Real-time chat</p>
              </div>
              <div className="bg-gradient-to-br from-rose-500/10 to-orange-500/10 dark:from-rose-500/20 dark:to-orange-500/20 border-2 border-rose-200 dark:border-rose-800 rounded-2xl p-4 text-center">
                <BookOpen className="w-10 h-10 text-rose-500 mx-auto mb-2" />
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">Study Groups</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Learn together</p>
              </div>
            </div>
          )}

          {/* Quick Features for CodeArena */}
          {activeSection === 'codearena' && (
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 dark:from-orange-500/20 dark:to-red-500/20 border-2 border-orange-200 dark:border-orange-800 rounded-2xl p-4 text-center">
                <Swords className="w-10 h-10 text-orange-500 mx-auto mb-2" />
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">1v1 Battle</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Real-time duels</p>
              </div>
              <div className="bg-gradient-to-br from-red-500/10 to-pink-500/10 dark:from-red-500/20 dark:to-pink-500/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-4 text-center">
                <History className="w-10 h-10 text-red-500 mx-auto mb-2" />
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">Battle History</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Review & rematch</p>
              </div>
              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 border-2 border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-center">
                <Trophy className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">Global Rank</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Compete globally</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 dark:from-yellow-500/20 dark:to-amber-500/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-2xl p-4 text-center">
                <Target className="w-10 h-10 text-yellow-600 mx-auto mb-2" />
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">Practice</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">3000+ problems</p>
              </div>
            </div>
          )}

          {/* CTA Section */}
          <div className="mt-12 relative rounded-3xl overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00ADB5] via-cyan-600 to-blue-600" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />

            <div className="relative p-6 sm:p-8 lg:p-12 text-center text-white">
              <Compass className="w-12 h-12 sm:w-16 sm:h-16 text-white mx-auto mb-4 sm:mb-6 animate-pulse" />
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-3 sm:mb-4">Ready to Take Your Next Step?</h3>
              <p className="text-base sm:text-lg text-white/90 mb-6 sm:mb-8 max-w-2xl mx-auto font-medium">
                Join thousands of developers building their dream careers with SkillUpX.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <button onClick={() => navigate('/signup')} className="group px-6 sm:px-8 py-3 sm:py-4 bg-white text-[#00ADB5] rounded-2xl font-black text-base sm:text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 inline-flex items-center justify-center">
                  <span className="flex items-center gap-2">
                    Start Your Journey
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
                <button onClick={() => navigate('/login')} className="px-6 sm:px-8 py-3 sm:py-4 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white rounded-2xl font-black text-base sm:text-lg hover:bg-white/20 transition-all duration-300 hover:shadow-xl">
                  Enter CodeArena
                </button>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-white/20">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-black text-white mb-1">3000+</div>
                  <div className="text-xs sm:text-sm text-white/80 font-medium">DSA Problems</div>
                </div>
                <div className="w-px h-10 sm:h-12 bg-white/20" />
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-black text-white mb-1">500+</div>
                  <div className="text-xs sm:text-sm text-white/80 font-medium">Live Projects</div>
                </div>
                <div className="w-px h-10 sm:h-12 bg-white/20" />
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-black text-white mb-1">12K+</div>
                  <div className="text-xs sm:text-sm text-white/80 font-medium">Active Developers</div>
                </div>
              </div>
            </div>
          </div>

          {/* Help Card */}
          <div className="mt-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-2 border-gray-200/50 dark:border-gray-700/50 rounded-3xl p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <div className="w-16 h-16 bg-gradient-to-br from-[#00ADB5] to-cyan-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Need Help?</h3>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Have questions or need assistance? Our support team is here to help you succeed.</p>
              </div>
              <button onClick={() => navigate('/contact')} className="px-6 py-3 bg-gradient-to-r from-[#00ADB5] to-cyan-600 hover:from-cyan-600 hover:to-blue-600 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex-shrink-0">
                Contact Support
              </button>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -50px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(50px, 50px) scale(1.05); }
        }
        .animate-blob {
          animation: blob 7s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default NextStepDocumentation;
