import { motion } from 'framer-motion';
import { ArrowLeft, Image as ImageIcon, Plus, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useDataContext } from '../../Context/UserDataContext';
import { API_BASE_URL } from '../../service/api';
import { createListing, getListingById, updateListing } from '../../service/marketplaceServiceNew';
import type { CreateProjectData, LicenseType, ProjectCategory } from '../../types/marketplace';
import { CATEGORY_LABELS, LICENSE_LABELS, TECH_STACK_OPTIONS } from '../../types/marketplace';

export default function CreateListing() {
  const { user } = useAuth();
  const { userprofile, avatrUrl } = useDataContext();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const isEditMode = !!projectId;

  const [formData, setFormData] = useState<CreateProjectData>({
    title: '',
    description: '',
    category: 'web-app',
    techStack: [],
    price: 0,
    isFree: true,
    images: [],
    links: {
      github: '',
      liveDemo: '',
      documentation: '',
      video: '',
      demoVideo: '',
      explanationVideo: '',
    },
    licenseType: 'personal',
    status: 'published',
  });

  const [techInput, setTechInput] = useState('');
  const [imageInput, setImageInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing project data when in edit mode
  useEffect(() => {
    const loadProject = async () => {
      if (!isEditMode || !projectId) return;

      setIsLoading(true);
      try {
        const project = await getListingById(projectId);
        if (project) {
          // Check if user owns this project
          if (project.sellerId !== user?.id) {
            toast.error('You can only edit your own projects');
            navigate('/dashboard/marketplace/my-listings');
            return;
          }

          setFormData({
            title: project.title,
            description: project.description,
            category: project.category,
            techStack: project.techStack,
            price: project.price,
            isFree: project.isFree,
            images: project.images,
            links: project.links,
            licenseType: project.licenseType,
            status: project.status,
          });
        } else {
          toast.error('Project not found');
          navigate('/dashboard/marketplace/my-listings');
        }
      } catch (error) {
        console.error('Error loading project:', error);
        toast.error('Failed to load project');
        navigate('/dashboard/marketplace/my-listings');
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, [projectId, isEditMode, user, navigate]);

  const handleAddTech = (tech: string) => {
    if (tech && !formData.techStack.includes(tech)) {
      setFormData({
        ...formData,
        techStack: [...formData.techStack, tech],
      });
      setTechInput('');
    }
  };

  const handleRemoveTech = (tech: string) => {
    setFormData({
      ...formData,
      techStack: formData.techStack.filter((t) => t !== tech),
    });
  };

  const handleAddImage = () => {
    if (imageInput && !formData.images.includes(imageInput)) {
      // Validate URL format
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(imageInput)) {
        toast.error('Please enter a valid image URL (must start with http:// or https://)');
        return;
      }
      setFormData({
        ...formData,
        images: [...formData.images, imageInput],
      });
      setImageInput('');
      toast.success('Image URL added!');
    }
  };

  const handleRemoveImage = (image: string) => {
    setFormData({
      ...formData,
      images: formData.images.filter((img) => img !== image),
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check remaining slots
    const remainingSlots = 5 - formData.images.length;
    if (files.length > remainingSlots) {
      toast.error(`You can only add ${remainingSlots} more image(s). Maximum is 5 images.`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadedUrls: string[] = [];
      const totalFiles = files.length;

      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          toast.error(`${file.name}: Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.`);
          continue;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name}: File too large. Maximum size is 5MB.`);
          continue;
        }

        const formDataUpload = new FormData();
        formDataUpload.append('image', file);

        const response = await fetch(`${API_BASE_URL}/upload/image`, {
          method: 'POST',
          body: formDataUpload,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }

        const result = await response.json();
        uploadedUrls.push(result.imageUrl);

        // Update progress
        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
      }

      if (uploadedUrls.length > 0) {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...uploadedUrls],
        }));
        toast.success(`${uploadedUrls.length} image(s) uploaded successfully!`);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !userprofile?.name) {
      toast.error('You must be logged in');
      return;
    }

    if (!formData.title || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.techStack.length === 0) {
      toast.error('Please add at least one technology');
      return;
    }

    if (!formData.links.github || !formData.links.github.trim()) {
      toast.error('GitHub repository link is required');
      return;
    }

    if (!formData.links.liveDemo || !formData.links.liveDemo.trim()) {
      toast.error('Live Demo link is required');
      return;
    }

    // Validate required video links
    if (!formData.links.demoVideo || !formData.links.demoVideo.trim()) {
      toast.error('Demo Video link is required');
      return;
    }

    if (!formData.links.explanationVideo || !formData.links.explanationVideo.trim()) {
      toast.error('Explanation Video link is required');
      return;
    }

    // Validate URL format
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(formData.links.github)) {
      toast.error('Please enter a valid GitHub URL (must start with http:// or https://)');
      return;
    }
    if (!urlPattern.test(formData.links.liveDemo)) {
      toast.error('Please enter a valid Live Demo URL (must start with http:// or https://)');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode && projectId) {
        // Update existing project
        await updateListing(projectId, formData);
        toast.success('Project updated successfully!');
        navigate(`/dashboard/marketplace/project/${projectId}`);
      } else {
        // Create new project
        const listingData = {
          ...formData,
          sellerId: user.id,
          sellerName: userprofile.name,
          sellerAvatar: avatrUrl || ''
        };
        await createListing(listingData);
        toast.success('Project submitted for verification! It will be visible after admin approval.', {
          duration: 5000,
          icon: '🔍'
        });
        navigate('/dashboard/marketplace/my-listings');
      }
    } catch (error: any) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} project:`, error);

      // Provide specific error messages
      if (error?.message) {
        toast.error(`Failed to ${isEditMode ? 'update' : 'create'} listing: ${error.message}`);
      } else {
        toast.error(`Failed to ${isEditMode ? 'update' : 'create'} listing. Check browser console for details.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: '#00ADB5', borderTopColor: 'transparent' }} />
          <p className="text-gray-600 dark:text-white font-medium">Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(isEditMode ? '/dashboard/marketplace/my-listings' : '/dashboard/marketplace')}
          className="mb-6 flex items-center gap-2 text-gray-600 dark:text-white transition-colors font-medium"
          style={{ '--hover-color': '#00ADB5' } as React.CSSProperties}
          onMouseEnter={(e) => e.currentTarget.style.color = '#00ADB5'}
          onMouseLeave={(e) => e.currentTarget.style.color = ''}
        >
          <ArrowLeft className="w-5 h-5" />
          {isEditMode ? 'Back to My Listings' : 'Back to Marketplace'}
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm"
        >
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#00ADB5' }}>
            {isEditMode ? 'Edit Your Project' : 'List Your Project'}
          </h1>
          <p className="text-gray-600 dark:text-white mb-8">
            {isEditMode ? 'Update your project details' : 'Share your amazing project with the community'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Project Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00ADB5] focus:bg-white dark:focus:bg-gray-800 transition-all"
                placeholder="e.g., E-commerce Platform with React & Node.js"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00ADB5] focus:bg-white dark:focus:bg-gray-800 transition-all"
                placeholder="Describe your project, its features, and what makes it special..."
                required
              />
            </div>

            {/* Category & License */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as ProjectCategory })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00ADB5]"
                >
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  License Type *
                </label>
                <select
                  value={formData.licenseType}
                  onChange={(e) => setFormData({ ...formData, licenseType: e.target.value as LicenseType })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00ADB5]"
                >
                  {Object.entries(LICENSE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tech Stack */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Tech Stack *
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTech(techInput);
                    }
                  }}
                  list="tech-options"
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00ADB5] focus:bg-white dark:focus:bg-gray-800 transition-all"
                  placeholder="Type or select technology..."
                />
                <datalist id="tech-options">
                  {TECH_STACK_OPTIONS.map((tech) => (
                    <option key={tech} value={tech} />
                  ))}
                </datalist>
                <button
                  type="button"
                  onClick={() => handleAddTech(techInput)}
                  className="px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2 hover:opacity-90"
                  style={{ backgroundColor: '#00ADB5' }}
                >
                  <Plus className="w-5 h-5" />
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2"
                    style={{ backgroundColor: 'rgba(0, 173, 181, 0.15)', color: '#00ADB5' }}
                  >
                    {tech}
                    <button
                      type="button"
                      onClick={() => handleRemoveTech(tech)}
                      className="hover:text-purple-900 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Pricing
              </label>
              <div className="flex items-center gap-4 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.isFree}
                    onChange={() => setFormData({ ...formData, isFree: true, price: 0 })}
                    className="w-4 h-4 accent-[#00ADB5]"
                  />
                  <span className="text-gray-900 dark:text-white">Free</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!formData.isFree}
                    onChange={() => setFormData({ ...formData, isFree: false })}
                    className="w-4 h-4 accent-[#00ADB5]"
                  />
                  <span className="text-gray-900 dark:text-white">Paid</span>
                </label>
              </div>
              {!formData.isFree && (
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-white font-medium">$</span>
                  <input
                    type="number"
                    min="1"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00ADB5] focus:bg-white dark:focus:bg-gray-600 transition-all"
                    placeholder="0.00"
                  />
                </div>
              )}
            </div>

            {/* Images */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Project Images <span className="text-gray-500 text-xs">(max 5 images)</span>
              </label>

              {/* File Upload Section */}
              <div className="mb-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="image-upload"
                  disabled={isUploading || formData.images.length >= 5}
                />
                <label
                  htmlFor="image-upload"
                  className={`flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                    isUploading || formData.images.length >= 5
                      ? 'border-gray-400 bg-gray-200 dark:bg-gray-800 cursor-not-allowed opacity-60'
                      : 'border-[#00ADB5] bg-gradient-to-br from-[#00ADB5]/5 to-[#00ADB5]/10 hover:from-[#00ADB5]/10 hover:to-[#00ADB5]/20 dark:from-[#00ADB5]/10 dark:to-[#00ADB5]/20'
                  }`}
                >
                  {isUploading ? (
                    <>
                      <div className="w-12 h-12 border-4 border-[#00ADB5] border-t-transparent rounded-full animate-spin mb-3" />
                      <span className="text-sm font-medium text-[#00ADB5]">Uploading... {uploadProgress}%</span>
                      <div className="w-48 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-2 overflow-hidden">
                        <div
                          className="h-full bg-[#00ADB5] transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-3 bg-[#00ADB5]/20 rounded-full mb-3">
                        <Upload className="w-8 h-8 text-[#00ADB5]" />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 dark:text-white">
                        {formData.images.length >= 5 ? 'Maximum images reached' : 'Click to upload images'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formData.images.length >= 5
                          ? 'Remove some images to add more'
                          : 'JPEG, PNG, GIF, WebP up to 5MB each'
                        }
                      </span>
                      {formData.images.length < 5 && (
                        <span className="text-xs text-[#00ADB5] mt-2 font-medium">
                          {5 - formData.images.length} slot(s) remaining
                        </span>
                      )}
                    </>
                  )}
                </label>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">OR ADD BY URL</span>
                <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
              </div>

              {/* URL Input Section */}
              <div className="mb-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="url"
                      value={imageInput}
                      onChange={(e) => setImageInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddImage();
                        }
                      }}
                      disabled={formData.images.length >= 5}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00ADB5] focus:bg-white dark:focus:bg-gray-600 transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddImage}
                    disabled={formData.images.length >= 5 || !imageInput}
                    className="px-4 py-2.5 bg-[#00ADB5] text-white rounded-lg hover:opacity-90 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    Add URL
                  </button>
                </div>
              </div>

              {/* Image Preview Grid */}
              {formData.images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative group aspect-square">
                      <img
                        src={image}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg border-2 border-transparent group-hover:border-[#00ADB5] transition-all"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Image+Error';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(image)}
                          className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-xs rounded">
                        {index + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  GitHub Repository <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={formData.links.github}
                  onChange={(e) => setFormData({ ...formData, links: { ...formData.links, github: e.target.value } })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00ADB5]"
                  placeholder="https://github.com/..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Live Demo <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={formData.links.liveDemo}
                  onChange={(e) => setFormData({ ...formData, links: { ...formData.links, liveDemo: e.target.value } })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00ADB5]"
                  placeholder="https://demo.example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Documentation
                </label>
                <input
                  type="url"
                  value={formData.links.documentation}
                  onChange={(e) => setFormData({ ...formData, links: { ...formData.links, documentation: e.target.value } })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00ADB5]"
                  placeholder="https://docs.example.com"
                />
              </div>
            </div>

            {/* Required Video Links */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                📹 Required Videos
                <span className="text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded-full">Required</span>
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Upload two videos to help buyers understand your project better. Good videos can earn you coin rewards!
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    🎬 Demo Video <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Show your project in action - features, UI, functionality
                  </p>
                  <input
                    type="url"
                    value={formData.links.demoVideo}
                    onChange={(e) => setFormData({ ...formData, links: { ...formData.links, demoVideo: e.target.value } })}
                    className="w-full px-4 py-2 border border-purple-300 dark:border-purple-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="https://youtube.com/watch?v=..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    💡 Explanation Video <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Explain your idea - concept, use cases, why it's valuable
                  </p>
                  <input
                    type="url"
                    value={formData.links.explanationVideo}
                    onChange={(e) => setFormData({ ...formData, links: { ...formData.links, explanationVideo: e.target.value } })}
                    className="w-full px-4 py-2 border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://youtube.com/watch?v=..."
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-3 flex items-center gap-1">
                🪙 Earn coins when buyers rate your project above 3.5 stars or every 1000 views!
              </p>
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={() => navigate(isEditMode ? '/dashboard/marketplace/my-listings' : '/dashboard/marketplace')}
                className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{isEditMode ? 'Updating...' : 'Publishing...'}</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    <span>{isEditMode ? 'Update Project' : 'Publish Project'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}




