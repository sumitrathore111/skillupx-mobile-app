import { AlertCircle, Ban, BookOpen, CheckCircle, ChevronRight, FileText, Info, Mail, RefreshCw, Scale, Shield, Sparkles, Users } from "lucide-react";
import { memo, useState } from "react";
import { Link } from "react-router-dom";
import SEO from "../Component/SEO";

// Animated Section Component
const TermSection = memo(({ icon: Icon, title, children, index }: {
  icon: any;
  title: string;
  children: React.ReactNode;
  index: number;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div
      className="group opacity-0 animate-fade-in"
      style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'forwards' }}
    >
      <div className="relative p-8 bg-white dark:bg-white/5 rounded-2xl border-2 border-gray-100 dark:border-white/10 hover:border-[#00ADB5]/50 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1">
        {/* Icon Badge */}
        <div className="absolute -top-6 left-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00ADB5] to-cyan-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between mb-4 pt-2"
        >
          <h2 className="text-2xl font-black text-gray-900 dark:text-white group-hover:text-[#00ADB5] transition-colors">
            {title}
          </h2>
          <ChevronRight
            className={`w-6 h-6 text-[#00ADB5] transition-transform duration-300 ${
              isExpanded ? 'rotate-90' : ''
            }`}
          />
        </button>

        {/* Content */}
        <div className={`overflow-hidden transition-all duration-500 ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="text-gray-600 dark:text-gray-300 leading-relaxed space-y-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
});

TermSection.displayName = 'TermSection';

const TermsAndConditions: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <SEO
        title="Terms and Conditions"
        description="SkillUpX Terms and Conditions – Read our terms of service, user agreement, and usage rules for the platform."
        keywords="terms and conditions, terms of service, user agreement, SkillUpX terms, usage rules, legal, intellectual property rights, account termination policy, prohibited activities, dispute resolution, verified certificates terms, user eligibility, content ownership, India jurisdiction, coding platform terms, free platform terms, user conduct policy, fair use policy, certificate revocation policy, data retention policy"
        canonicalUrl="/terms-and-conditions"
        noIndex={false}
      />
      {/* Hero Section - Clean, No Animations */}
      <section className="relative py-20">
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
            <Scale className="w-4 h-4 text-[#00ADB5]" />
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Legal Agreement</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl lg:text-6xl font-black text-gray-900 dark:text-white mb-6 leading-tight">
            Terms &
            <span className="bg-gradient-to-r from-[#00ADB5] via-cyan-500 to-blue-600 bg-clip-text text-transparent"> Conditions</span>
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-4">
            Please read these terms carefully before using SkillUpX platform
          </p>

          <div className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <FileText className="w-4 h-4" />
            <span>Effective Date: <strong>February 14, 2026</strong></span>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            {[
              { icon: Shield, label: "Fair & Transparent", color: "from-blue-500 to-cyan-500" },
              { icon: Users, label: "User-Friendly", color: "from-purple-500 to-pink-500" },
              { icon: BookOpen, label: "Easy to Understand", color: "from-green-500 to-emerald-500" }
            ].map((stat, idx) => (
              <div key={idx} className="flex items-center gap-3 group">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Introduction Card */}
          <div className="mb-12 p-8 bg-gradient-to-br from-[#00ADB5]/10 to-cyan-500/10 dark:from-[#00ADB5]/20 dark:to-cyan-500/20 rounded-2xl border-2 border-[#00ADB5]/30">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00ADB5] to-cyan-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                <Info className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-3">Important Notice</h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  By accessing or using the SkillUpX platform, you agree to be bound by these Terms and Conditions.
                  If you do not agree with any part of these terms, you may not access or use our services.
                  Please read these terms carefully and contact us if you have any questions.
                </p>
              </div>
            </div>
          </div>

          {/* Terms Sections */}
          <div className="space-y-8">
            <TermSection icon={CheckCircle} title="1. Acceptance of Terms" index={0}>
              <p className="mb-4">
                By creating an account and using SkillUpX, you acknowledge that you have read, understood,
                and agree to be bound by these Terms and Conditions, along with our Privacy Policy.
              </p>
              <ul className="space-y-3">
                {[
                  "You must provide accurate and complete registration information",
                  "You are responsible for maintaining the confidentiality of your account",
                  "You agree to notify us immediately of any unauthorized use of your account",
                  "These terms constitute a legally binding agreement between you and SkillUpX"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 group hover:translate-x-2 transition-transform">
                    <CheckCircle className="w-5 h-5 text-[#00ADB5] flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </TermSection>

            <TermSection icon={Users} title="2. User Eligibility & Account" index={1}>
              <p className="mb-4">
                To use SkillUpX, you must meet certain eligibility requirements:
              </p>
              <div className="space-y-4">
                <div className="p-4 bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">Age Requirement</h4>
                  <p className="text-sm">You must be at least 13 years old to use our service. Users under 18 require parental consent.</p>
                </div>
                <div className="p-4 bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">Account Responsibility</h4>
                  <p className="text-sm">You are solely responsible for all activities that occur under your account. Keep your password secure.</p>
                </div>
                <div className="p-4 bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">One Account Per User</h4>
                  <p className="text-sm">Each user may only create and maintain one account. Multiple accounts may result in suspension.</p>
                </div>
              </div>
            </TermSection>

            <TermSection icon={BookOpen} title="3. Permitted Use of Service" index={2}>
              <p className="mb-4">SkillUpX grants you a limited, non-exclusive, non-transferable license to use our platform for:</p>
              <ul className="space-y-3 mb-4">
                {[
                  "Learning and skill development through our courses and resources",
                  "Collaborating on projects with other developers",
                  "Participating in coding challenges and competitions",
                  "Building and showcasing your portfolio",
                  "Networking with other members of the community"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 group hover:translate-x-2 transition-transform">
                    <CheckCircle className="w-5 h-5 text-[#00ADB5] flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 rounded">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Note:</strong> Your use of the platform must comply with all applicable laws and regulations.
                </p>
              </div>
            </TermSection>

            <TermSection icon={Ban} title="4. Prohibited Activities" index={3}>
              <p className="mb-4 font-semibold text-gray-900 dark:text-white">
                You agree NOT to engage in any of the following prohibited activities:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { title: "Abuse & Harassment", desc: "No harassment, bullying, or hate speech" },
                  { title: "Cheating", desc: "No plagiarism or unfair competition practices" },
                  { title: "Spam", desc: "No unsolicited messages or promotional content" },
                  { title: "Hacking", desc: "No attempting to breach security or access others' accounts" },
                  { title: "False Information", desc: "No impersonation or providing misleading data" },
                  { title: "Illegal Content", desc: "No sharing of illegal or copyrighted material" }
                ].map((item, idx) => (
                  <div key={idx} className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800/50">
                    <div className="flex items-start gap-3">
                      <Ban className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1">{item.title}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm font-semibold text-red-600 dark:text-red-400">
                Violation of these terms may result in immediate account suspension or termination.
              </p>
            </TermSection>

            <TermSection icon={FileText} title="5. Intellectual Property Rights" index={4}>
              <p className="mb-4">Understanding ownership and usage rights is important:</p>
              <div className="space-y-4">
                <div className="p-4 bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">SkillUpX Content</h4>
                  <p className="text-sm mb-2">All content, features, and functionality on SkillUpX (including but not limited to text, graphics, logos, courses, and software) are owned by SkillUpX and protected by copyright, trademark, and other intellectual property laws.</p>
                </div>
                <div className="p-4 bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">Your Content</h4>
                  <p className="text-sm mb-2">You retain ownership of content you create (projects, code, submissions). By posting on SkillUpX, you grant us a license to display, distribute, and promote your content on the platform.</p>
                </div>
                <div className="p-4 bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">Third-Party Content</h4>
                  <p className="text-sm mb-2">Some content may be provided by third parties. You must respect their intellectual property rights and not use such content without proper authorization.</p>
                </div>
              </div>
            </TermSection>

            <TermSection icon={Shield} title="6. Certificates & Verification" index={5}>
              <p className="mb-4">SkillUpX offers verified certificates for completed projects and courses:</p>
              <ul className="space-y-3">
                {[
                  "Certificates are issued upon successful completion of verified tasks and projects",
                  "All certificates are provided completely free of charge",
                  "Certificates are backed by project completion records and peer endorsements",
                  "False claims or cheating will result in certificate revocation and account suspension",
                  "Certificates can be shared on professional networks like LinkedIn"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 group hover:translate-x-2 transition-transform">
                    <CheckCircle className="w-5 h-5 text-[#00ADB5] flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </TermSection>

            <TermSection icon={AlertCircle} title="7. Limitation of Liability" index={6}>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 rounded mb-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Important:</strong> Please read this section carefully as it limits our liability to you.
                </p>
              </div>
              <p className="mb-4">
                To the maximum extent permitted by law, SkillUpX and its affiliates, officers, employees, agents,
                and licensors shall not be liable for:
              </p>
              <ul className="space-y-3">
                {[
                  "Any indirect, incidental, special, or consequential damages",
                  "Loss of profits, data, or business opportunities",
                  "Errors or interruptions in service availability",
                  "Content accuracy or user-generated content",
                  "Third-party services or external links",
                  "Damages resulting from your use or inability to use the service"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm">
                The service is provided "as is" without warranties of any kind, either express or implied.
              </p>
            </TermSection>

            <TermSection icon={Scale} title="8. Dispute Resolution" index={7}>
              <p className="mb-4">In the event of any dispute, claim, or controversy:</p>
              <div className="space-y-4">
                <div className="p-4 bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#00ADB5] text-white flex items-center justify-center text-sm">1</span>
                    Informal Resolution
                  </h4>
                  <p className="text-sm">First, contact us directly to resolve the issue informally. Most disputes can be resolved this way.</p>
                </div>
                <div className="p-4 bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#00ADB5] text-white flex items-center justify-center text-sm">2</span>
                    Mediation
                  </h4>
                  <p className="text-sm">If informal resolution fails, both parties agree to attempt mediation before pursuing legal action.</p>
                </div>
                <div className="p-4 bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#00ADB5] text-white flex items-center justify-center text-sm">3</span>
                    Governing Law
                  </h4>
                  <p className="text-sm">These terms are governed by the laws of India. Jurisdiction lies with courts in [Your City].</p>
                </div>
              </div>
            </TermSection>

            <TermSection icon={RefreshCw} title="9. Modifications to Terms" index={8}>
              <p className="mb-4">
                We reserve the right to modify or update these Terms and Conditions at any time.
                When we make significant changes:
              </p>
              <ul className="space-y-3 mb-4">
                {[
                  "We will notify you via email at your registered address",
                  "Display a prominent notice on the platform",
                  "Update the 'Effective Date' at the top of this page",
                  "Provide a reasonable time period before changes take effect"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 group hover:translate-x-2 transition-transform">
                    <CheckCircle className="w-5 h-5 text-[#00ADB5] flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm">
                Your continued use of SkillUpX after modifications constitutes acceptance of the updated terms.
              </p>
            </TermSection>

            <TermSection icon={Ban} title="10. Account Termination" index={9}>
              <p className="mb-4">We may suspend or terminate your account if:</p>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                {[
                  "You violate these Terms and Conditions",
                  "You engage in fraudulent or illegal activities",
                  "You create multiple accounts or misuse the platform",
                  "Your account remains inactive for an extended period",
                  "We receive valid legal requests or court orders",
                  "You engage in behavior harmful to the community"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-white/50 dark:bg-white/5 rounded-lg">
                    <Ban className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm">
                You may also delete your account at any time through your account settings.
                Upon termination, your access to the platform will cease, but certain data may be retained as per our Privacy Policy.
              </p>
            </TermSection>

            <TermSection icon={Mail} title="11. Contact Information" index={10}>
              <p className="mb-6">
                Questions about these Terms and Conditions? We're here to help clarify anything.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 bg-gradient-to-br from-[#00ADB5]/10 to-cyan-500/10 dark:from-[#00ADB5]/20 dark:to-cyan-500/20 rounded-xl border-2 border-[#00ADB5]/30">
                  <Mail className="w-8 h-8 text-[#00ADB5] mb-4" />
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">General Support</h4>
                  <a href="mailto:support@skillupx.com" className="text-[#00ADB5] hover:underline font-semibold">
                    support@skillupx.com
                  </a>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    For general inquiries and support
                  </p>
                </div>

                <div className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 rounded-xl border-2 border-purple-500/30">
                  <Scale className="w-8 h-8 text-purple-500 mb-4" />
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">Legal Matters</h4>
                  <a href="mailto:legal@skillupx.com" className="text-purple-500 hover:underline font-semibold">
                    legal@skillupx.com
                  </a>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    For legal questions and concerns
                  </p>
                </div>
              </div>
            </TermSection>
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 p-8 bg-gradient-to-r from-slate-900 to-gray-900 rounded-2xl text-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00ADB5]/20 border border-[#00ADB5]/30">
                <Sparkles className="w-4 h-4 text-[#00ADB5]" />
                <span className="text-sm font-bold text-[#00ADB5]">READY TO BEGIN?</span>
              </div>

              <h3 className="text-3xl font-black text-white">
                Agree to Terms & Start Your Journey
              </h3>

              <p className="text-gray-300 max-w-2xl mx-auto">
                Join thousands of developers building their future with SkillUpX
              </p>

              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#00ADB5] to-cyan-600 rounded-xl font-bold text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
              >
                Accept & Create Account
                <ChevronRight className="w-5 h-5" />
              </Link>

              <p className="text-sm text-gray-400">
                By signing up, you agree to these Terms and our{" "}
                <Link to="/privacy" className="text-[#00ADB5] hover:underline">Privacy Policy</Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TermsAndConditions;
