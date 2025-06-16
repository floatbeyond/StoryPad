import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import CollaborationPanel from '../components/CollaborationPanel';
import CollaborativeEditor from '../components/CollaborativeEditor';
import PublishModal from '../components/PublishModal';
import BackButton from '../components/BackButton';
import CoverSelector from '../components/CoverSelector';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const DEFAULT_COVER = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/default-cover.png`;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Add debug log
console.log('🔍 WritePage Cloudinary config:', { CLOUD_NAME, DEFAULT_COVER });

const WritePage = () => {
  // Route and navigation
  const { id } = useParams(); // This will get the ID from both routes
  const location = useLocation();
  
  // Check if this is the new edit route or legacy write route
  const isEditRoute = location.pathname.includes('/edit');
  const storyId = id; // Same ID from both routes
  const navigate = useNavigate();

  // Story and chapter states
  const [story, setStory] = useState(null);
  const [chapters, setChapters] = useState([{ title: "", content: "" }]);
  const [activeChapter, setActiveChapter] = useState(0);
  const [coverImage, setCoverImage] = useState(DEFAULT_COVER);
  const [imageFile, setImageFile] = useState(null);

  // User and collaboration states
  const [currentUser, setCurrentUser] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isCollaborator, setIsCollaborator] = useState(false);
  const [showCollaboration, setShowCollaboration] = useState(false);

  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [chaptersToPublish, setChaptersToPublish] = useState([]);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'unsaved'

  // Permission error state
  const [permissionError, setPermissionError] = useState(false);
  const [showCoverSelector, setShowCoverSelector] = useState(false);

  // Initialize user and load story
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setCurrentUser({
        id: payload.id,
        username: localStorage.getItem('username') || 'Anonymous'
      });
    } catch (err) {
      console.error('Error parsing token:', err);
      navigate('/login');
      return;
    }

    const loadExistingStory = async () => {
      try {
        console.log('📖 Loading existing story for editing:', storyId);
        
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication required');
        }

        // Use the dedicated edit endpoint
        const response = await fetch(`${API_BASE_URL}/api/stories/${storyId}/edit`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 403) {
            console.log('❌ Permission denied for story editing');
            setPermissionError(true);
            return;
          } else if (response.status === 404) {
            console.log('❌ Story not found');
            navigate('/404'); // Or your 404 page
            return;
          }
          throw new Error(data.message || 'Failed to load story');
        }

        console.log('✅ Story loaded for editing:', data);

        if (data.success && data.story) {
          setStory(data.story);
          setCurrentUser(data.story.author);
          
          // Set permissions
          setIsOwner(data.permissions?.isOwner || false);
          
          // Set chapters
          if (data.story.chapters && data.story.chapters.length > 0) {
            const sortedChapters = data.story.chapters
              .sort((a, b) => (a.order || 0) - (b.order || 0))
              .map(chapter => ({
                title: chapter.title || '',
                content: chapter.content || '',
                published: chapter.published || false,
                _id: chapter._id
              }));
            setChapters(sortedChapters);
          } else {
            setChapters([{ title: '', content: '', published: false }]);
          }
          
          // Set cover image
          setCoverImage(data.story.cover || DEFAULT_COVER);
          
          console.log('📚 Editor initialized successfully');
        }
      } catch (error) {
        console.error('❌ Load story error:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (storyId && storyId !== 'new') {
      loadExistingStory(storyId);
    } else {
      setStory(null);
      setChapters([{ title: "", content: "" }]);
      setCoverImage(DEFAULT_COVER);
      setIsOwner(true);
      setLoading(false);
    }
  }, [storyId, navigate]);

  // Update the permission logic in WritePage.jsx:
  useEffect(() => {
    const checkPermissions = () => {
      if (story) {
        const userId = localStorage.getItem('userId') || 
                      JSON.parse(localStorage.getItem('user') || '{}').id;
        
        console.log('🔍 Checking permissions:', {
          userId,
          authorId: typeof story.author === 'object' ? story.author._id : story.author,
          collaborators: story.collaborators?.map(c => typeof c === 'object' ? c._id : c)
        });
        
        const authorId = typeof story.author === 'object' ? story.author._id : story.author;
        const isStoryOwner = authorId === userId;
        
        const isStoryCollaborator = story.collaborators?.some(collaborator => {
          const collabId = typeof collaborator === 'object' ? collaborator._id : collaborator;
          return collabId === userId;
        });
        
        setIsOwner(isStoryOwner);
        setIsCollaborator(isStoryCollaborator);
        
        console.log('✅ Permissions set:', { 
          isOwner: isStoryOwner, 
          isCollaborator: isStoryCollaborator 
        });
      }
    };

    checkPermissions();
  }, [story]);

  // Auto-save functionality
  useEffect(() => {
    if (saveStatus === 'unsaved' && storyId && storyId !== 'new') {
      console.log('🔄 Auto-save triggered, current coverImage:', coverImage);
      const autoSaveTimer = setTimeout(() => {
        handleSave(true); // silent save
      }, 5000);

      return () => clearTimeout(autoSaveTimer);
    }
  }, [saveStatus, chapters, storyId]);

  // Handle cover image upload
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE) {
      setError('Image size should be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    if (!storyId || storyId === 'new') {
      setError('Please save the story first before updating the cover');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('cover', file);

      const response = await fetch(`${API_BASE_URL}/api/stories/${storyId}/cover`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('Failed to update cover');

      const data = await response.json();
      if (data.success) {
        const newCoverUrl = data.coverUrl || data.cover || data.url || data.secure_url || data.path;
        console.log('New cover URL:', newCoverUrl);
        setCoverImage(newCoverUrl);
        setStory(prev => ({ ...prev, cover: newCoverUrl }));
        setSuccess('Cover image updated successfully!');
        setError(null);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(data.message || 'Failed to update cover');
      }
    } catch (err) {
      setError('Failed to update cover image: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle chapter content changes
  const handleChapterChange = (idx, field, value) => {
    const updated = chapters.map((ch, i) =>
      i === idx ? { ...ch, [field]: value } : ch
    );
    setChapters(updated);
    setSaveStatus('unsaved');
    setError(null);
  };

  // Add new chapter
  const addChapter = () => {
    setChapters([...chapters, { title: "", content: "", published: false }]);
    setActiveChapter(chapters.length);
    setSaveStatus('unsaved');
  };

  // Remove chapter
  const removeChapter = (idx) => {
    if (chapters.length <= 1) {
      setError('Story must have at least one chapter');
      return;
    }

    const updated = chapters.filter((_, i) => i !== idx);
    setChapters(updated);
    
    if (activeChapter >= updated.length) {
      setActiveChapter(updated.length - 1);
    }
    
    setSaveStatus('unsaved');
  };

  // Validate chapter
  const validateChapter = (chapter) => {
    if (!chapter.title.trim()) {
      return 'Chapter title is required';
    }
    if (!chapter.content.trim()) {
      return 'Chapter content is required';
    }
    return null;
  };

  // Save story
  const handleSave = async (silent = false) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Validate all chapters
      const validationErrors = chapters.map(validateChapter);
      const firstError = validationErrors.find(error => error !== null);
      
      if (firstError && !silent) {
        setError(firstError);
        return;
      }

      if (!silent) {
        setSaveStatus('saving');
      }

      const endpoint = storyId && storyId !== 'new' ?
        `${API_BASE_URL}/api/stories/${storyId}` :
        `${API_BASE_URL}/api/stories`;

      const storyData = {
        ...(story || {}),
        cover: coverImage, // ADD THIS LINE - preserve the current cover image
        chapters: chapters.map(ch => ({
          title: ch.title,
          content: ch.content,
          published: ch.published || false
        }))
      };

      const response = await fetch(endpoint, {
        method: storyId && storyId !== 'new' ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(storyData)
      });

      if (!response.ok) throw new Error('Failed to save story');

      const data = await response.json();
      if (data.success) {
        if (!storyId || storyId === 'new') {
          navigate(`/write/${data.story._id}`, { replace: true });
          return;
        }
        
        setStory(data.story);
        // DON'T reset the cover image - keep the current one
        setSaveStatus('saved');
        setError(null);
        
        if (!silent) {
          setSuccess('Story saved successfully!');
          setTimeout(() => setSuccess(null), 3000);
        }
      }
    } catch (err) {
      setError(err.message);
      setSaveStatus('unsaved');
      if (!silent) {
        console.error('Save error:', err);
      }
    }
  };

  // Handle publishing
  const handlePublish = async (selectedChapters) => {
    try {
      if (!storyId || storyId === 'new') {
        setError('Please save the story before publishing');
        return;
      }

      if (selectedChapters.length === 0) {
        setError('Please select at least one chapter to publish');
        return;
      }

      // Validate selected chapters
      const invalidChapters = selectedChapters.filter(idx => {
        const validation = validateChapter(chapters[idx]);
        return validation !== null;
      });

      if (invalidChapters.length > 0) {
        setError(`Chapter ${invalidChapters[0] + 1} is incomplete`);
        return;
      }

      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/stories/${storyId}/publish`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          publishedChapters: selectedChapters
        })
      });

      if (!response.ok) throw new Error('Failed to publish chapters');

      const data = await response.json();
      if (data.success) {
        // Update chapters with published status
        setChapters(chapters.map((chapter, idx) => ({
          ...chapter,
          published: selectedChapters.includes(idx) || chapter.published
        })));
        
        setChaptersToPublish([...new Set([...chaptersToPublish, ...selectedChapters])]);
        setError(null);
        setSuccess('Selected chapters published successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError(err.message);
      console.error('Publish error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle marking story as complete
  const handleComplete = async () => {
    try {
      if (!storyId || storyId === 'new') {
        setError('Please save the story before marking it as complete');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/stories/${storyId}/complete`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to mark story as complete');

      const data = await response.json();
      if (data.success) {
        setStory({ ...story, completed: true, completedAt: new Date() });
        setSuccess('Story marked as complete! It can no longer be edited.');
        navigate(`/story/${storyId}`);
      }
    } catch (err) {
      setError(err.message);
      console.error('Complete error:', err);
    }
  };

  // Cover selection handler
  const handleCoverSelect = (coverUrl) => {
    setCoverImage(coverUrl);
    setShowCoverSelector(false);
    
    // If this is an existing story, save the new cover
    if (storyId && storyId !== 'new') {
      handleSaveCoverUrl(coverUrl);
    }
  };

  const handleSaveCoverUrl = async (coverUrl) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stories/${storyId}/cover-url`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ coverUrl })
      });

      if (!response.ok) throw new Error('Failed to update cover');

      const data = await response.json();
      if (data.success) {
        setStory(prev => ({ ...prev, cover: coverUrl }));
        setSuccess('Cover updated successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to update cover: ' + err.message);
    }
  };

  // Loading state
  if (loading && (!story || storyId === 'new')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading story...</p>
        </div>
      </div>
    );
  }

  // Show permission error page
  if (permissionError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h1>
            <p className="text-gray-600 mb-6">
              You don't have permission to edit this story. Only the author and invited collaborators can make changes.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate(`/story/${id}`)}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              📖 Read This Story
            </button>
            
            <button
              onClick={() => navigate(-1)}
              className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ← Go Back
            </button>
            
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-3">
                Want to start writing your own stories?
              </p>
              <button
                onClick={() => navigate('/write')}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                ✍️ Create New Story
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-storypad-dark-bg">
      {/* Story Header */}
      <BackButton />
      {story && (
        <div className="bg-white dark:bg-storypad-dark-surface border-b dark:border-gray-700 px-4 lg:px-6 py-4 shadow-sm">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-start space-y-4 md:space-y-0 md:space-x-8">
              {/* Cover Image */}
              <div className="w-32 md:w-48 flex-shrink-0 mx-auto md:mx-0">
                <div className="relative aspect-[3/4] rounded-lg overflow-hidden shadow-md">
                  <img
                    src={coverImage}
                    alt={story.title || 'Story cover'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.log('Image failed to load, using default');
                      e.target.src = DEFAULT_COVER;
                    }}
                  />
                  {isOwner && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity">
                      <div className="flex items-center justify-center h-full">
                        <button
                          onClick={() => setShowCoverSelector(true)}
                          className="bg-white dark:bg-storypad-dark-surface text-gray-900 dark:text-storypad-dark-text px-3 py-1 rounded text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          Change Cover
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Story Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-storypad-dark-text mb-2">
                  {story.title}
                </h1>
                <p className="text-gray-600 dark:text-storypad-dark-text-light mb-4 text-sm md:text-base">
                  {story.description}
                </p>
                <div className="grid grid-cols-2 md:flex md:items-center md:space-x-6 gap-2 md:gap-0 text-xs md:text-sm text-gray-500 dark:text-storypad-dark-text-light">
                  <div className="flex items-center justify-center md:justify-start space-x-1">
                    <span>📖</span>
                    <span className="truncate">{Array.isArray(story.category) ? story.category.join(' • ') : story.category}</span>
                  </div>
                  <div className="flex items-center justify-center md:justify-start space-x-1">
                    <span>🌐</span>
                    <span>{story.language}</span>
                  </div>
                  <div className="flex items-center justify-center md:justify-start space-x-1">
                    <span>📚</span>
                    <span>{chapters.length} {chapters.length === 1 ? 'Ch' : 'Chs'}</span>
                  </div>
                  <div className="flex items-center justify-center md:justify-start space-x-1">
                    <span>👁️</span>
                    <span>{story.views || 0} views</span>
                  </div>
                </div>
                
                {/* Role badges - mobile friendly */}
                <div className="mt-3 flex justify-center md:justify-start">
                  {!isOwner && (
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 md:px-3 py-1 rounded-full text-xs font-medium">
                      🤝 Collaborating
                    </span>
                  )}
                  {isOwner && (
                    <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 md:px-3 py-1 rounded-full text-xs font-medium">
                      📝 Your Story
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-500 p-4 mx-4 lg:mx-6 mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400 dark:border-green-500 p-4 mx-4 lg:mx-6 mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-green-400">✅</span>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setSuccess(null)}
                className="text-green-400 hover:text-green-600 dark:hover:text-green-300"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-4 lg:py-6 px-4 lg:px-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Chapters Sidebar - Mobile: Top, Desktop: Left */}
          <div className="w-full lg:w-64 lg:flex-shrink-0 order-1 lg:order-1">
            <div className="bg-white dark:bg-storypad-dark-surface rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold dark:text-storypad-dark-text">Chapters</h2>
                <div className="flex items-center space-x-1">
                  {saveStatus === 'saving' && (
                    <div className="w-3 h-3 border border-blue-600 dark:border-storypad-dark-primary border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span className={`text-xs px-2 py-1 rounded ${
                    saveStatus === 'saved' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                    saveStatus === 'saving' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                    'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                  }`}>
                    {saveStatus === 'saved' ? 'Saved' :
                     saveStatus === 'saving' ? 'Saving...' :
                     'Unsaved'}
                  </span>
                </div>
              </div>
              
              {/* Mobile: Horizontal scroll, Desktop: Vertical */}
              <div className="lg:space-y-2">
                <div className="flex lg:flex-col space-x-2 lg:space-x-0 lg:space-y-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
                  {chapters.map((chapter, idx) => (
                    <div
                      key={idx}
                      className={`group relative p-2 rounded transition-colors flex-shrink-0 lg:flex-shrink min-w-[120px] lg:min-w-0 ${
                        activeChapter === idx 
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-storypad-dark-text'
                      }`}
                    >
                      <button
                        onClick={() => setActiveChapter(idx)}
                        className="w-full text-left"
                      >
                        <div className="text-sm font-medium">
                          Ch {idx + 1}
                        </div>
                        <div className="text-xs truncate text-gray-600 dark:text-storypad-dark-text-light">
                          {chapter.title || 'Untitled'}
                        </div>
                        <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-2 mt-1">
                          {chapter.published && (
                            <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900 px-1 rounded mb-1 lg:mb-0">
                              Published
                            </span>
                          )}
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {chapter.content ? `${chapter.content.length} chars` : 'Empty'}
                          </span>
                        </div>
                      </button>
                      
                      {chapters.length > 1 && (
                        <button
                          onClick={() => removeChapter(idx)}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 
                            text-red-500 hover:text-red-700 text-xs transition-opacity"
                          title="Remove chapter"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <button
                type="button"
                className="w-full mt-4 p-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 
                  rounded transition-colors border border-dashed border-blue-300 dark:border-blue-600"
                onClick={addChapter}
              >
                + Add New Chapter
              </button>
            </div>
          </div>

          {/* Editor - Mobile: Middle, Desktop: Center */}
          <div className="flex-1 order-2 lg:order-2">
            <div className="mb-4 lg:mb-8 p-4 bg-white dark:bg-storypad-dark-surface rounded-lg shadow">
              <label className="block text-sm font-medium text-gray-700 dark:text-storypad-dark-text mb-2">
                Chapter {activeChapter + 1} Title
                <input
                  type="text"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                    shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm lg:text-base
                    bg-white dark:bg-storypad-dark-bg text-gray-900 dark:text-storypad-dark-text"
                  placeholder={`Enter chapter ${activeChapter + 1} title`}
                  value={chapters[activeChapter]?.title || ''}
                  onChange={e => handleChapterChange(activeChapter, "title", e.target.value)}
                />
              </label>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-storypad-dark-text mb-2">
                  Content
                </label>
                <CollaborativeEditor
                  storyId={storyId}
                  chapterIndex={activeChapter}
                  value={chapters[activeChapter]?.content || ''}
                  onChange={(content) => handleChapterChange(activeChapter, "content", content)}
                  placeholder={`Write chapter ${activeChapter + 1} content...`}
                  currentUser={currentUser}
                />
              </div>
            </div>

            {/* Action Buttons - Mobile: Stack vertically */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <button
                type="button"
                className="px-4 lg:px-6 py-2 bg-blue-600 dark:bg-storypad-dark-primary text-white rounded-lg hover:bg-blue-700 dark:hover:bg-opacity-90
                  transition-colors flex items-center justify-center space-x-2 text-sm lg:text-base"
                onClick={() => handleSave(false)}
                disabled={saveStatus === 'saving' || story?.completed}
              >
                {saveStatus === 'saving' ? (
                  <>
                    <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>Save Changes</span>
                  </>
                )}
              </button>
                
              <button
                type="button"
                className="px-4 lg:px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 
                  transition-colors flex items-center justify-center space-x-2 text-sm lg:text-base"
                onClick={() => setShowPublishModal(true)}
                disabled={!storyId || storyId === 'new' || loading || story?.completed}
              >
                <span>📚</span>
                <span>Publish Chapters</span>
              </button>

              <button
                type="button"
                className="px-4 lg:px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 
                  transition-colors flex items-center justify-center space-x-2 text-sm lg:text-base"
                onClick={handleComplete}
                disabled={!storyId || storyId === 'new' || loading || story?.completed}
              >
                <span>✅</span>
                <span>Complete Story</span>
              </button>
            </div>
          </div>

          {/* Collaboration Panel - Mobile: Bottom (collapsible), Desktop: Right */}
          <div className="w-full lg:w-80 lg:flex-shrink-0 order-3 lg:order-3">
            <div className="bg-white dark:bg-storypad-dark-surface rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold dark:text-storypad-dark-text">Collaboration</h2>
                <button
                  type="button"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                  onClick={() => setShowCollaboration(!showCollaboration)}
                  disabled={!storyId || storyId === 'new'}
                >
                  {showCollaboration ? 'Hide' : 'Show'} Panel
                </button>
              </div>
              
              {showCollaboration && storyId && storyId !== 'new' && (
                <div className="max-h-64 lg:max-h-none overflow-y-auto lg:overflow-y-visible">
                  <CollaborationPanel storyId={storyId} isOwner={isOwner} />
                </div>
              )}
              
              {(!storyId || storyId === 'new') && (
                <div className="text-center py-4 lg:py-8">
                  <div className="text-gray-400 text-2xl lg:text-4xl mb-2">👥</div>
                  <p className="text-xs lg:text-sm text-gray-500 dark:text-storypad-dark-text-light">
                    Save your story first to enable collaboration features
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Publish Modal */}
      <PublishModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        chapters={chapters}
        initialSelectedChapters={chaptersToPublish}
        onPublish={handlePublish}
      />

      {/* Cover Selector Modal */}
      {showCoverSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-storypad-dark-surface rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold dark:text-storypad-dark-text">Choose Cover Image</h3>
              <button
                onClick={() => setShowCoverSelector(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <CoverSelector
                currentCover={coverImage}
                onCoverSelect={handleCoverSelect}
                onUpload={handleImageChange}
                storyCategories={story?.category}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WritePage;