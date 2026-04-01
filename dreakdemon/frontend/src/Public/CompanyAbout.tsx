import { ArrowRight, BookOpen, Code, Globe, Lightbulb, Map, MessageSquare, Rocket, Shield, Swords, Trophy, Users, Zap } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import SEO from "../Component/SEO";

export function AboutPage() {
    // Timeline milestones
    const milestones = [
      {
        year: "2022",
        title: "Idea Born",
        desc: "SkillUpX was conceptualized by a group of passionate students.",
        icon: Lightbulb,
      },
      {
        year: "2023",
        title: "First Project Launched",
        desc: "Our first batch of students completed real-world projects.",
        icon: BookOpen,
      },
      {
        year: "2024",
        title: "Community Growth",
        desc: "We grew to 10,000+ active learners and mentors.",
        icon: Users,
      },
      {
        year: "2025",
        title: "Global Recognition",
        desc: "SkillUpX received awards for innovation in education.",
        icon: Shield,
      },
      {
        year: "2026 Launch",
        title: "Platform Launch",
        desc: "SkillUpX officially launched for students worldwide.",
        icon: Zap,
      },
    ];
  const [visibleSections, setVisibleSections] = useState<string[]>([]);

  const observe = (id: string, el: HTMLDivElement | null) => {
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !visibleSections.includes(id)) {
            setVisibleSections((prev) => [...prev, id]);
            observer.unobserve(entry.target); // animate only once
          }
        });
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
  };

  const values = [
    {
      id: 1,
      title: "Empowerment",
      description:
        "We believe every student has the potential to succeed. Our platform gives you the tools, resources, and opportunities to build skills, gain experience, and confidently pursue your career goals.",
      icon: Zap,
    },
    {
      id: 2,
      title: "Collaboration",
      description:
        "Learning is stronger when we grow together. We foster a supportive community where students, mentors, and professionals share knowledge, solve problems, and celebrate each other’s achievements.",
      icon: Users,
    },
    {
      id: 3,
      title: "Lifelong Learning",
      description:
        "Education doesn’t end with a classroom. We encourage curiosity and continuous learning, helping students stay updated with new technologies and gain practical experience through real-world projects.",
      icon: BookOpen,
    },
    {
      id: 4,
      title: "Integrity & Trust",
      description:
        "Transparency and authenticity guide everything we do. We ensure every contribution is verified and every achievement is celebrated. Our goal is to build trust between students, mentors, and recruiters.",
      icon: Shield,
    },
    {
      id: 5,
      title: "Innovation",
      description:
        "Creativity and problem-solving open new doors. We encourage students to experiment, think outside the box, and bring fresh ideas to projects, shaping the future one contribution at a time.",
      icon: Lightbulb,
    },
    {
      id: 6,
      title: "Accessibility & Inclusivity",
      description:
        "Opportunities should be open to everyone. We strive to make learning affordable, approachable, and welcoming for students from all backgrounds — because talent knows no boundaries.",
      icon: Globe,
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">
      <SEO
        title="About SkillUpX – Free Developer Platform for Coding Battles, DSA Practice, Projects & Career Growth"
        description="Learn about SkillUpX — India's #1 free developer platform. CodeArena 1v1 battles, 3000+ DSA questions, real-world project collaboration, curated learning roadmaps, Developer Connect networking, and tech reviews. Founded in 2022, empowering 150+ developers. Our mission, story, team & platform features."
        keywords="about SkillUpX, SkillUpX story, SkillUpX mission, SkillUpX team, SkillUpX founders, SkillUpX journey, SkillUpX platform, what is SkillUpX, who made SkillUpX, SkillUpX India, CodeArena about, about CodeArena, about coding battles, project collaboration platform, learning roadmaps platform, Developer Connect about, tech reviews platform, developer community India, coding platform India, tech education platform, our team, our story, collaboration, innovation, real-world projects, student empowerment platform, open source education, India ed-tech startup 2026, skill development company India, coding education mission, developer mentorship India, practical education platform, about coding platform India, free coding platform about, best coding website about, SkillUpX vs LeetCode about, SkillUpX vs HackerRank about, developer growth platform India, coding community about, DSA practice platform about, competitive programming platform India, MERN stack platform, full stack developer platform, interview preparation platform India, campus placement platform, college coding platform, student developer community"
        canonicalUrl="/about"
        ogImage="https://res.cloudinary.com/dvwmbidka/image/upload/e_sharpen:150/skillupx-og-banner_re2t6u"
        ogImageAlt="About SkillUpX – Free Developer Platform for Coding Battles, Projects & Career Growth"
        structuredData={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "AboutPage",
              "@id": "https://skillupx.online/about/#aboutpage",
              "name": "About SkillUpX – Free Developer Growth Platform",
              "description": "Learn about SkillUpX — the free developer platform for CodeArena 1v1 coding battles, 3000+ DSA practice questions, real-world project collaboration, curated learning roadmaps, developer networking, and tech reviews. Founded in 2022, empowering developers in India and worldwide.",
              "url": "https://skillupx.online/about",
              "isPartOf": { "@id": "https://skillupx.online/#website" },
              "about": { "@id": "https://skillupx.online/#organization" },
              "datePublished": "2022-01-01",
              "dateModified": "2026-02-24",
              "inLanguage": "en",
              "breadcrumb": {
                "@type": "BreadcrumbList",
                "itemListElement": [
                  { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://skillupx.online/" },
                  { "@type": "ListItem", "position": 2, "name": "About SkillUpX", "item": "https://skillupx.online/about" }
                ]
              }
            },
            {
              "@type": "Organization",
              "@id": "https://skillupx.online/#organization",
              "name": "SkillUpX",
              "alternateName": ["SkillUp", "Skill Up", "SkillUp X", "Skill Up X", "Skill UpX", "skillupx", "skillup x"],
              "url": "https://skillupx.online",
              "logo": {
                "@type": "ImageObject",
                "url": "https://res.cloudinary.com/doytvgisa/image/upload/v1758623200/logo_evymhe.svg",
                "width": 512,
                "height": 512
              },
              "image": "https://res.cloudinary.com/dvwmbidka/image/upload/e_sharpen:150/skillupx-og-banner_re2t6u",
              "description": "SkillUpX is a free developer growth platform offering CodeArena 1v1 coding battles, 3000+ DSA questions, real-world project collaboration, curated learning roadmaps, developer networking, and community tech reviews. Founded in 2022 with a mission to empower the next generation of tech professionals.",
              "email": "contact@SkillUpX.com",
              "telephone": "+918756824350",
              "address": { "@type": "PostalAddress", "addressCountry": "IN" },
              "foundingDate": "2022",
              "sameAs": ["https://www.instagram.com/skillupx1.0"],
              "knowsAbout": ["Data Structures and Algorithms", "Competitive Programming", "Web Development", "React", "Node.js", "Full Stack Development", "System Design", "Interview Preparation", "Open Source", "Project Collaboration", "Developer Networking", "MERN Stack", "JavaScript", "Python", "Java", "C++", "TypeScript"]
            },
            {
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "What is SkillUpX?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "SkillUpX is a free developer growth platform featuring CodeArena 1v1 coding battles, 3000+ DSA practice questions, real-world project collaboration, curated learning roadmaps, Developer Connect networking, and community tech reviews. Founded in 2022 to empower developers in India and worldwide."
                  }
                },
                {
                  "@type": "Question",
                  "name": "When was SkillUpX founded?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "SkillUpX was founded in 2022 by a group of passionate students who wanted to create a platform where learning is about action, collaboration, and growth — not just theory."
                  }
                },
                {
                  "@type": "Question",
                  "name": "What is SkillUpX's mission?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "SkillUpX's mission is to empower students and developers to learn, contribute, and showcase their talents through practical education, real-world projects, and industry mentorship — so they can build the tech careers they dream of. All features are 100% free."
                  }
                },
                {
                  "@type": "Question",
                  "name": "What features does SkillUpX offer?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "SkillUpX offers: CodeArena 1v1 coding battles, 3000+ DSA practice questions, Creator Corner for real-world project collaboration, curated learning roadmaps for React/Node.js/Full Stack/DSA/System Design, Developer Connect for professional networking, tech reviews, study groups, verified certificates, coding coins & global leaderboard, and more."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Is SkillUpX free to use?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes, SkillUpX is 100% free. All features including CodeArena battles, DSA questions, learning roadmaps, project collaboration, Developer Connect, and tech reviews are available at no cost. No credit card or premium subscription required."
                  }
                }
              ]
            }
          ]
        }}
      />

      {/* SEO H1 - Above the fold */}
      <section className="pt-28 pb-10 px-8 lg:px-16 text-center">
        <h1 className="text-4xl lg:text-5xl font-extrabold text-[#00ADB5]">
          About SkillUpX
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Empowering the next generation of tech professionals through practical education, real-world projects, and industry mentorship.
        </p>
      </section>

      {/* Story Section */}
      <div
        ref={(el) => observe("story", el)}
        className={`grid lg:grid-cols-2 gap-12 px-8 lg:px-16 py-20 items-center transform transition-all duration-1000 ${
          visibleSections.includes("story")
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-12"
        }`}
      >
        <div>
          <h2 className="text-3xl font-semibold mb-6 text-[#00ADB5]">
            Our Story
          </h2>
<p className="text-gray-700 dark:text-gray-300 mb-4">
            It all started when we noticed a common struggle among students —
            they were eager to learn but unsure where to begin. Many had great
            ideas and ambition but lacked real-world experience, guidance, and a
            way to showcase their skills.
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-4">We've been there too.</p>
          <p className="text-gray-700 dark:text-gray-300">
            As students ourselves, we wanted to learn, build projects, and grow
            — but we didn’t always have the right support or structure. That’s
            why we created SkillUpX — a place where learning isn’t just about
            theory, but about action, collaboration, and growth.
          </p>
        </div>
        <div className="overflow-hidden rounded-2xl shadow-lg relative">
          <img
            src="https://i.pinimg.com/736x/e8/7e/c4/e87ec4c9d80e8e3da206a9c67e368226.jpg"
            alt="Students collaborating on a project together at SkillUpX"
            loading="lazy"
            width={736}
            height={384}
            className="w-full h-96 object-cover transform transition-transform duration-1000 hover:scale-105"
            style={{ transform: "translateZ(0)", willChange: "transform" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        </div>
      </div>

      {/* Mission Section */}
            {/* Timeline Section */}
            <div className="bg-white dark:bg-black py-16 px-4 lg:px-24">
              <h2 className="text-3xl font-semibold text-center mb-10 text-[#00ADB5]">SkillUpX Journey</h2>
              <div className="relative flex flex-col items-center">
                <div className="absolute left-1/2 transform -translate-x-1/2 w-2 h-full bg-gradient-to-b from-[#00ADB5] to-gray-200 dark:to-gray-700 rounded-full"></div>
                {milestones.map((m, idx) => {
                  const Icon = m.icon;
                  return (
                    <div
                      key={idx}
                      className={`relative z-10 mb-12 flex items-center w-full ${idx % 2 === 0 ? "justify-start" : "justify-end"}`}
                      style={{ animation: `fadeIn 0.8s ease ${idx * 0.15}s both` }}
                    >
                      {/* Dot */}
                      <div className="absolute left-1/2 transform -translate-x-1/2 w-7 h-7 bg-white dark:bg-gray-900 rounded-full shadow-lg border-4 border-[#00ADB5] dark:border-gray-700 flex items-center justify-center" style={{ top: '50%' }}>
                        <Icon className="w-5 h-5 text-[#00ADB5]" />
                      </div>
                      <div
                        className={`w-full max-w-md ${idx % 2 === 0 ? "ml-0 mr-auto" : "mr-0 ml-auto"} rounded-2xl shadow-xl p-6 border-2 border-gray-100 dark:border-gray-700 bg-white dark:bg-black hover:scale-105 transition-transform duration-300`}
                        style={{ boxShadow: "0 8px 32px 0 rgba(0,0,0,0.08)" }}
                      >
                        <div className="flex items-center mb-2">
                          <span className="font-bold text-[#00ADB5] text-lg mr-3">{m.year}</span>
                          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-900 border-2 border-[#00ADB5] dark:border-gray-700 shadow">
                            <Icon className="w-6 h-6 text-[#00ADB5]" />
                          </div>
                        </div>
                        <div className="font-bold text-xl mb-1 text-[#00ADB5]">{m.title}</div>
                        <div className="text-gray-700 dark:text-gray-300 text-base">{m.desc}</div>
                      </div>
                    </div>
                  );
                })}
                {/* Fade-in animation keyframes */}
                <style>{`
                  @keyframes fadeIn {
                    0% { opacity: 0; transform: translateY(40px); }
                    100% { opacity: 1; transform: translateY(0); }
                  }
                `}</style>
              </div>
            </div>
      <div
        ref={(el) => observe("mission", el)}
        className={`grid lg:grid-cols-2 gap-12 px-8 lg:px-16 py-20 items-center transform transition-all duration-1000 ${
          visibleSections.includes("mission")
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-12"
        }`}
      >
        <div>
          <h2 className="text-3xl font-bold mb-6 text-[#00ADB5]">
            Our Mission is Simple:
          </h2>
<p className="text-gray-700 dark:text-gray-300 mb-4">
            Empower students to learn, contribute, and showcase their talents —
            so they can build the careers they dream of.
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            With expert mentorship, hands-on projects, and a community that
            lifts each other up, we're helping students turn ambition into
            achievement.
          </p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
            <li>Live coding sessions & workshops</li>
            <li>Open Projects with mentor guidance</li>
            <li>Weekly quizzes and feedback</li>
            <li>Community discussions and support</li>
          </ul>
        </div>
        <div className="overflow-hidden rounded-2xl shadow">
          <img
            src="https://res.cloudinary.com/doytvgisa/image/upload/v1758624468/Gemini_Generated_Image_c414u6c414u6c414_elixe0.png"
            alt="SkillUpX mission - empowering developers through practical education and growth"
            loading="lazy"
            width={800}
            height={384}
            className="w-full h-96 object-cover transform transition-transform duration-1000 hover:scale-105"
          />
        </div>
      </div>

      {/* Student Working Section */}
      <div
        ref={(el) => observe("working", el)}
        className={`grid lg:grid-cols-2 gap-12 px-8 lg:px-16 py-20 items-center transform transition-all duration-1000 ${
          visibleSections.includes("working")
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-12"
        }`}
      >
        <div className="order-2 lg:order-1 overflow-hidden rounded-2xl shadow">
          <img
            src="https://i.pinimg.com/1200x/81/29/92/812992f44a2cd6e6787b8b61209abf48.jpg"
            alt="Students focused on coding and problem-solving skills"
            loading="lazy"
            width={1200}
            height={384}
            className="w-full h-96 object-cover transform transition-transform duration-1000 hover:scale-105"
          />
        </div>
        <div className="order-1 lg:order-2">
          <h2 className="text-3xl font-bold mb-6 text-[#00ADB5]">
            Student Working
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Beyond learning, our students work on real industry projects to
            apply their skills and build professional portfolios.
          </p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
            <li>Internship with live projects</li>
            <li>Building full-stack applications</li>
            <li>Working on AI/ML use cases</li>
            <li>Industry mentorship and feedback</li>
          </ul>
        </div>
      </div>

      {/* Values Section */}
      <div className="bg-gray-50 dark:bg-black py-16 px-8 lg:px-16">
        <h2 className="text-3xl font-semibold text-center mb-10 text-[#00ADB5]">
          Our Core Values
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {values.map((value) => {
            const Icon = value.icon;
            return (
              <div
                key={value.id}
                ref={(el) => observe(`value-${value.id}`, el)}
                className={`p-8 bg-white dark:bg-gray-900 rounded-2xl text-center shadow-md hover:shadow-xl transition-all duration-700 transform hover:scale-105 hover:rotate-1`}
              >
                <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-full bg-[#00ADB5]">
                  <Icon className="w-8 h-8 text-black" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-[#00ADB5]">
                  {value.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{value.description}</p>
              </div>
            );
          })}
        </div>
      </div>
      {/* Impact & Achievements Section */}
      <div className="bg-white dark:bg-gray-900 py-20 px-8 lg:px-24 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 mt-16">
        <h2 className="text-4xl font-extrabold text-center mb-14 text-[#00ADB5]">Impact & Achievements</h2>
        <div className="flex flex-col lg:flex-row items-center justify-center gap-10">
          <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-white dark:bg-gray-900 shadow-xl border border-gray-100 dark:border-gray-800">
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-[#00ADB5] mb-4 shadow-lg">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div className="text-2xl font-bold text-[#00ADB5] mb-1">10,000+ Learners</div>
            <p className="text-gray-700 dark:text-gray-300 text-base">Active students and mentors building real-world skills.</p>
          </div>
          <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-white dark:bg-gray-900 shadow-xl border border-gray-100 dark:border-gray-800">
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-[#00ADB5] mb-4 shadow-Our Storylg">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-base">Industry projects completed by SkillUpX students.</p>
          </div>
          <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-white dark:bg-gray-900 shadow-xl border border-gray-100 dark:border-gray-800">
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-[#00ADB5] mb-4 shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div className="text-2xl font-bold text-[#00ADB5] mb-1">50+ Awards</div>
            <p className="text-gray-700 dark:text-gray-300 text-base">Recognized for innovation and impact in education.</p>
          </div>
          <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-white dark:bg-gray-900 shadow-xl border border-gray-100 dark:border-gray-800">
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-[#00ADB5] mb-4 shadow-lg">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div className="text-2xl font-bold text-[#00ADB5] mb-1">100% Satisfaction</div>
            <p className="text-gray-700 dark:text-gray-300 text-base">Learners rate SkillUpX highly for mentorship and growth.</p>
          </div>
        </div>
      </div>
      {/* Meet the Team Section */}
      {/* <div className="bg-gray-50 dark:bg-gray-900 py-20 px-8 lg:px-24 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 mt-16">
        <h2 className="text-4xl font-extrabold text-center mb-10 text-[#00ADB5]">Meet the Team</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
          <div className="p-8 rounded-3xl bg-white dark:bg-gray-900 shadow-xl text-center border-2 border-[#00ADB5]/20 hover:shadow-2xl transition-all duration-700 transform hover:-translate-y-2 hover:scale-105">
            <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="Portrait of Aman Sharma, Founder and CEO of SkillUpX" loading="lazy" width={80} height={80} className="w-20 h-20 mx-auto rounded-full mb-4 border-4 border-[#00ADB5]" />
            <h3 className="text-xl font-bold mb-2 text-[#00ADB5]">Aman Sharma</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-2">Founder & CEO</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Visionary leader passionate about empowering students and driving innovation in education.</p>
          </div>
          <div className="p-8 rounded-3xl bg-white dark:bg-gray-900 shadow-xl text-center border-2 border-[#00ADB5]/20 hover:shadow-2xl transition-all duration-700 transform hover:-translate-y-2 hover:scale-105">
            <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="Portrait of Priya Verma, Head of Community at SkillUpX" loading="lazy" width={80} height={80} className="w-20 h-20 mx-auto rounded-full mb-4 border-4 border-[#00ADB5]" />
            <h3 className="text-xl font-bold mb-2 text-[#00ADB5]">Priya Verma</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-2">Head of Community</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Building a vibrant, inclusive community and supporting every learner’s journey.</p>
          </div>
          <div className="p-8 rounded-3xl bg-white dark:bg-gray-900 shadow-xl text-center border-2 border-[#00ADB5]/20 hover:shadow-2xl transition-all duration-700 transform hover:-translate-y-2 hover:scale-105">
            <img src="https://randomuser.me/api/portraits/men/65.jpg" alt="Portrait of Rahul Singh, Lead Developer at SkillUpX" loading="lazy" width={80} height={80} className="w-20 h-20 mx-auto rounded-full mb-4 border-4 border-[#00ADB5]" />
            <h3 className="text-xl font-bold mb-2 text-[#00ADB5]">Rahul Singh</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-2">Lead Developer</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Tech enthusiast focused on building robust, scalable solutions for SkillUpX.</p>
          </div>
        </div>
      </div> */}

      {/* ═══════════  PLATFORM FEATURES — SEO Content  ═══════════ */}
      <section className="py-16 px-8 lg:px-16 bg-white dark:bg-black">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white mb-4">
              What Makes <span className="text-[#00ADB5]">SkillUpX</span> Different?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              SkillUpX isn't just another coding platform — it's a complete ecosystem designed to turn beginners into industry-ready developers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Swords, title: "CodeArena – 1v1 Battles", desc: "Real-time competitive coding battles where you solve DSA problems head-to-head. 3000+ questions across arrays, trees, graphs, dynamic programming. Win coins, climb the global leaderboard." },
              { icon: Rocket, title: "Creator Corner – Projects", desc: "Collaborate on real-world applications with developers worldwide. Join teams, use sprint management, earn verified certificates after completing 50 tasks. Build a portfolio that impresses recruiters." },
              { icon: Map, title: "Learning Roadmaps", desc: "Curated step-by-step guides for React, Node.js, Full Stack (MERN), DSA, System Design, Frontend, Backend, DevOps. Includes interview questions for Google, Amazon, Microsoft, Meta." },
              { icon: Users, title: "Developer Connect", desc: "Professional networking built for developers. Find collaborators, endorse skills, join study groups for DSA, React, System Design. Build your professional developer network." },
              { icon: MessageSquare, title: "Tech Reviews & Updates", desc: "Community-driven reviews on frameworks, languages, tools. Compare React vs Angular, Node.js vs Django, and more. Stay updated with tech news and coding tutorials." },
              { icon: Trophy, title: "Coins, Leaderboard & Certificates", desc: "Earn coding coins through battles, DSA practice, and project contributions. Climb global rankings. Earn verified certificates shareable on LinkedIn and resumes." },
            ].map((feature, idx) => (
              <div key={idx} className="p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-[#00ADB5]/50 transition-all duration-300 hover:shadow-lg">
                <div className="w-10 h-10 rounded-xl bg-[#00ADB5]/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-[#00ADB5]" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* SEO comparison paragraph */}
          <div className="mt-10 bg-[#00ADB5]/5 dark:bg-[#00ADB5]/10 rounded-2xl p-8 border border-[#00ADB5]/20">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">SkillUpX vs LeetCode vs HackerRank vs CodeChef</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              Unlike LeetCode (which charges for premium questions and solutions), HackerRank (limited to coding challenges), and CodeChef (focused on competitions), SkillUpX combines DSA practice with 3000+ questions, real-time 1v1 coding battles, real-world project collaboration, curated learning roadmaps, professional developer networking, and community tech reviews — all in one free platform. No premium paywalls, no hidden costs. SkillUpX is the best free alternative to LeetCode, HackerRank, CodeChef, Codeforces, and GeeksforGeeks for developers and students in India and worldwide in 2026.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════  ABOUT PAGE FAQ — SEO Rich Snippets  ═══════════ */}
      <section className="py-14 px-8 lg:px-16 bg-gray-50 dark:bg-gray-950" itemScope itemType="https://schema.org/FAQPage">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3">
              About SkillUpX — <span className="text-[#00ADB5]">FAQs</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-400">Common questions about our platform, mission, and features</p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "What is SkillUpX and who is it for?",
                a: "SkillUpX is a free, all-in-one developer growth platform designed for students, beginners, and experienced developers. It offers CodeArena 1v1 coding battles, 3000+ DSA practice questions, real-world project collaboration through Creator Corner, curated learning roadmaps for React, Node.js, Full Stack, DSA, System Design, and more, Developer Connect for professional networking, and community-driven tech reviews. Whether you're preparing for campus placements, FAANG interviews, or building your first project — SkillUpX has everything you need."
              },
              {
                q: "When was SkillUpX founded and what's the story behind it?",
                a: "SkillUpX was founded in 2022 by a group of passionate students who noticed a common struggle — students were eager to learn but lacked real-world experience, guidance, and a way to showcase their skills. Having experienced the same challenges, the founders created SkillUpX as a place where learning isn't just about theory, but about action, collaboration, and growth. The platform officially launched in 2026 and has grown to 150+ active developers."
              },
              {
                q: "What is SkillUpX's mission?",
                a: "SkillUpX's mission is simple: empower students and developers to learn, contribute, and showcase their talents — so they can build the tech careers they dream of. Through expert mentorship, hands-on real-world projects, curated learning roadmaps, competitive coding battles, and a supportive community, SkillUpX helps developers turn ambition into achievement. All features are 100% free."
              },
              {
                q: "How is SkillUpX different from LeetCode, HackerRank, and CodeChef?",
                a: "While LeetCode, HackerRank, and CodeChef focus primarily on DSA practice and competitions, SkillUpX provides a complete developer growth ecosystem: real-time 1v1 CodeArena battles, real-world project collaboration with teams, curated career roadmaps, professional developer networking, community tech reviews, verified certificates, coding coins rewards, and study groups. Most importantly, SkillUpX is 100% free with no premium paywalls — unlike LeetCode Premium which costs $35/month."
              },
              {
                q: "What programming languages and technologies does SkillUpX support?",
                a: "SkillUpX supports JavaScript, Python, Java, C++, C, TypeScript, Go, and Rust for CodeArena coding battles. Learning roadmaps cover React, Node.js, Full Stack (MERN), DSA, System Design, Frontend, Backend, DevOps, Docker, Kubernetes, MongoDB, SQL, Git, GitHub, REST APIs, and more. Projects in Creator Corner span web development, mobile apps, AI/ML, and open source."
              },
              {
                q: "What are SkillUpX's core values?",
                a: "SkillUpX is built on six core values: Empowerment (giving every student tools to succeed), Collaboration (learning together as a community), Lifelong Learning (continuous growth beyond classrooms), Integrity & Trust (transparency in everything we do), Innovation (encouraging creative problem-solving), and Accessibility & Inclusivity (making learning open to everyone regardless of background)."
              },
              {
                q: "How can I get started on SkillUpX?",
                a: "Getting started is free and takes under 2 minutes: sign up at skillupx.online/signup with email or Google, receive 1000 welcome coins, complete your developer profile, choose a learning roadmap, and start solving DSA questions in CodeArena or join a project in Creator Corner. No credit card required."
              },
              {
                q: "Does SkillUpX help with job placements and interviews?",
                a: "Yes! SkillUpX is designed for placement and interview preparation. Practice 3000+ DSA questions asked at Google, Amazon, Microsoft, Meta, Apple, TCS, Infosys, Wipro, and other top companies. Follow interview-specific roadmaps, build real-world project experience, earn verified certificates, and build a comprehensive developer portfolio."
              }
            ].map((faq, idx) => (
              <details key={idx} itemScope itemProp="mainEntity" itemType="https://schema.org/Question" className="group bg-white dark:bg-gray-900 rounded-xl shadow hover:shadow-md transition-all duration-300 border border-gray-200 dark:border-gray-700 hover:border-[#00ADB5]/50">
                <summary className="flex items-center justify-between p-5 cursor-pointer font-bold text-gray-900 dark:text-white group-open:text-[#00ADB5] text-sm">
                  <span itemProp="name" className="pr-4">{faq.q}</span>
                  <span className="text-xl group-open:rotate-180 transition-transform flex-shrink-0">+</span>
                </summary>
                <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer" className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700 pt-4">
                  <p itemProp="text" className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════  EXPLORE MORE — Internal Links  ═══════════ */}
      <section className="py-14 px-8 lg:px-16 bg-white dark:bg-black">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-black text-center text-gray-900 dark:text-white mb-8">
            Explore <span className="text-[#00ADB5]">SkillUpX</span> Platform
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { to: "/codearena", label: "CodeArena Battles", icon: Swords },
              { to: "/roadmaps", label: "Learning Roadmaps", icon: Map },
              { to: "/", label: "Home", icon: Globe },
              { to: "/TechUpdate", label: "Tech Reviews", icon: MessageSquare },
              { to: "/documentation", label: "Documentation", icon: BookOpen },
              { to: "/contact", label: "Contact Us", icon: MessageSquare },
              { to: "/signup", label: "Sign Up Free", icon: Rocket },
              { to: "/login", label: "Login", icon: Code },
            ].map((link, idx) => (
              <Link key={idx} to={link.to} className="flex items-center gap-2.5 p-3.5 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#00ADB5] hover:shadow transition-all duration-200 group">
                <link.icon className="w-4 h-4 text-[#00ADB5] flex-shrink-0" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-[#00ADB5] transition-colors">{link.label}</span>
              </Link>
            ))}
          </div>

          {/* SEO keyword paragraph */}
          <p className="mt-8 text-center text-xs text-gray-400 dark:text-gray-600 max-w-3xl mx-auto leading-relaxed">
            SkillUpX is a free online coding platform and developer community based in India, empowering students, beginners, and professionals worldwide. Practice data structures and algorithms (DSA) with 3000+ questions, participate in real-time CodeArena 1v1 battles, collaborate on MERN stack and full stack projects, follow curated learning roadmaps, connect with developers through Developer Connect, and read community tech reviews. SkillUpX is the best free alternative to LeetCode, HackerRank, CodeChef, Codeforces, and GeeksforGeeks for coding practice, interview preparation, and developer career growth in 2026.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-8 lg:px-16 text-center bg-gradient-to-r from-[#00ADB5]/10 to-purple-500/10 dark:from-[#00ADB5]/5 dark:to-purple-500/5">
        <h2 className="text-3xl font-bold text-[#00ADB5] mb-4">Ready to Skill Up?</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto">Join 150+ developers already leveling up their skills with SkillUpX. Start your journey today — it's completely free.</p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link to="/signup" className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-[#00ADB5] hover:bg-[#009a9a] text-white rounded-lg font-bold transition-all duration-300 hover:shadow-lg hover:shadow-[#00ADB5]/25 group">
            Get Started Free <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link to="/contact" className="px-8 py-3 border-2 border-[#00ADB5] text-[#00ADB5] hover:bg-[#00ADB5] hover:text-white rounded-lg font-bold transition-all duration-300">
            Contact Us
          </Link>
        </div>
      </section>
    </div>
  );
}
