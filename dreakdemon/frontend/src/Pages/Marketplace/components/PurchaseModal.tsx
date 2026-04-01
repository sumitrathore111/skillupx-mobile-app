import { AnimatePresence, motion } from 'framer-motion';
import { Check, ShoppingCart, X } from 'lucide-react';
import type { MarketplaceProject } from '../../../types/marketplace';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: MarketplaceProject;
  onConfirm: () => void;
  isPurchasing: boolean;
}

export default function PurchaseModal({
  isOpen,
  onClose,
  project,
  onConfirm,
  isPurchasing,
}: PurchaseModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-50 w-full max-w-md p-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                Confirm Purchase
              </h3>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-white dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Project Info */}
            <div className="mb-6">
              <div className="flex gap-4">
                {project.images && project.images.length > 0 ? (
                  <img
                    src={project.images[0]}
                    alt={project.title}
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg flex items-center justify-center text-white text-3xl font-bold" style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}>
                    {project.title.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {project.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-white mb-2">
                    by {project.sellerName}
                  </p>
                  <div className="flex items-center gap-2">
                    {project.techStack.slice(0, 2).map((tech, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white rounded text-xs"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* What You'll Get */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                What you'll get:
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-white">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>Full source code access</span>
                </div>
                {project.links.github && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-white">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>GitHub repository</span>
                  </div>
                )}
                {project.links.liveDemo && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-white">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Live demo access</span>
                  </div>
                )}
                {project.links.documentation && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-white">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Documentation</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-white">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>{project.licenseType} license</span>
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-white">Total Price:</span>
                <span className="text-3xl font-bold" style={{ color: '#00ADB5' }}>
                  {project.isFree ? 'FREE' : `$${project.price}`}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                disabled={isPurchasing}
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isPurchasing}
                className="flex-1 px-4 py-3 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}
              >
                {isPurchasing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    <span>{project.isFree ? 'Get Free' : 'Purchase Now'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Note */}
            <p className="text-xs text-gray-500 dark:text-white text-center mt-4">
              By purchasing, you agree to our Terms of Service
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


