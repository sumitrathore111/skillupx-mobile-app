/**
 * Static Pre-rendering Script for SkillUpX
 *
 * Runs after `vite build` to generate route-specific HTML files.
 * Each public route gets its own index.html with correct:
 *   - <title>, <meta description>, <link canonical>
 *   - OG & Twitter card tags
 *   - hreflang tags
 *   - Pre-rendered content inside <div id="root"> for SEO crawlers
 *
 * When React mounts (createRoot), it replaces the pre-rendered content.
 * Crawlers that don't execute JS still get correct meta tags + visible content.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');

// Read the built index.html as the base template
const baseHtml = readFileSync(join(distDir, 'index.html'), 'utf-8');

// Route-specific SEO data (matches react-helmet-async props in each page component)
const routes = [
  {
    path: '/about',
    title: 'About SkillUpX – Our Story, Mission, Team & Platform Features | SkillUpX',
    description: "Learn about SkillUpX – India's free developer platform with CodeArena coding battles, project collaboration, learning roadmaps, Developer Connect, tech reviews, and 3000+ DSA questions. Meet our team and discover our mission.",
    canonical: 'https://skillupx.online/about',
    rootContent: `
      <main style="max-width:900px;margin:0 auto;padding:40px 20px;font-family:system-ui,-apple-system,sans-serif">
        <h1 style="color:#00ADB5;font-size:2rem;margin-bottom:16px">About SkillUpX</h1>
        <p style="color:#555;line-height:1.7;margin-bottom:12px">SkillUpX was founded with a mission to empower developers through practical education, real-world project collaboration, and community-driven learning.</p>
        <h2 style="color:#333;font-size:1.4rem;margin:24px 0 12px">Our Mission</h2>
        <p style="color:#555;line-height:1.7;margin-bottom:12px">We believe every developer deserves access to quality education and practical experience. SkillUpX provides CodeArena 1v1 coding battles, Creator Corner project collaboration, curated learning roadmaps, Developer Connect networking, and community-driven tech reviews — all completely free.</p>
        <h2 style="color:#333;font-size:1.4rem;margin:24px 0 12px">Platform Features</h2>
        <ul style="color:#555;line-height:1.8;padding-left:20px">
          <li><strong>CodeArena</strong> – Real-time 1v1 coding battles with DSA challenges</li>
          <li><strong>Creator Corner</strong> – Submit ideas, form teams, build real-world projects</li>
          <li><strong>Learning Roadmaps</strong> – Curated paths for React, Node.js, Full Stack, DSA & more</li>
          <li><strong>Developer Connect</strong> – Network with developers, endorse skills, join study groups</li>
          <li><strong>Tech Reviews</strong> – Community-driven reviews on languages, frameworks & tools</li>
        </ul>
        <p style="color:#555;line-height:1.7;margin-top:16px"><a href="/" style="color:#00ADB5;text-decoration:none;font-weight:600">← Back to SkillUpX Home</a></p>
      </main>`
  },
  {
    path: '/contact',
    title: 'Contact Us – Get in Touch with SkillUpX | SkillUpX',
    description: "Have questions about SkillUpX? Contact us via phone, email, or WhatsApp. We're here to help you with coding battles, projects, DSA practice, interview prep, and more.",
    canonical: 'https://skillupx.online/contact',
    rootContent: `
      <main style="max-width:900px;margin:0 auto;padding:40px 20px;font-family:system-ui,-apple-system,sans-serif">
        <h1 style="color:#00ADB5;font-size:2rem;margin-bottom:16px">Contact SkillUpX</h1>
        <p style="color:#555;line-height:1.7;margin-bottom:12px">Have questions, feedback, or partnership inquiries? We'd love to hear from you.</p>
        <h2 style="color:#333;font-size:1.4rem;margin:24px 0 12px">Get in Touch</h2>
        <ul style="color:#555;line-height:2;padding-left:20px;list-style:none">
          <li>📧 Email: <a href="mailto:contact@SkillUpX.com" style="color:#00ADB5">contact@SkillUpX.com</a></li>
          <li>📞 Phone: <a href="tel:+918756824350" style="color:#00ADB5">+91 8756824350</a></li>
        </ul>
        <p style="color:#555;line-height:1.7;margin-top:16px">We're here to help with CodeArena battles, Creator Corner projects, learning roadmaps, Developer Connect, and all platform features.</p>
        <p style="color:#555;line-height:1.7;margin-top:16px"><a href="/" style="color:#00ADB5;text-decoration:none;font-weight:600">← Back to SkillUpX Home</a></p>
      </main>`
  },
  {
    path: '/TechUpdate',
    title: 'Tech Updates & Reviews – Latest Technology News, AI & Coding | SkillUpX',
    description: "Read tech reviews and stay ahead with the latest tech news, AI research, coding tutorials, and technology updates. Community-driven tech reviews on SkillUpX – honest reviews from real developers.",
    canonical: 'https://skillupx.online/TechUpdate',
    rootContent: `
      <main style="max-width:900px;margin:0 auto;padding:40px 20px;font-family:system-ui,-apple-system,sans-serif">
        <h1 style="color:#00ADB5;font-size:2rem;margin-bottom:16px">Tech Updates & Reviews</h1>
        <p style="color:#555;line-height:1.7;margin-bottom:12px">Stay ahead with the latest technology news, AI breakthroughs, coding tutorials, and framework updates from the developer community.</p>
        <h2 style="color:#333;font-size:1.4rem;margin:24px 0 12px">Community Tech Reviews</h2>
        <p style="color:#555;line-height:1.7;margin-bottom:12px">Read honest, community-driven reviews on programming languages, frameworks, tools, libraries, and learning platforms. Share your own experiences and help fellow developers make informed technology decisions.</p>
        <h2 style="color:#333;font-size:1.4rem;margin:24px 0 12px">Topics We Cover</h2>
        <ul style="color:#555;line-height:1.8;padding-left:20px">
          <li>AI & Machine Learning updates</li>
          <li>Web Development frameworks (React, Vue, Angular, Next.js)</li>
          <li>Backend technologies (Node.js, Python, Go, Rust)</li>
          <li>DevOps & Cloud computing</li>
          <li>Mobile development trends</li>
          <li>Open source project spotlights</li>
        </ul>
        <p style="color:#555;line-height:1.7;margin-top:16px"><a href="/" style="color:#00ADB5;text-decoration:none;font-weight:600">← Back to SkillUpX Home</a></p>
      </main>`
  },
  {
    path: '/documentation',
    title: 'Documentation – Getting Started, CodeArena, Creator Corner & More | SkillUpX',
    description: "Complete documentation for SkillUpX platform. Learn how to use CodeArena for coding battles & DSA practice, Creator Corner for projects, Learning Roadmaps for interview prep & career paths, and Developer Connect.",
    canonical: 'https://skillupx.online/documentation',
    rootContent: `
      <main style="max-width:900px;margin:0 auto;padding:40px 20px;font-family:system-ui,-apple-system,sans-serif">
        <h1 style="color:#00ADB5;font-size:2rem;margin-bottom:16px">SkillUpX Documentation</h1>
        <p style="color:#555;line-height:1.7;margin-bottom:12px">Complete guide to all SkillUpX platform features. Get started quickly and make the most of every tool.</p>
        <h2 style="color:#333;font-size:1.4rem;margin:24px 0 12px">Platform Features</h2>
        <ul style="color:#555;line-height:1.8;padding-left:20px">
          <li><strong>Getting Started</strong> – Create your account, earn 1000 welcome coins, set up your profile</li>
          <li><strong>CodeArena</strong> – 1v1 coding battles, solo practice mode, 3000+ DSA problems, global leaderboard</li>
          <li><strong>Creator Corner</strong> – Submit project ideas, join teams, sprint management, earn certificates</li>
          <li><strong>Project Bazaar</strong> – Browse and join open source projects from the community</li>
          <li><strong>Learning Roadmaps</strong> – Step-by-step guides for React, Node.js, Full Stack, DSA & more</li>
          <li><strong>Developer Connect</strong> – Find developers, endorse skills, direct messaging, tech reviews</li>
          <li><strong>Courses</strong> – Curated learning paths, video tutorials, interactive challenges</li>
        </ul>
        <h2 style="color:#333;font-size:1.4rem;margin:24px 0 12px">Quick Start</h2>
        <ol style="color:#555;line-height:1.8;padding-left:20px">
          <li>Sign up for a free account at <a href="/signup" style="color:#00ADB5">skillupx.online/signup</a></li>
          <li>Complete your developer profile with skills and interests</li>
          <li>Start practicing DSA in CodeArena or join a project in Creator Corner</li>
          <li>Follow a Learning Roadmap to structure your learning journey</li>
        </ol>
        <p style="color:#555;line-height:1.7;margin-top:16px"><a href="/" style="color:#00ADB5;text-decoration:none;font-weight:600">← Back to SkillUpX Home</a></p>
      </main>`
  },
  {
    path: '/privacy-policy',
    title: 'Privacy Policy | SkillUpX',
    description: "SkillUpX Privacy Policy – Learn how we collect, use, protect, and handle your personal data. Your privacy matters to us.",
    canonical: 'https://skillupx.online/privacy-policy',
    rootContent: `
      <main style="max-width:900px;margin:0 auto;padding:40px 20px;font-family:system-ui,-apple-system,sans-serif">
        <h1 style="color:#00ADB5;font-size:2rem;margin-bottom:16px">Privacy Policy</h1>
        <p style="color:#555;line-height:1.7;margin-bottom:12px">At SkillUpX, your privacy is our priority. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our platform.</p>
        <h2 style="color:#333;font-size:1.4rem;margin:24px 0 12px">Key Points</h2>
        <ul style="color:#555;line-height:1.8;padding-left:20px">
          <li>We only collect information necessary to provide our services</li>
          <li>Your data is encrypted and securely stored</li>
          <li>We never sell your personal information to third parties</li>
          <li>You can request data deletion at any time</li>
        </ul>
        <p style="color:#555;line-height:1.7;margin-top:16px">For questions about our privacy practices, contact us at <a href="mailto:contact@SkillUpX.com" style="color:#00ADB5">contact@SkillUpX.com</a>.</p>
        <p style="color:#555;line-height:1.7;margin-top:16px"><a href="/" style="color:#00ADB5;text-decoration:none;font-weight:600">← Back to SkillUpX Home</a></p>
      </main>`
  },
  {
    path: '/terms-and-conditions',
    title: 'Terms and Conditions | SkillUpX',
    description: "SkillUpX Terms and Conditions – Read our terms of service, user agreement, and usage rules for the platform.",
    canonical: 'https://skillupx.online/terms-and-conditions',
    rootContent: `
      <main style="max-width:900px;margin:0 auto;padding:40px 20px;font-family:system-ui,-apple-system,sans-serif">
        <h1 style="color:#00ADB5;font-size:2rem;margin-bottom:16px">Terms and Conditions</h1>
        <p style="color:#555;line-height:1.7;margin-bottom:12px">Welcome to SkillUpX. By accessing or using our platform, you agree to be bound by these Terms and Conditions. Please read them carefully.</p>
        <h2 style="color:#333;font-size:1.4rem;margin:24px 0 12px">Summary</h2>
        <ul style="color:#555;line-height:1.8;padding-left:20px">
          <li>SkillUpX is a free developer education and collaboration platform</li>
          <li>Users must be at least 13 years old to create an account</li>
          <li>You are responsible for your account security and content</li>
          <li>Misuse of CodeArena, Creator Corner, or community features may result in account suspension</li>
          <li>All platform content and features are provided as-is</li>
        </ul>
        <p style="color:#555;line-height:1.7;margin-top:16px">For questions, contact <a href="mailto:contact@SkillUpX.com" style="color:#00ADB5">contact@SkillUpX.com</a>.</p>
        <p style="color:#555;line-height:1.7;margin-top:16px"><a href="/" style="color:#00ADB5;text-decoration:none;font-weight:600">← Back to SkillUpX Home</a></p>
      </main>`
  },
  {
    path: '/blog',
    title: 'Developer Blog – DSA, Coding Interviews, React, Node.js & Career Tips | SkillUpX',
    description: "Read expert articles on DSA patterns, coding interview preparation, React vs Next.js, full stack roadmaps, open source contributions, and developer career growth. Free tutorials from SkillUpX.",
    canonical: 'https://skillupx.online/blog',
    rootContent: `
      <main style="max-width:900px;margin:0 auto;padding:40px 20px;font-family:system-ui,-apple-system,sans-serif">
        <h1 style="color:#00ADB5;font-size:2rem;margin-bottom:16px">SkillUpX Developer Blog</h1>
        <p style="color:#555;line-height:1.7;margin-bottom:24px">Expert articles on DSA patterns, coding interviews, web development, open source, and career growth — written by developers, for developers.</p>
        <h2 style="color:#333;font-size:1.4rem;margin:24px 0 12px">Top 10 DSA Patterns Every Developer Must Know in 2025</h2>
        <p style="color:#555;line-height:1.7;margin-bottom:12px">Master the most frequently asked data structure and algorithm patterns for coding interviews — from sliding window to dynamic programming, with practical examples and time complexity analysis.</p>
        <h2 style="color:#333;font-size:1.4rem;margin:24px 0 12px">React vs Next.js in 2025: Which Should You Learn First?</h2>
        <p style="color:#555;line-height:1.7;margin-bottom:12px">A practical comparison of React and Next.js for beginners and intermediate developers. Understand SSR, CSR, RSC, and when to pick which framework.</p>
        <h2 style="color:#333;font-size:1.4rem;margin:24px 0 12px">The Complete Coding Interview Preparation Guide for 2025</h2>
        <p style="color:#555;line-height:1.7;margin-bottom:12px">A step-by-step roadmap covering DSA practice, system design basics, behavioral interviews, and portfolio building.</p>
        <h2 style="color:#333;font-size:1.4rem;margin:24px 0 12px">Why Building Real-World Projects Beats Tutorial Hell</h2>
        <p style="color:#555;line-height:1.7;margin-bottom:12px">Stop watching tutorials endlessly. Learn how building actual projects accelerates your growth and helps you land developer jobs faster.</p>
        <h2 style="color:#333;font-size:1.4rem;margin:24px 0 12px">How to Start Contributing to Open Source as a Beginner</h2>
        <p style="color:#555;line-height:1.7;margin-bottom:12px">A practical guide to making your first open source contribution — from finding beginner-friendly repos to writing your first pull request.</p>
        <h2 style="color:#333;font-size:1.4rem;margin:24px 0 12px">Full Stack Developer Roadmap 2025: From Zero to Job-Ready</h2>
        <p style="color:#555;line-height:1.7;margin-bottom:12px">The complete learning path covering HTML, CSS, JavaScript, React, Node.js, databases, DevOps, and everything in between.</p>
        <p style="color:#555;line-height:1.7;margin-top:24px"><a href="/" style="color:#00ADB5;text-decoration:none;font-weight:600">← Back to SkillUpX Home</a></p>
      </main>`
  }
];

/**
 * Generate a pre-rendered HTML file for a specific route.
 * Replaces meta tags, OG tags, Twitter tags, canonical, and hreflang
 * with route-specific values. Injects pre-rendered content into #root.
 */
function prerenderRoute(html, route) {
  // Title
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${route.title}</title>`
  );

  // Meta description
  html = html.replace(
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${route.description}" />`
  );

  // Canonical URL
  html = html.replace(
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${route.canonical}" />`
  );

  // Open Graph
  html = html.replace(
    /<meta property="og:url" content="[^"]*" \/>/,
    `<meta property="og:url" content="${route.canonical}" />`
  );
  html = html.replace(
    /<meta property="og:title" content="[^"]*" \/>/,
    `<meta property="og:title" content="${route.title}" />`
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*" \/>/,
    `<meta property="og:description" content="${route.description}" />`
  );

  // Twitter Card
  html = html.replace(
    /<meta name="twitter:url" content="[^"]*" \/>/,
    `<meta name="twitter:url" content="${route.canonical}" />`
  );
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*" \/>/,
    `<meta name="twitter:title" content="${route.title}" />`
  );
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*" \/>/,
    `<meta name="twitter:description" content="${route.description}" />`
  );

  // hreflang tags
  html = html.replace(
    /<link rel="alternate" hreflang="en" href="[^"]*" \/>/,
    `<link rel="alternate" hreflang="en" href="${route.canonical}" />`
  );
  html = html.replace(
    /<link rel="alternate" hreflang="x-default" href="[^"]*" \/>/,
    `<link rel="alternate" hreflang="x-default" href="${route.canonical}" />`
  );

  // Inject pre-rendered content inside <div id="root"> for SEO crawlers.
  // React's createRoot().render() will replace this content when the app hydrates.
  if (route.rootContent) {
    html = html.replace(
      /<div id="root">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
      `<div id="root">${route.rootContent}</div>`
    );
  }

  return html;
}

// ---- Main execution ----
console.log('🔄 Pre-rendering public routes...\n');

let successCount = 0;

for (const route of routes) {
  try {
    const html = prerenderRoute(baseHtml, route);
    const routeDir = join(distDir, route.path);
    mkdirSync(routeDir, { recursive: true });
    writeFileSync(join(routeDir, 'index.html'), html, 'utf-8');
    console.log(`  ✓ ${route.path} → dist${route.path}/index.html`);
    successCount++;
  } catch (err) {
    console.error(`  ✗ ${route.path} failed:`, err.message);
  }
}

console.log(`\n✅ Pre-rendered ${successCount}/${routes.length} routes successfully!`);
console.log('   Each route now has correct meta tags + visible content for SEO crawlers.\n');
