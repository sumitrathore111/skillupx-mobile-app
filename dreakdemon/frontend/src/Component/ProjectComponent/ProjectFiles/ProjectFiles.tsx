import {
  Clock,
  Download,
  Eye,
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileText,
  FileVideo,
  FolderOpen,
  Grid,
  Link2,
  List,
  Search,
  Trash2,
  Upload
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { API_URL } from '../../../service/apiConfig';
import {
  getSocket,
  initializeSocket,
  joinProjectRoom,
  leaveProjectRoom
} from '../../../service/socketService';

interface ProjectFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string | Date;
}

interface ProjectFilesProps {
  projectId: string;
}

export function ProjectFiles({
  projectId
}: ProjectFilesProps) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({ name: '', url: '', type: 'document' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const getToken = () => localStorage.getItem('authToken');

  // Fetch files
  const fetchFiles = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      const token = getToken();
      const response = await fetch(`${API_URL}/projects/${projectId}/files`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch files');
      }
    } catch (err) {
      console.error('Error fetching files:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Initialize socket and fetch files
  useEffect(() => {
    if (!projectId) return;

    // Initialize socket connection
    initializeSocket();
    joinProjectRoom(projectId);

    // Fetch initial files
    fetchFiles();

    // Listen for file events
    const socket = getSocket();
    if (socket) {
      socket.on('file-uploaded', (data: ProjectFile) => {
        console.log('📁 New file uploaded:', data);
        setFiles(prev => {
          if (prev.some(f => f.id === data.id)) return prev;
          return [...prev, data];
        });
      });

      socket.on('file-deleted', (data: { fileId: string }) => {
        console.log('🗑️ File deleted:', data.fileId);
        setFiles(prev => prev.filter(f => f.id !== data.fileId));
      });
    }

    // Cleanup
    return () => {
      leaveProjectRoom(projectId);
      if (socket) {
        socket.off('file-uploaded');
        socket.off('file-deleted');
      }
    };
  }, [projectId, fetchFiles]);

  // Upload file
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.name || !uploadForm.url) return;

    try {
      setUploading(true);
      const token = getToken();

      const response = await fetch(`${API_URL}/projects/${projectId}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: uploadForm.name,
          url: uploadForm.url,
          type: uploadForm.type,
          size: 0
        })
      });

      if (response.ok) {
        const data = await response.json();
        setFiles(prev => [...prev, data.file]);
        setShowUploadModal(false);
        setUploadForm({ name: '', url: '', type: 'document' });
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to upload file');
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  // Delete file
  const handleDelete = async (fileId: string) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/projects/${projectId}/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setFiles(prev => prev.filter(f => f.id !== fileId));
        setDeleteConfirm(null);
        setSelectedFile(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete file');
      }
    } catch (err) {
      console.error('Error deleting file:', err);
      setError('Failed to delete file');
    }
  };

  // Get file icon based on type
  const getFileIcon = (type: string, size = 'w-8 h-8') => {
    const iconClass = `${size} text-gray-500`;
    switch (type.toLowerCase()) {
      case 'image':
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return <FileImage className={`${size} text-purple-500`} />;
      case 'video':
      case 'mp4':
      case 'mov':
      case 'avi':
        return <FileVideo className={`${size} text-red-500`} />;
      case 'audio':
      case 'mp3':
      case 'wav':
        return <FileAudio className={`${size} text-orange-500`} />;
      case 'code':
      case 'js':
      case 'ts':
      case 'py':
      case 'java':
      case 'html':
      case 'css':
        return <FileCode className={`${size} text-green-500`} />;
      case 'archive':
      case 'zip':
      case 'rar':
      case 'tar':
        return <FileArchive className={`${size} text-yellow-500`} />;
      case 'document':
      case 'pdf':
      case 'doc':
      case 'docx':
      case 'txt':
        return <FileText className={`${size} text-blue-500`} />;
      default:
        return <File className={iconClass} />;
    }
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return 'Unknown size';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  // Format date
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Filter files
  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // File type options
  const fileTypes = [
    { value: 'document', label: 'Document' },
    { value: 'image', label: 'Image' },
    { value: 'video', label: 'Video' },
    { value: 'audio', label: 'Audio' },
    { value: 'code', label: 'Code' },
    { value: 'archive', label: 'Archive' },
    { value: 'other', label: 'Other' }
  ];

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg h-[calc(100vh-280px)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg h-[calc(100vh-280px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <FolderOpen className="w-5 h-5 text-teal-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Project Files</h3>
          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-900 rounded-full text-sm text-gray-600 dark:text-gray-400">
            {files.length} files
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="pl-9 pr-4 py-1.5 bg-gray-100 dark:bg-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-48"
            />
          </div>
          {/* View toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-900 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''
              }`}
            >
              <Grid className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''
              }`}
            >
              <List className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
          {/* Upload button */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 text-sm"
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-4 mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Files content */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredFiles.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                {searchQuery ? 'No files found' : 'No files yet'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchQuery ? 'Try a different search term' : 'Upload files to share with your team'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
                >
                  Upload First File
                </button>
              )}
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                onClick={() => setSelectedFile(file)}
                className="group relative bg-gray-50 dark:bg-gray-900 rounded-lg p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex flex-col items-center text-center">
                  {getFileIcon(file.type, 'w-12 h-12')}
                  <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white truncate w-full">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{formatSize(file.size)}</p>
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(file.id);
                    }}
                    className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                onClick={() => setSelectedFile(file)}
                className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {getFileIcon(file.type, 'w-10 h-10')}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(file.uploadedAt)}
                    </span>
                    <span>{formatSize(file.size)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
                  >
                    <Download className="w-4 h-4 text-gray-500" />
                  </a>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(file.id);
                    }}
                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowUploadModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add File</h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  File Name
                </label>
                <input
                  type="text"
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Project Proposal.pdf"
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  File URL
                </label>
                <input
                  type="url"
                  value={uploadForm.url}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://drive.google.com/file/..."
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Link to Google Drive, Dropbox, GitHub, or any other file hosting service
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  File Type
                </label>
                <select
                  value={uploadForm.type}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {fileTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadForm.name || !uploadForm.url}
                  className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Adding...' : 'Add File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Detail Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedFile(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              {getFileIcon(selectedFile.type, 'w-16 h-16')}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedFile.name}</h3>
                <div className="mt-2 space-y-1 text-sm text-gray-500">
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Uploaded {formatDate(selectedFile.uploadedAt)}
                  </p>
                  <p className="flex items-center gap-2">
                    <File className="w-4 h-4" />
                    {formatSize(selectedFile.size)} • {selectedFile.type}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <a
                href={selectedFile.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
              >
                <Eye className="w-4 h-4" />
                Open
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedFile.url);
                  alert('Link copied!');
                }}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <Link2 className="w-4 h-4" />
                Copy Link
              </button>
              <button
                onClick={() => setDeleteConfirm(selectedFile.id)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete File?</h3>
              <p className="text-gray-500 mb-6">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectFiles;
