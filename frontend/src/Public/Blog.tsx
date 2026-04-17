import { Link } from "react-router-dom";
import SEO from "../Component/SEO";

const blogPosts = [
  {
    id: "top-dsa-patterns-2025",
    title: "Top 10 DSA Patterns Every Developer Must Know in 2025",
    excerpt:
      "Master the most frequently asked data structure and algorithm patterns for coding interviews — from sliding window to dynamic programming, with practical examples and time complexity analysis.",
    date: "2025-07-10",
    readTime: "8 min read",
    category: "DSA & Algorithms",
    color: "from-cyan-500 to-blue-600",
    content: [
      "Data Structures and Algorithms remain the backbone of every technical interview at top tech companies. Whether you're preparing for Google, Amazon, Microsoft, or any startup, mastering core DSA patterns gives you a huge advantage.",
      "The Sliding Window technique is ideal for subarray/substring problems. Two Pointers works great for sorted arrays. Binary Search extends beyond simple lookups into search space problems. BFS/DFS are essential for graph and tree traversals.",
      "Dynamic Programming (DP) trips up most candidates, but once you recognize the overlapping subproblems and optimal substructure, it becomes formulaic. Start with 1D DP (climbing stairs, house robber), then move to 2D DP (longest common subsequence, edit distance).",
      "On SkillUpX CodeArena, you can practice all these patterns in real-time 1v1 coding battles. Competing against another developer forces you to think fast and code clean — exactly what interviewers want to see.",
    ],
    tags: [
      "DSA",
      "Algorithms",
      "Coding Interview",
      "Sliding Window",
      "Dynamic Programming",
      "Binary Search",
    ],
  },
  {
    id: "react-vs-nextjs-2025",
    title: "React vs Next.js in 2025: Which Should You Learn First?",
    excerpt:
      "A practical comparison of React and Next.js for beginners and intermediate developers. Understand SSR, CSR, RSC, and when to pick which framework for your next web project.",
    date: "2025-07-05",
    readTime: "6 min read",
    category: "Web Development",
    color: "from-purple-500 to-pink-600",
    content: [
      "React is a UI library — it gives you components, hooks, and JSX. Next.js is a full framework built on React that adds routing, server-side rendering (SSR), static site generation (SSG), API routes, and React Server Components (RSC).",
      "If you're just starting out, learn React fundamentals first: components, state, props, hooks (useState, useEffect, useContext), and client-side routing with React Router. This foundation makes Next.js much easier to pick up later.",
      "Next.js shines for production apps that need SEO (blogs, e-commerce, marketing sites), built-in API routes, and automatic code splitting. React (with Vite) is faster to prototype and better for SPAs like dashboards or admin panels.",
      "On SkillUpX Learning Roadmaps, we offer structured paths for both React and Full Stack development, with hands-on projects in Creator Corner to build your portfolio while learning.",
    ],
    tags: [
      "React",
      "Next.js",
      "SSR",
      "Web Development",
      "Frontend",
      "JavaScript",
    ],
  },
  {
    id: "coding-interview-preparation-guide",
    title: "The Complete Coding Interview Preparation Guide for 2025",
    excerpt:
      "A step-by-step roadmap covering DSA practice, system design basics, behavioral interviews, and portfolio building. Everything you need to crack your next tech interview.",
    date: "2025-06-28",
    readTime: "10 min read",
    category: "Career & Interviews",
    color: "from-amber-500 to-orange-600",
    content: [
      "Preparing for coding interviews requires a structured approach: DSA fundamentals, problem-solving practice, system design basics, behavioral prep, and a strong portfolio. Most candidates fail because they skip the plan and jump straight into random LeetCode grinding.",
      "Start with core data structures: Arrays, Strings, Hash Maps, Linked Lists, Stacks, Queues, Trees, Graphs, and Heaps. Then learn key algorithms: Sorting, Searching, BFS, DFS, Backtracking, Greedy, and Dynamic Programming.",
      "Practice consistency beats volume — solving 3-5 focused problems daily for 8 weeks beats 200 random problems in 2 weeks. Group problems by pattern, not difficulty. SkillUpX CodeArena's 1v1 battles add competitive pressure that simulates real interview conditions.",
      "Don't ignore system design, even for junior roles. Understand load balancers, caching, databases (SQL vs NoSQL), message queues, and API design. For behavioral rounds, use the STAR method and prepare 5-6 stories about challenges, teamwork, and leadership.",
      "Build 2-3 real projects to showcase. SkillUpX Creator Corner lets you join teams, contribute to real codebases, and earn certificates — all things that impressed hiring managers.",
    ],
    tags: [
      "Interview Prep",
      "Coding Interview",
      "System Design",
      "Career",
      "DSA",
      "Portfolio",
    ],
  },
  {
    id: "building-real-world-projects-students",
    title: "Why Building Real-World Projects Beats Tutorial Hell",
    excerpt:
      "Stop watching tutorials endlessly. Learn how building actual projects accelerates your growth, strengthens your resume, and helps you land developer jobs faster.",
    date: "2025-06-20",
    readTime: "5 min read",
    category: "Developer Growth",
    color: "from-green-500 to-emerald-600",
    content: [
      "Tutorial hell is real: you watch hours of React or Python tutorials, follow along perfectly, but can't build anything on your own. The fix? Start building projects before you feel ready.",
      "Real projects teach you what tutorials skip: debugging, reading documentation, making architectural decisions, working with APIs, handling edge cases, and collaborating with other developers. These are exactly the skills employers evaluate.",
      "Start small: a personal portfolio, a to-do app with authentication, a weather dashboard. Then level up: a full-stack CRUD app, a real-time chat system, an e-commerce store. Each project should stretch your current abilities.",
      "SkillUpX Creator Corner is designed for this — submit your project idea or join an existing team. You'll work in sprints, use Git, do code reviews, and earn certificates. It's the closest experience to a real dev job you can get while learning.",
    ],
    tags: [
      "Projects",
      "Learning",
      "Portfolio",
      "Tutorial Hell",
      "Developer Growth",
      "Resume",
    ],
  },
  {
    id: "open-source-contribution-beginners",
    title: "How to Start Contributing to Open Source as a Beginner",
    excerpt:
      "A practical guide to making your first open source contribution — from finding beginner-friendly repos to writing your first pull request and building your GitHub profile.",
    date: "2025-06-12",
    readTime: "7 min read",
    category: "Open Source",
    color: "from-blue-500 to-indigo-600",
    content: [
      "Open source contributions are one of the best ways to learn real-world development, build your network, and stand out to employers. But getting started can feel intimidating. Here's a practical roadmap.",
      "First, get comfortable with Git and GitHub: forking, branching, committing, pushing, and creating pull requests. Practice on your own repos before contributing to others. SkillUpX Creator Corner uses the same workflow, so you can practice safely.",
      "Find beginner-friendly repos: look for labels like 'good first issue', 'beginner-friendly', or 'help wanted' on GitHub. Start with documentation fixes, typo corrections, or small bug fixes. These are low-risk and help you understand the codebase.",
      "When you're ready for code contributions, pick an issue, read the contributing guidelines, create a branch, write tests, and submit a clean PR with a descriptive message. Respond to review feedback promptly and politely.",
      "Track your contributions on your GitHub profile, add notable projects to your resume, and mention them in interviews. Consistent open source work demonstrates initiative, collaboration skills, and code quality — all things hiring managers value.",
    ],
    tags: [
      "Open Source",
      "GitHub",
      "Git",
      "Pull Requests",
      "Beginner",
      "Career",
    ],
  },
  {
    id: "full-stack-developer-roadmap-2025",
    title: "Full Stack Developer Roadmap 2025: From Zero to Job-Ready",
    excerpt:
      "The complete learning path for becoming a full stack developer in 2025 — covering HTML, CSS, JavaScript, React, Node.js, databases, DevOps, and everything in between.",
    date: "2025-06-05",
    readTime: "12 min read",
    category: "Learning Roadmaps",
    color: "from-rose-500 to-red-600",
    content: [
      "Becoming a full stack developer in 2025 requires mastering frontend, backend, databases, and deployment. Here's a structured 6-month roadmap that covers everything you need to be job-ready.",
      "Month 1-2 (Frontend): HTML5 semantics, CSS3 Flexbox/Grid, responsive design, JavaScript ES6+ (arrow functions, promises, async/await, destructuring), DOM manipulation, and Fetch API. Build 3 frontend projects.",
      "Month 3 (React): Components, JSX, state management with hooks, React Router, context API, custom hooks, and form handling. Build a full React SPA like a task manager or blog.",
      "Month 4 (Backend): Node.js runtime, Express.js, REST API design, middleware, authentication (JWT), error handling, and file uploads. Build 2 API backends.",
      "Month 5 (Database + Integration): MongoDB with Mongoose, SQL basics, CRUD operations, data modeling. Connect frontend to backend — build a full-stack app with auth, CRUD, and deployment.",
      "Month 6 (DevOps + Job Prep): Git workflows, CI/CD basics, Docker fundamentals, cloud deployment (Vercel, Railway, AWS). Polish portfolio, prepare resume, practice DSA on SkillUpX CodeArena.",
      "SkillUpX Learning Roadmaps provide curated step-by-step guides for each of these topics, with progress tracking, quizzes, and project milestones to keep you accountable.",
    ],
    tags: [
      "Full Stack",
      "Roadmap",
      "React",
      "Node.js",
      "MongoDB",
      "JavaScript",
      "Career",
    ],
  },
];

const blogStructuredData = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "SkillUpX Developer Blog",
  description:
    "Expert articles on DSA, coding interviews, web development, React, Node.js, open source, and developer career growth. Free tutorials and guides from SkillUpX.",
  url: "https://skillupx.online/blog",
  publisher: {
    "@type": "Organization",
    name: "SkillUpX",
    url: "https://skillupx.online",
    logo: {
      "@type": "ImageObject",
      url: "https://res.cloudinary.com/doytvgisa/image/upload/v1758623200/logo_evymhe.svg",
    },
  },
  blogPost: blogPosts.map((post) => ({
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    author: {
      "@type": "Organization",
      name: "SkillUpX",
    },
    publisher: {
      "@type": "Organization",
      name: "SkillUpX",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://skillupx.online/blog#${post.id}`,
    },
    keywords: post.tags.join(", "),
  })),
};

export default function Blog() {
  return (
    <>
      <SEO
        title="Developer Blog – DSA, Coding Interviews, React, Node.js & Career Tips | SkillUpX"
        description="Read expert articles on DSA patterns, coding interview preparation, React vs Next.js, full stack roadmaps, open source contributions, and developer career growth. Free tutorials from SkillUpX."
        keywords="developer blog, DSA patterns, coding interview tips, React tutorial, Node.js guide, full stack roadmap, open source contribution, coding battle tips, developer career, SkillUpX blog, learn programming, web development blog, JavaScript blog, coding practice, interview preparation guide"
        canonicalUrl="https://skillupx.online/blog"
        ogType="website"
        structuredData={blogStructuredData}
      />

      <div className="min-h-screen bg-white dark:bg-black">
        {/* Hero Section */}
        <section className="relative py-20 px-4 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
          </div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#00ADB5]/10 text-[#00ADB5] text-sm font-medium mb-6 border border-[#00ADB5]/20">
              Developer Blog
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              Level Up Your{" "}
              <span className="bg-gradient-to-r from-[#00ADB5] to-purple-500 bg-clip-text text-transparent">
                Developer Skills
              </span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Expert articles on DSA patterns, coding interviews, web
              development, open source, and career growth — written by
              developers, for developers.
            </p>
          </div>
        </section>

        {/* Blog Posts Grid */}
        <section className="max-w-6xl mx-auto px-4 pb-20">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post) => (
              <article
                key={post.id}
                className="group bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700/50 overflow-hidden hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/20 transition-all duration-300 hover:-translate-y-1 flex flex-col"
              >
                {/* Category Bar */}
                <div
                  className={`h-1.5 bg-gradient-to-r ${post.color}`}
                />

                <div className="p-6 flex flex-col flex-grow">
                  {/* Meta */}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700/50 font-medium">
                      {post.category}
                    </span>
                    <span>{post.readTime}</span>
                  </div>

                  {/* Title */}
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3 leading-snug group-hover:text-[#00ADB5] transition-colors">
                    {post.title}
                  </h2>

                  {/* Excerpt */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4 flex-grow">
                    {post.excerpt}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded bg-[#00ADB5]/10 text-[#00ADB5] dark:bg-[#00ADB5]/20"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Date */}
                  <time
                    dateTime={post.date}
                    className="text-xs text-gray-400 dark:text-gray-500"
                  >
                    {new Date(post.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Expanded Blog Content (for SEO crawlability) */}
        <section className="max-w-4xl mx-auto px-4 pb-20">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-10 text-center">
            Featured Articles
          </h2>

          <div className="space-y-16">
            {blogPosts.map((post) => (
              <article
                key={post.id}
                id={post.id}
                className="scroll-mt-24"
              >
                <div className="border-l-4 border-[#00ADB5] pl-6">
                  <span className="text-xs font-medium text-[#00ADB5] uppercase tracking-wider">
                    {post.category}
                  </span>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mt-1 mb-4">
                    {post.title}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
                    <time dateTime={post.date}>
                      {new Date(post.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                    <span>·</span>
                    <span>{post.readTime}</span>
                  </div>
                  <div className="space-y-4">
                    {post.content.map((paragraph, idx) => (
                      <p
                        key={idx}
                        className="text-gray-600 dark:text-gray-400 leading-relaxed"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-5">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gray-50 dark:bg-gray-900 py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to Practice What You've Learned?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto">
              Join SkillUpX to practice DSA in CodeArena, build real projects in
              Creator Corner, and follow curated learning roadmaps — all for
              free.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="px-8 py-3 bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 hover:-translate-y-0.5"
              >
                Start Coding Free
              </Link>
              <Link
                to="/documentation"
                className="px-8 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:border-[#00ADB5] hover:text-[#00ADB5] transition-all duration-300"
              >
                Read Documentation
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
