import { Clock, Mail, MapPin, Phone, Send } from "lucide-react";
import SEO from "../Component/SEO";

export function ContactUs() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <SEO
        title="Contact Us – Get in Touch with SkillUpX"
        description="Have questions about SkillUpX? Contact us via phone, email, or WhatsApp. We're here to help you with coding battles, projects, DSA practice, interview prep, and more."
        keywords="contact SkillUpX, support, help, email, phone, reach us, developer support, coding help, WhatsApp support, customer support India, office hours, get in touch, feedback, contact coding platform, SkillUpX phone number, SkillUpX email address, developer community support, technical support, coding platform contact, SkillUpX India office, join SkillUpX, report issue, partnership inquiry"
        canonicalUrl="/contact"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          "name": "Contact SkillUpX",
          "description": "Get in touch with SkillUpX for questions about coding battles, projects, and learning.",
          "url": "https://skillupx.online/contact"
        }}
      />
      {/* Hero Section */}
      <section
        className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-cover bg-center"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1600&q=80')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-transparent"></div>
        <div className="relative z-10 max-w-7xl mx-auto text-center text-white">
          <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight animate-fade-in">
            Let's Start a <span className="text-teal-400">Conversation</span>
          </h1>
          <p className="mt-6 text-xl max-w-3xl mx-auto leading-relaxed animate-slide-in">
            Have questions about SkillUpX? Want to learn more about how we can help you grow? Reach out and let's make something amazing together.
          </p>
          <a
            href="#contact"
            className="mt-8 inline-block px-8 py-4 bg-teal-500 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-teal-400 transition-transform transform hover:scale-105"
          >
            Contact Us Now
          </a>
        </div>
      </section>

      {/* Contact Methods Section */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white">
              Get In Touch
            </h2>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
              Choose the way that works best for you
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Phone */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-md hover:shadow-lg transition-transform transform hover:-translate-y-2 hover:rotate-1 border border-gray-200 dark:border-gray-800 animate-hover">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 flex items-center justify-center bg-teal-500 rounded-full">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <h3 className="ml-4 text-xl font-bold text-gray-900 dark:text-white">Call Us</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Speak directly with our team
              </p>
              <a
                href="tel:8756824350"
                className="text-teal-500 font-semibold hover:underline"
              >
                +91 8756824350
              </a>
            </div>

            {/* Email */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-md hover:shadow-lg transition-transform transform hover:-translate-y-2 hover:rotate-1 border border-gray-200 dark:border-gray-800 animate-hover">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 flex items-center justify-center bg-teal-500 rounded-full">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <h3 className="ml-4 text-xl font-bold text-gray-900 dark:text-white">Email Us</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Send us a detailed message
              </p>
              <a
                href="mailto:contact@SkillUpX.com"
                className="text-teal-500 font-semibold hover:underline"
              >
                contact@SkillUpX.com
              </a>
            </div>

            {/* Location */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-md hover:shadow-lg transition-transform transform hover:-translate-y-2 hover:rotate-1 border border-gray-200 dark:border-gray-800 animate-hover">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 flex items-center justify-center bg-teal-500 rounded-full">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <h3 className="ml-4 text-xl font-bold text-gray-900 dark:text-white">Visit Us</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Come say hello at our office
              </p>
              <p className="text-teal-500 font-semibold">India</p>
            </div>
          </div>
        </div>
      </section>

      {/* WhatsApp CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-teal-500 text-white relative">
        <div className="absolute inset-0 bg-wave-pattern opacity-10 animate-wave"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-3xl lg:text-4xl font-extrabold mb-4">
            Prefer WhatsApp?
          </h2>
          <p className="text-lg mb-8">
            Chat with us instantly on WhatsApp for quick responses
          </p>
          <a
            href="https://wa.me/918756824350"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-8 py-4 bg-white text-teal-500 font-bold text-lg rounded-lg shadow-lg hover:scale-105 transition-transform"
          >
            Start WhatsApp Chat
          </a>
        </div>
      </section>

      {/* Office Hours Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 animate-fade-in">
            <div className="flex items-center mb-6">
              <Clock className="w-8 h-8 text-teal-500" />
              <h2 className="ml-4 text-2xl font-bold text-gray-900 dark:text-white">
                Office Hours
              </h2>
            </div>
            <ul className="space-y-4 text-gray-600 dark:text-gray-400">
              <li className="flex justify-between">
                <span>Monday - Friday</span>
                <span>9:00 AM - 6:00 PM IST</span>
              </li>
              <li className="flex justify-between">
                <span>Saturday</span>
                <span>10:00 AM - 4:00 PM IST</span>
              </li>
              <li className="flex justify-between">
                <span>Sunday</span>
                <span className="text-teal-500">Closed</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-black">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Don't wait! Join SkillUpX today and start building your future
          </p>
          <a
            href="/commingsoon"
            className="inline-flex items-center px-8 py-4 bg-teal-500 text-white font-bold text-lg rounded-lg shadow-lg hover:shadow-2xl hover:animate-pulse"
          >
            <Send className="w-5 h-5 mr-2" />
            Join SkillUpX Now
          </a>
        </div>
      </section>
    </div>
  );
}
