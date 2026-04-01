import { Calendar, ExternalLink, Github, Users } from "lucide-react";

export function ProjectsPage() {
  const projects = [
    {
      title: "ECommerce AI Assistant",
      description: "Full-stack e-commerce platform with AI chatbot for recommendations.",
      image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop",
      technologies: ["Next.js", "TypeScript", "OpenAI", "Stripe", "PostgreSQL"],
      students: 8,
      duration: "4 months"
    },
    {
      title: "Voice-Controlled Smart Home",
      description: "IoT smart home system with voice commands using AI models.",
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop",
      technologies: ["Python", "Voice AI", "IoT", "React", "WebRTC"],
      students: 6,
      duration: "5 months"
    },
    {
      title: "Automated Trading Bot",
      description: "Trading bot using ML for market prediction and workflow automation.",
      image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=400&fit=crop",
      technologies: ["Python", "ML", "N8N", "APIs", "Docker"],
      students: 10,
      duration: "6 months"
    },
    {
      title: "Real-time Collaboration Platform",
      description: "Team collaboration tool with real-time editing and video calls.",
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop",
      technologies: ["React", "Node.js", "Socket.io", "MongoDB", "WebRTC"],
      students: 12,
      duration: "4 months"
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black py-6 sm:py-8 text-gray-900 dark:text-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3">Student Projects</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-700 dark:text-gray-300 max-w-3xl mx-auto px-2">
            Our students work on real-world projects under mentorship. Each project
            is portfolio-ready and built with modern technologies.
          </p>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
          {projects.map((project, idx) => (
            <div key={idx} className="bg-purple-50 dark:bg-gray-900 rounded-lg sm:rounded-xl overflow-hidden shadow hover:shadow-lg transition-shadow">
              <div className="relative">
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-36 sm:h-44 md:h-48 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
              </div>
              <div className="p-3 sm:p-4 md:p-5 space-y-2.5 sm:space-y-3">
                <h3 className="text-base sm:text-lg md:text-xl font-semibold leading-tight">{project.title}</h3>
                <p className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm leading-relaxed line-clamp-2">{project.description}</p>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{project.students}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{project.duration}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {project.technologies.map((tech, i) => (
                    <span key={i} className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs bg-white dark:bg-gray-900 border dark:border-gray-700 rounded whitespace-nowrap">
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <button className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border dark:border-gray-700 rounded-md flex items-center justify-center gap-1 text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                    <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden xs:inline">Demo</span>
                  </button>
                  <button className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border dark:border-gray-700 rounded-md flex items-center justify-center gap-1 text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                    <Github className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden xs:inline">Code</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats / CTA */}
        <div className="bg-purple-50 dark:bg-gray-900 rounded-lg sm:rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 lg:p-10 text-center space-y-4 sm:space-y-6">
          <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold">Ready to Build Your Own Project?</h2>
          <p className="text-xs sm:text-sm md:text-base text-gray-700 dark:text-gray-300 max-w-2xl mx-auto px-2">
            Join our internship program and gain hands-on experience with real-world projects.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 justify-center max-w-md mx-auto">
            <button className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              Apply for Internship
            </button>
            <button className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              View Course Catalog
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

