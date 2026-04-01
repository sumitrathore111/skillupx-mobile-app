import { motion } from 'framer-motion';
import { ExternalLink, Eye, Github, ShoppingCart, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MarketplaceProject } from '../../../types/marketplace';

interface ProjectCardProps {
  project: MarketplaceProject;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const formatPrice = (price: number) => {
    return price === 0 ? 'FREE' : `$${price}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all"
    >
      <Link to={`/dashboard/marketplace/project/${project.id}`}>
        {/* Image */}
        <div className="relative h-48 overflow-hidden" style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}>
          {project.images && project.images.length > 0 ? (
            <img
              src={project.images[0]}
              alt={project.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-6xl font-bold">
              {project.title.charAt(0)}
            </div>
          )}
          
          {/* Price Badge */}
          <div className="absolute top-3 right-3">
            <span className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-lg ${
              project.isFree
                ? 'bg-green-500 text-white'
                : 'bg-white dark:bg-gray-800'
            }`} style={!project.isFree ? { color: '#00ADB5' } : {}}>
              {formatPrice(project.price)}
            </span>
          </div>

          {/* Rating Badge */}
          {project.rating > 0 && (
            <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-white text-sm font-semibold">{project.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 transition-colors" style={{ '--hover-color': '#00ADB5' } as React.CSSProperties}
          >
            {project.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-white mb-3 line-clamp-2">
            {project.description}
          </p>

          {/* Tech Stack */}
          <div className="flex flex-wrap gap-2 mb-4">
            {project.techStack.slice(0, 3).map((tech, index) => (
              <span
                key={index}
                className="px-2 py-1 rounded text-xs font-medium"
                style={{ backgroundColor: 'rgba(0, 173, 181, 0.15)', color: '#00ADB5' }}
              >
                {tech}
              </span>
            ))}
            {project.techStack.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white rounded text-xs font-medium">
                +{project.techStack.length - 3}
              </span>
            )}
          </div>

          {/* Seller Info */}
          <div className="flex items-center gap-2 mb-4">
            <img
              src={project.sellerAvatar || 'https://via.placeholder.com/40'}
              alt={project.sellerName}
              className="w-8 h-8 rounded-full border-2"
              style={{ borderColor: '#00ADB5' }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {project.sellerName}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-3">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{project.views || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <ShoppingCart className="w-4 h-4" />
              <span>{project.purchases || 0}</span>
            </div>
            {project.reviewCount > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4" />
                <span>{project.reviewCount}</span>
              </div>
            )}
          </div>

          {/* Links Preview */}
          {(project.links.github || project.links.liveDemo) && (
            <div className="flex gap-3 mt-3">
              {project.links.github && (
                <div className="flex items-center gap-1 text-gray-600 dark:text-white">
                  <Github className="w-4 h-4" />
                  <span className="text-xs">Code</span>
                </div>
              )}
              {project.links.liveDemo && (
                <div className="flex items-center gap-1 text-gray-600 dark:text-white">
                  <ExternalLink className="w-4 h-4" />
                  <span className="text-xs">Demo</span>
                </div>
              )}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}


