import { Bold, Clock, FileText, Italic, Lightbulb, Link2, List, ListOrdered, Send, Tag } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useDataContext } from '../../Context/UserDataContext';
import { apiRequest } from '../../service/api';

export default function IdeaSubmission() {
  // Get actual auth and data context
  const { user } = useAuth();
  const { submitIdea, triggerIdeasRefresh } = useDataContext();
  const navigate = useNavigate();
  const location = useLocation();

  const ideaToEdit = (location && (location as any).state && (location as any).state.ideaToEdit) ? (location as any).state.ideaToEdit : null;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    expectedTimeline: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const categories = [
    'Web Development',
    'Mobile App',
    'AI/ML',
    'Data Science',
    'Game Development',
    'IoT',
    'Blockchain',
    'Other'
  ];

  useEffect(() => {
    // Initialize editor content
    if (editorRef.current && formData.description) {
      editorRef.current.innerHTML = formData.description;
    }

    // If navigated here to edit an idea, prefill form
    if (ideaToEdit) {
      setFormData({
        title: ideaToEdit.title || '',
        description: ideaToEdit.description || '',
        category: ideaToEdit.category || '',
        expectedTimeline: ideaToEdit.expectedTimeline || ''
      });
      if (editorRef.current) editorRef.current.innerHTML = ideaToEdit.description || '';
    }
  }, []);

  const handleEditorInput = () => {
    if (editorRef.current) {
      setFormData({ ...formData, description: editorRef.current.innerHTML });
    }
  };

  const execCommand = (command: string, value: string | null = null) => {
    document.execCommand(command, false, value || undefined);
    editorRef.current?.focus();
    handleEditorInput();
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Please login to submit an idea');
      return;
    }

    setSubmitting(true);
    try {
      if (ideaToEdit && ideaToEdit.id) {
        // Update existing idea via backend API
        await apiRequest(`/ideas/${ideaToEdit.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            category: formData.category,
            expectedTimeline: formData.expectedTimeline,
            editedAt: new Date().toISOString()
          })
        });
        alert('✅ Idea updated successfully');
        try { triggerIdeasRefresh && triggerIdeasRefresh(); } catch (err) { /* noop */ }
        navigate('/dashboard/projects');
        return;
      }

      // Submit new idea to Firebase
      await submitIdea(formData);
      try { triggerIdeasRefresh && triggerIdeasRefresh(); } catch (err) { /* noop */ }

      setSubmitted(true);
      setFormData({ title: '', description: '', category: '', expectedTimeline: '' });
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
    } catch (error) {
      console.error('Error submitting idea:', error);
      alert('Failed to submit idea. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-3 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="flex items-start sm:items-center gap-2 sm:gap-3 mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white">Submit Your Idea</h1>
              <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400">Share your project idea and get it approved</p>
            </div>
          </div>
        </div>

        {submitted && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 rounded-lg">
            <div className="flex items-start sm:items-center gap-2">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-green-900 dark:text-green-400">Idea Submitted Successfully!</h3>
                <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">Your idea is pending admin review. You'll receive an email notification once it's reviewed.</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8">
          <div className="space-y-4 sm:space-y-6">
            {/* Title */}
            <div>
              <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                Project Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="E.g., E-Learning Platform for Students"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 dark:border-gray-600 rounded-lg sm:rounded-xl focus:border-cyan-500 focus:outline-none transition-colors bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>

            {/* Description with Rich Text Editor */}
            <div>
              <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                Description *
              </label>

              {/* Rich Text Toolbar */}
              <div className="flex items-center gap-0.5 sm:gap-1 p-1.5 sm:p-2 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-600 rounded-t-lg sm:rounded-t-xl border-b-0 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => execCommand('bold')}
                  className="p-1.5 sm:p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-gray-700 dark:text-gray-300 flex-shrink-0"
                  title="Bold"
                >
                  <Bold className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execCommand('italic')}
                  className="p-1.5 sm:p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-gray-700 dark:text-gray-300 flex-shrink-0"
                  title="Italic"
                >
                  <Italic className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execCommand('underline')}
                  className="p-1.5 sm:p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-gray-700 dark:text-gray-300 flex-shrink-0"
                  title="Underline"
                >
                  <span className="text-xs sm:text-sm font-bold underline">U</span>
                </button>
                <div className="w-px h-4 sm:h-6 bg-gray-300 dark:bg-gray-600 mx-0.5 sm:mx-1" />
                <button
                  type="button"
                  onClick={() => execCommand('insertUnorderedList')}
                  className="p-1.5 sm:p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-gray-700 dark:text-gray-300 flex-shrink-0"
                  title="Bullet List"
                >
                  <List className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execCommand('insertOrderedList')}
                  className="p-1.5 sm:p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-gray-700 dark:text-gray-300 flex-shrink-0"
                  title="Numbered List"
                >
                  <ListOrdered className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
                <div className="w-px h-4 sm:h-6 bg-gray-300 dark:bg-gray-600 mx-0.5 sm:mx-1" />
                <button
                  type="button"
                  onClick={insertLink}
                  className="p-1.5 sm:p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-gray-700 dark:text-gray-300 flex-shrink-0"
                  title="Insert Link"
                >
                  <Link2 className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
                <select
                  onChange={(e) => execCommand('formatBlock', e.target.value)}
                  className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 border border-gray-300 dark:border-gray-600 rounded text-xs sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  defaultValue="p"
                >
                  <option value="p">Paragraph</option>
                  <option value="h1">Heading 1</option>
                  <option value="h2">Heading 2</option>
                  <option value="h3">Heading 3</option>
                </select>
              </div>

              {/* Rich Text Editor Area */}
              <div
                ref={editorRef}
                contentEditable
                onInput={handleEditorInput}
                className="w-full min-h-[150px] sm:min-h-[200px] px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 dark:border-gray-600 rounded-b-lg sm:rounded-b-xl focus:border-cyan-500 focus:outline-none transition-colors overflow-auto bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                data-placeholder="Describe your project idea, its goals, target audience, and key features..."
              />
              <style>{`
                [contenteditable]:empty:before {
                  content: attr(data-placeholder);
                  color: #9ca3af;
                  pointer-events: none;
                }
                [contenteditable] h1 {
                  font-size: 2em;
                  font-weight: bold;
                  margin: 0.67em 0;
                }
                [contenteditable] h2 {
                  font-size: 1.5em;
                  font-weight: bold;
                  margin: 0.75em 0;
                }
                [contenteditable] h3 {
                  font-size: 1.17em;
                  font-weight: bold;
                  margin: 0.83em 0;
                }
                [contenteditable] ul, [contenteditable] ol {
                  margin: 1em 0;
                  padding-left: 2em;
                }
                [contenteditable] a {
                  color: #06b6d4;
                  text-decoration: underline;
                }
              `}</style>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Minimum 100 characters</p>
            </div>

            {/* Category */}
            <div>
              <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                <Tag className="w-3 h-3 sm:w-4 sm:h-4" />
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 dark:border-gray-600 rounded-lg sm:rounded-xl focus:border-cyan-500 focus:outline-none transition-colors bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Timeline */}
            <div>
              <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                Expected Timeline *
              </label>
              <input
                type="text"
                required
                value={formData.expectedTimeline}
                onChange={(e) => setFormData({ ...formData, expectedTimeline: e.target.value })}
                placeholder="E.g., 3 months, 6 weeks, etc."
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 dark:border-gray-600 rounded-lg sm:rounded-xl focus:border-cyan-500 focus:outline-none transition-colors bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3 sm:py-4 text-sm sm:text-base bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold rounded-lg sm:rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              {submitting ? 'Submitting...' : 'Submit Idea for Review'}
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-4 sm:mt-6 p-4 sm:p-6 bg-blue-50 dark:bg-blue-900/30 rounded-lg sm:rounded-xl border border-blue-200 dark:border-blue-700">
          <h3 className="text-sm sm:text-base font-bold text-blue-900 dark:text-blue-300 mb-2">What happens next?</h3>
          <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-blue-800 dark:text-blue-400">
            <li className="flex items-start gap-1.5 sm:gap-2">
              <span className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0">1.</span>
              <span>Your idea will be reviewed by our admin team within 2-3 business days</span>
            </li>
            <li className="flex items-start gap-1.5 sm:gap-2">
              <span className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0">2.</span>
              <span>You'll receive an email notification about the approval status</span>
            </li>
            <li className="flex items-start gap-1.5 sm:gap-2">
              <span className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0">3.</span>
              <span>If approved, you'll become a Creator and can start your project!</span>
            </li>
            <li className="flex items-start gap-1.5 sm:gap-2">
              <span className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0">4.</span>
              <span>You can manage tasks, team members, and track progress</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
