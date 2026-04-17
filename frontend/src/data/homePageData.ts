import type { LucideIcon } from 'lucide-react';
import { Brain, Code, GitBranch, Lightbulb, Star, Target, Trophy, Users } from 'lucide-react';

export interface ServiceData {
  icon: LucideIcon;
  title: string;
  description: string;
  image: string;
  stats?: {
    number: string;
    label: string;
  };
}

export interface FeatureData {
  icon: LucideIcon;
  title: string;
  description: string;
  image: string;
  color: string;
  benefits: string[];
}

export interface TestimonialData {
  name: string;
  role: string;
  company: string;
  quote: string;
  // image: string;
  rating: number;
  verified: boolean;
}

export interface StatisticData {
  number: string;
  label: string;
  sublabel: string;
  icon: LucideIcon;
  color: string;
}

export const services: ServiceData[] = [
  {
    icon: Code,
    title: "Real-World Project Experience",
    description: "Work on actual open-source projects used by companies worldwide. Build portfolio-worthy contributions that demonstrate your coding skills and problem-solving abilities.",
    image: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&q=80",
    stats: { number: "500+", label: "Live Projects" }
  },
  {
    icon: Brain,
    title: "Industry Expert Mentorship",
    description: "Get personalized guidance from senior developers at top tech companies. Receive code reviews, career advice, and technical insights from professionals who've been where you want to go.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
    stats: { number: "50+", label: "Expert Mentors" }
  },
  {
    icon: Users,
    title: "Global Developer Community",
    description: "Connect with passionate developers from 40+ countries. Collaborate on projects, share knowledge, and build meaningful relationships that advance your career.",
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80",
    stats: { number: "10K+", label: "Active Members" }
  },
  {
    icon: Target,
    title: "Career-Focused Learning Paths",
    description: "Follow structured roadmaps designed by industry professionals. Master the exact skills and technologies that employers are actively seeking in today's job market.",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80",
    stats: { number: "20+", label: "Career Paths" }
  }
];

export const features: FeatureData[] = [
  {
    icon: GitBranch,
    title: "Open Source Contributions",
    description: "Contribute to real repositories and make meaningful impact",
    image: "https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=600&q=80",
    color: "from-purple-600 to-purple-800",
    benefits: ["GitHub portfolio building", "Real-world experience", "Code review process", "Collaboration skills"]
  },
  {
    icon: Lightbulb,
    title: "Innovation Challenges",
    description: "Solve real problems faced by startups and enterprises",
    image: "https://images.unsplash.com/photo-1553484771-371a605b060b?w=600&q=80",
    color: "from-yellow-500 to-orange-600",
    benefits: ["Problem-solving skills", "Innovation mindset", "Entrepreneurial thinking", "Industry exposure"]
  },
  {
    icon: Trophy,
    title: "Achievement System",
    description: "Earn verified badges and certificates for your accomplishments",
    image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&q=80",
    color: "from-green-500 to-emerald-600",
    benefits: ["Verified credentials", "Skill validation", "Professional recognition", "Career advancement"]
  },
  {
    icon: Star,
    title: "Premium Learning Resources",
    description: "Access exclusive content from industry leaders and experts",
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&q=80",
    color: "from-blue-600 to-indigo-700",
    benefits: ["Expert-created content", "Latest technologies", "Hands-on tutorials", "Best practices"]
  }
];

export const testimonials: TestimonialData[] = [
  {
    name: "Pawan",
    role: "Software Engineer",
    company: "Google",
    quote: "SkillUpX transformed my career. The real project experience I gained here directly led to my job at Google. The mentorship was invaluable.",
    // image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&q=80",
     rating: 5,
    verified: true
  },

  {
    name: "Priya Sharma",
    role: "Frontend Developer",
    company: "Stripe",
    quote: "The community here is incredible. I learned more in 6 months than I did in 2 years of traditional courses. The projects are real and challenging.",
    // image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80",
    rating: 5,
    verified: true
  },

];

export const statistics: StatisticData[] = [
  {
    number: "12,000+",
    label: "Students Placed",
    sublabel: "In top tech companies",
    icon: Users,
    color: "from-blue-500 to-cyan-500"
  },
  {
    number: "89%",
    label: "Job Success Rate",
    sublabel: "Within 6 months",
    icon: Trophy,
    color: "from-green-500 to-emerald-500"
  },
  {
    number: "500+",
    label: "Live Projects",
    sublabel: "Real-world experience",
    icon: Code,
    color: "from-purple-500 to-violet-500"
  },
  {
    number: "$75K",
    label: "Average Salary",
    sublabel: "First job placement",
    icon: Target,
    color: "from-orange-500 to-red-500"
  }
];

export const galleryImages = [
  {
    url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&q=80",
    alt: "Team collaboration session",
    caption: "Weekly hackathon winners"
  },
  {
    url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&q=80",
    alt: "Developer workspace",
    caption: "Modern workspace setup"
  },
  {
    url: "https://images.unsplash.com/photo-1531537571171-a707bf2683da?w=600&q=80",
    alt: "Code review session",
    caption: "Mentor code review"
  },
  {
    url: "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=600&q=80",
    alt: "Team presentation",
    caption: "Project showcase day"
  },
  {
    url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&q=80",
    alt: "Developer conference",
    caption: "Tech conference networking"
  }
];
