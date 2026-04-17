import { CheckCircle, ExternalLink } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import type { FeatureData, ServiceData, TestimonialData } from '../../data/homePageData';
import { useRevealAnimation } from '../hooks/useRevealAnimation';

// Service Card Component
interface ServiceCardProps {
  service: ServiceData;
  index: number;
}

export const ServiceCard = memo(({ service, index }: ServiceCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const { ref, isVisible } = useRevealAnimation(index * 100);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  return (
    <article
      ref={ref}
      className={`group relative bg-white dark:bg-gray-800 rounded-3xl shadow-lg overflow-hidden transition-all duration-700 transform
        hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02] ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      {/* Image Container */}
      <div className="relative h-64 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
        <img
          src={service.image}
          alt={service.title}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleImageLoad}
        />

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Icon Badge */}
        <div className="absolute bottom-4 left-4 w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <service.icon className="w-7 h-7 text-white" />
        </div>

        {/* Stats Badge */}
        {service.stats && (
          <div className="absolute top-4 right-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl px-3 py-2 transform group-hover:scale-105 transition-all duration-300">
            <div className="text-lg font-black text-gray-900 dark:text-white">{service.stats.number}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">{service.stats.label}</div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        <h3 className="font-bold text-xl text-gray-900 dark:text-white leading-tight group-hover:text-[#00ADB5] transition-colors duration-300">
          {service.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
          {service.description}
        </p>

        {/* Learn More Link */}
        <div className="flex items-center text-[#00ADB5] font-semibold text-sm group-hover:translate-x-1 transition-transform duration-300">
          <span>Learn More</span>
          <ExternalLink className="w-4 h-4 ml-2" />
        </div>
      </div>
    </article>
  );
});

ServiceCard.displayName = 'ServiceCard';

// Feature Card Component
interface FeatureCardProps {
  feature: FeatureData;
  index: number;
}

export const FeatureCard = memo(({ feature, index }: FeatureCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const { ref, isVisible } = useRevealAnimation(index * 150);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  return (
    <article
      ref={ref}
      className={`group relative rounded-3xl overflow-hidden shadow-lg transition-all duration-700 transform hover:shadow-2xl hover:scale-[1.02] ${
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      <div className="relative h-80">
        {/* Background Image */}
        <img
          src={feature.image}
          alt={feature.title}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleImageLoad}
        />

        {/* Dynamic Gradient Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t ${feature.color} opacity-90`} />

        {/* Content Overlay */}
        <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
          <div className="space-y-4">
            {/* Icon */}
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <feature.icon className="w-6 h-6" />
            </div>

            {/* Title & Description */}
            <div>
              <h3 className="font-bold text-xl mb-2 group-hover:scale-105 transition-transform duration-300 origin-left">
                {feature.title}
              </h3>
              <p className="text-white/90 text-sm mb-4 leading-relaxed">
                {feature.description}
              </p>
            </div>

            {/* Benefits List */}
            <div className="space-y-2 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
              {feature.benefits.slice(0, 2).map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <CheckCircle className="w-3 h-3 text-white/80" />
                  <span className="text-white/80">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
});

FeatureCard.displayName = 'FeatureCard';

// Testimonial Card Component
interface TestimonialCardProps {
  testimonial: TestimonialData;
  index: number;
}

export const TestimonialCard = memo(({ testimonial, index }: TestimonialCardProps) => {
  const { ref, isVisible } = useRevealAnimation(index * 200);

  return (
    <article
      ref={ref}
      className={`group relative bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl transition-all duration-700 transform hover:shadow-2xl hover:-translate-y-1 overflow-hidden ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
      style={{ transitionDelay: `${index * 200}ms` }}
    >
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#00ADB5]/10 to-transparent rounded-bl-full" />
      <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-gradient-to-tr from-[#00ADB5]/5 to-transparent rounded-tr-full" />

      {/* Quote Icon */}
      <div className="text-6xl text-[#00ADB5]/20 font-serif mb-4 relative z-10">"</div>

      {/* Quote Content */}
      <blockquote className="text-gray-700 dark:text-gray-300 text-lg mb-6 relative z-10 leading-relaxed italic">
        {testimonial.quote}
      </blockquote>

      {/* Author Info */}
      <footer className="flex items-center gap-4 relative z-10">
        <div className="relative flex-shrink-0">
          {/* <div className="relative w-16 h-16 rounded-full overflow-hidden border-4 border-[#00ADB5]/30 shadow-lg">
            <img
              src={testimonial.image}
              alt={testimonial.name}
              className={`w-full h-full object-cover transition-opacity duration-500 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={handleImageLoad}
            />
          </div> */}

          {/* Verified Badge */}
          {/* {testimonial.verified && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
              <CheckCircle className="w-3 h-3 text-white" />
            </div>
          )} */}
        </div>

        <div className="flex-1">
          <h4 className="font-bold text-lg text-gray-900 dark:text-white">{testimonial.name}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">{testimonial.role} at {testimonial.company}</p>

          {/* Rating Stars */}
          <div className="flex items-center gap-1 mt-1">
            {Array.from({ length: testimonial.rating }, (_, i) => (
              <span key={i} className="text-yellow-400 text-sm">★</span>
            ))}
          </div>
        </div>
      </footer>

      {/* Hover Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#00ADB5]/0 to-[#00ADB5]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </article>
  );
});

TestimonialCard.displayName = 'TestimonialCard';
