import { Bell, CheckCircle, ChevronRight, Eye, FileText, Lock, Mail, Shield, Sparkles, UserCheck } from "lucide-react";
import { memo, useState } from "react";
import { Link } from "react-router-dom";
import SEO from "../Component/SEO";

// Animated Section Component
const PolicySection = memo(({ icon: Icon, title, children, index }: {
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

PolicySection.displayName = 'PolicySection';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <SEO
        title="Privacy Policy"
        description="SkillUpX Privacy Policy – Learn how we collect, use, protect, and handle your personal data. Your privacy matters to us."
        keywords="privacy policy, data protection, personal information, SkillUpX privacy, user data, cookies, GDPR compliant, CCPA compliance, 256-bit encryption, data security, user rights, data deletion request, cookie policy, third-party data sharing, analytics cookies, preference cookies, data portability, privacy rights, secure coding platform, SkillUpX data protection officer"
        canonicalUrl="/privacy-policy"
        noIndex={false}
      />
      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center bg-gradient-to-br from-slate-50 via-blue-50/50 to-cyan-50/30 dark:from-black dark:via-black dark:to-black">
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
            <Shield className="w-4 h-4 text-[#00ADB5]" />
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Your Privacy Matters</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl lg:text-6xl font-black text-gray-900 dark:text-white mb-6 leading-tight">
            Privacy
            <span className="bg-gradient-to-r from-[#00ADB5] via-cyan-500 to-blue-600 bg-clip-text text-transparent"> Policy</span>
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-4">
            We're committed to protecting your personal information and your right to privacy
          </p>

          <div className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <FileText className="w-4 h-4" />
            <span>Effective Date: <strong>February 14, 2026</strong></span>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            {[
              { icon: Lock, label: "256-bit Encryption", color: "from-blue-500 to-cyan-500" },
              { icon: Shield, label: "GDPR Compliant", color: "from-purple-500 to-pink-500" },
              { icon: Eye, label: "Full Transparency", color: "from-green-500 to-emerald-500" }
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
      <section className="py-16 px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-cyan-50/20 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-5xl mx-auto">
          {/* Introduction Card */}
          <div className="mb-12 p-8 bg-gradient-to-br from-[#00ADB5]/10 to-cyan-500/10 dark:from-[#00ADB5]/20 dark:to-cyan-500/20 rounded-2xl border-2 border-[#00ADB5]/30">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00ADB5] to-cyan-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-3">Welcome to SkillUpX Privacy Policy</h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  We value your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our services. By using SkillUpX, you agree to the terms outlined in this policy.
                </p>
              </div>
            </div>
          </div>

          {/* Policy Sections */}
          <div className="space-y-8">
            <PolicySection icon={FileText} title="1. Information We Collect" index={0}>
              <p>We collect various types of information to provide and improve our services:</p>
              <ul className="space-y-3 mt-4">
                {[
                  "Personal identification information (Name, email address, profile picture)",
                  "Account credentials and authentication data",
                  "Usage data, browsing patterns, and interaction analytics",
                  "Device information (IP address, browser type, operating system)",
                  "Project contributions, code submissions, and collaboration data",
                  "Communication preferences and feedback",
                  "Payment information (processed securely through third-party providers)"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 group hover:translate-x-2 transition-transform">
                    <CheckCircle className="w-5 h-5 text-[#00ADB5] flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </PolicySection>

            <PolicySection icon={Lock} title="2. How We Use Your Information" index={1}>
              <p>Your data helps us deliver a better experience. We use your information to:</p>
              <ul className="space-y-3 mt-4">
                {[
                  "Provide, maintain, and improve our platform and services",
                  "Personalize your learning experience and recommend relevant content",
                  "Enable collaboration features and team matching",
                  "Process transactions and issue certificates",
                  "Send important notifications about your account and projects",
                  "Analyze usage patterns to enhance platform performance",
                  "Protect against fraud, abuse, and security threats",
                  "Comply with legal obligations and enforce our terms"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 group hover:translate-x-2 transition-transform">
                    <CheckCircle className="w-5 h-5 text-[#00ADB5] flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </PolicySection>

            <PolicySection icon={Shield} title="3. Data Security & Protection" index={2}>
              <p className="mb-4">
                We implement industry-leading security measures to protect your personal information:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { title: "Encryption", desc: "256-bit SSL encryption for all data transmission" },
                  { title: "Access Control", desc: "Strict access controls and authentication" },
                  { title: "Monitoring", desc: "24/7 security monitoring and threat detection" },
                  { title: "Compliance", desc: "GDPR, CCPA, and industry standard compliance" }
                ].map((feature, idx) => (
                  <div key={idx} className="p-4 bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 hover:border-[#00ADB5]/50 transition-all">
                    <h4 className="font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{feature.desc}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded">
                <strong>Note:</strong> While we implement robust security measures, no method of transmission over the Internet is 100% secure. We continuously work to enhance our security protocols.
              </p>
            </PolicySection>

            <PolicySection icon={UserCheck} title="4. Your Privacy Rights" index={3}>
              <p className="mb-4">You have complete control over your personal data. Your rights include:</p>
              <ul className="space-y-3">
                {[
                  { title: "Access", desc: "Request a copy of all personal data we hold about you" },
                  { title: "Correction", desc: "Update or correct any inaccurate information" },
                  { title: "Deletion", desc: "Request permanent deletion of your account and data" },
                  { title: "Portability", desc: "Export your data in a machine-readable format" },
                  { title: "Opt-Out", desc: "Unsubscribe from marketing communications anytime" },
                  { title: "Restriction", desc: "Limit how we process certain types of your data" }
                ].map((right, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-3 bg-white/50 dark:bg-white/5 rounded-lg hover:bg-white dark:hover:bg-white/10 transition-colors">
                    <CheckCircle className="w-5 h-5 text-[#00ADB5] flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-gray-900 dark:text-white">{right.title}:</strong>
                      <span className="text-gray-600 dark:text-gray-400"> {right.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm">
                To exercise any of these rights, please contact us at{" "}
                <a href="mailto:privacy@skillupx.com" className="text-[#00ADB5] hover:underline font-semibold">
                  privacy@skillupx.com
                </a>
              </p>
            </PolicySection>

            <PolicySection icon={Bell} title="5. Cookies & Tracking Technologies" index={4}>
              <p className="mb-4">We use cookies and similar technologies to enhance your experience:</p>
              <div className="space-y-4">
                {[
                  {
                    type: "Essential Cookies",
                    desc: "Required for basic platform functionality and security",
                    color: "from-red-500 to-orange-500"
                  },
                  {
                    type: "Analytics Cookies",
                    desc: "Help us understand how you use our platform to improve it",
                    color: "from-blue-500 to-cyan-500"
                  },
                  {
                    type: "Preference Cookies",
                    desc: "Remember your settings and personalize your experience",
                    color: "from-purple-500 to-pink-500"
                  }
                ].map((cookie, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 hover:border-[#00ADB5]/50 transition-all">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${cookie.color} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white font-bold">{idx + 1}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-1">{cookie.type}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{cookie.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm">
                You can manage cookie preferences in your browser settings. Note that disabling certain cookies may limit platform functionality.
              </p>
            </PolicySection>

            <PolicySection icon={Sparkles} title="6. Third-Party Advertising (Google AdSense)" index={5}>
              <p className="mb-4">
                We use Google AdSense to display advertisements on our platform. This section explains how advertising works and your choices:
              </p>

              <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded mb-4">
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">About Google AdSense</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Google AdSense is a program run by Google that allows publishers like us to earn revenue by displaying ads. Google and its partners use cookies to serve ads based on your prior visits to this or other websites.
                </p>
              </div>

              <div className="space-y-4 mb-4">
                <div className="p-4 bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">How Advertising Cookies Work</h4>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[#00ADB5] flex-shrink-0 mt-0.5" />
                      <span>Google uses cookies to serve ads based on your visit to this site and other sites on the Internet</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[#00ADB5] flex-shrink-0 mt-0.5" />
                      <span>Google's use of advertising cookies enables it and its partners to serve ads based on your browsing patterns</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[#00ADB5] flex-shrink-0 mt-0.5" />
                      <span>We do not control these third-party cookies or the data collected</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">Your Advertising Choices</h4>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[#00ADB5] flex-shrink-0 mt-0.5" />
                      <span>
                        Opt out of personalized advertising by visiting{" "}
                        <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-[#00ADB5] hover:underline">
                          Google Ads Settings
                        </a>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[#00ADB5] flex-shrink-0 mt-0.5" />
                      <span>
                        Visit{" "}
                        <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" className="text-[#00ADB5] hover:underline">
                          AboutAds.info
                        </a>
                        {" "}to opt out of third-party vendor cookies
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[#00ADB5] flex-shrink-0 mt-0.5" />
                      <span>
                        Learn more about Google's privacy practices at{" "}
                        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#00ADB5] hover:underline">
                          Google Privacy Policy
                        </a>
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded">
                <strong>Note:</strong> By using SkillUpX and accepting cookies, you consent to the use of advertising cookies by Google and its partners as described above.
              </p>
            </PolicySection>

            <PolicySection icon={FileText} title="7. Data Sharing & Third Parties" index={6}>
              <p className="mb-4">We respect your privacy and only share data when necessary:</p>
              <ul className="space-y-3">
                {[
                  "We never sell your personal information to third parties",
                  "Advertising partners (Google AdSense) may collect non-personal data for ad delivery",
                  "Service providers (hosting, analytics) under strict confidentiality agreements",
                  "Legal compliance when required by law or to protect rights",
                  "Business transfers (mergers, acquisitions) with continued privacy protection",
                  "Your explicit consent for any other sharing purposes"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 group hover:translate-x-2 transition-transform">
                    <CheckCircle className="w-5 h-5 text-[#00ADB5] flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </PolicySection>

            <PolicySection icon={Bell} title="8. Updates to This Policy" index={7}>
              <p className="mb-4">
                We may update this Privacy Policy periodically to reflect changes in our practices or legal requirements. When we make significant changes:
              </p>
              <ul className="space-y-3">
                {[
                  "We'll notify you via email at your registered address",
                  "Display a prominent notice on our platform",
                  "Update the 'Effective Date' at the top of this policy",
                  "Give you time to review changes before they take effect"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 group hover:translate-x-2 transition-transform">
                    <CheckCircle className="w-5 h-5 text-[#00ADB5] flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm">
                Continued use of SkillUpX after policy updates constitutes acceptance of the new terms.
              </p>
            </PolicySection>

            <PolicySection icon={Mail} title="9. Contact Us" index={8}>
              <p className="mb-6">
                Have questions, concerns, or requests about your privacy? We're here to help.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 bg-gradient-to-br from-[#00ADB5]/10 to-cyan-500/10 dark:from-[#00ADB5]/20 dark:to-cyan-500/20 rounded-xl border-2 border-[#00ADB5]/30">
                  <Mail className="w-8 h-8 text-[#00ADB5] mb-4" />
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">Email Us</h4>
                  <a href="mailto:privacy@skillupx.com" className="text-[#00ADB5] hover:underline font-semibold">
                    privacy@skillupx.com
                  </a>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    We respond within 48 hours
                  </p>
                </div>

                <div className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 rounded-xl border-2 border-purple-500/30">
                  <Shield className="w-8 h-8 text-purple-500 mb-4" />
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">Data Protection Officer</h4>
                  <a href="mailto:dpo@skillupx.com" className="text-purple-500 hover:underline font-semibold">
                    dpo@skillupx.com
                  </a>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    For formal privacy requests
                  </p>
                </div>
              </div>
            </PolicySection>
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 p-8 bg-gradient-to-r from-slate-900 to-gray-900 rounded-2xl text-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00ADB5]/20 border border-[#00ADB5]/30">
                <Sparkles className="w-4 h-4 text-[#00ADB5]" />
                <span className="text-sm font-bold text-[#00ADB5]">READY TO START?</span>
              </div>

              <h3 className="text-3xl font-black text-white">
                Your Privacy is Protected with SkillUpX
              </h3>

              <p className="text-gray-300 max-w-2xl mx-auto">
                Join thousands of developers learning in a safe, secure environment
              </p>

              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#00ADB5] to-cyan-600 rounded-xl font-bold text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
              >
                Get Started Now
                <ChevronRight className="w-5 h-5" />
              </Link>

              <p className="text-sm text-gray-400">
                By signing up, you agree to our{" "}
                <Link to="/terms" className="text-[#00ADB5] hover:underline">Terms of Service</Link>
                {" "}and this Privacy Policy
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;
