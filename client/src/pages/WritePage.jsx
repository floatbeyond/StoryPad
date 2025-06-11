import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CollaborationPanel from '../components/CollaborationPanel';
import CollaborativeEditor from '../components/CollaborativeEditor';
import PublishModal from '../components/PublishModal';

const DEFAULT_COVER = '/api/default-cover';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const WritePage = () => {
  // Route and navigation
  const { storyId } = useParams();
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
  const [showCollaboration, setShowCollaboration] = useState(false);

  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [chaptersToPublish, setChaptersToPublish] = useState([]);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'unsaved'

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

    const loadExistingStory = async (id) => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/stories/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('You do not have permission to access this story');
          }
          if (response.status === 404) {
            throw new Error('Story not found');
          }
          throw new Error('Failed to load story');
        }

        const data = await response.json();
        if (data.success) {
          setStory(data.story);
          setCoverImage(data.story.cover || DEFAULT_COVER);
          
          const payload = JSON.parse(atob(token.split('.')[1]));
          setIsOwner(data.story.author._id === payload.id);
          
          const storyChapters = data.story.chapters.length > 0 ? 
            data.story.chapters : 
            [{ title: "", content: "", published: false }];
          
          setChapters(storyChapters);
          
          // Set published chapters for modal
          const publishedIndices = storyChapters
            .map((chapter, index) => chapter.published ? index : -1)
            .filter(index => index !== -1);
          
          setChaptersToPublish(publishedIndices);
          setSaveStatus('saved');
        }
      } catch (err) {
        console.error('Load story error:', err);
        setError(err.message);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Story Header */}
      {story && (
        <div className="bg-white border-b px-6 py-4 shadow-sm">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start space-x-8">
              {/* Cover Image */}
              <div className="w-48 flex-shrink-0">
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
                    <label className="absolute inset-0 flex items-center justify-center 
                      bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity 
                      cursor-pointer text-white text-sm font-medium">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      Change Cover
                    </label>
                  )}
                </div>
              </div>

              {/* Story Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {story.title}
                </h1>
                <p className="text-gray-600 mb-4 max-w-2xl">
                  {story.description}
                </p>
                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <span>📖</span>
                    <span>{Array.isArray(story.category) ? story.category.join(' • ') : story.category}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>🌐</span>
                    <span>{story.language}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>📚</span>
                    <span>{chapters.length} {chapters.length === 1 ? 'Chapter' : 'Chapters'}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>👁️</span>
                    <span>{story.views || 0} views</span>
                  </div>
                  {!isOwner && (
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                      🤝 Collaborating with {story.author?.username || 'Author'}
                    </span>
                  )}
                  {isOwner && (
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
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
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-6 mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mx-6 mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-green-400">✅</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setSuccess(null)}
                className="text-green-400 hover:text-green-600"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 px-6">
        <div className="flex gap-6">
          {/* Chapters Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Chapters</h2>
                <div className="flex items-center space-x-1">
                  {saveStatus === 'saving' && (
                    <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span className={`text-xs px-2 py-1 rounded ${
                    saveStatus === 'saved' ? 'bg-green-100 text-green-800' :
                    saveStatus === 'saving' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {saveStatus === 'saved' ? 'Saved' :
                     saveStatus === 'saving' ? 'Saving...' :
                     'Unsaved'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                {chapters.map((chapter, idx) => (
                  <div
                    key={idx}
                    className={`group relative p-2 rounded transition-colors ${
                      activeChapter === idx 
                        ? 'bg-blue-100 text-blue-800'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <button
                      onClick={() => setActiveChapter(idx)}
                      className="w-full text-left"
                    >
                      <div className="text-sm font-medium">
                        Chapter {idx + 1}
                      </div>
                      <div className="text-xs truncate text-gray-600">
                        {chapter.title || 'Untitled'}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        {chapter.published && (
                          <span className="text-xs text-green-600 bg-green-100 px-1 rounded">
                            Published
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
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
              
              <button
                type="button"
                className="w-full mt-4 p-2 text-sm text-blue-600 hover:bg-blue-50 
                  rounded transition-colors border border-dashed border-blue-300"
                onClick={addChapter}
              >
                + Add New Chapter
              </button>
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1">
            <div className="mb-8 p-4 bg-white rounded-lg shadow">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chapter {activeChapter + 1} Title
                <input
                  type="text"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md 
                    shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder={`Enter chapter ${activeChapter + 1} title`}
                  value={chapters[activeChapter]?.title || ''}
                  onChange={e => handleChapterChange(activeChapter, "title", e.target.value)}
                />
              </label>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
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

            {/* Action Buttons */}
           <div className="flex gap-4">
            <button
              type="button"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                transition-colors flex items-center space-x-2"
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
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 
                  transition-colors flex items-center space-x-2"
                onClick={() => setShowPublishModal(true)}
                disabled={!storyId || storyId === 'new' || loading || story?.completed}
              >
                <span>📚</span>
                <span>Publish Chapters</span>
              </button>

              
              <button
                type="button"
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 
                  transition-colors flex items-center space-x-2"
                onClick={handleComplete}
                disabled={!storyId || storyId === 'new' || loading || story?.completed}
              >
                <span>✅</span>
                <span>Complete Story</span>
              </button>
            </div>
          </div>

          {/* Collaboration Panel */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Collaboration</h2>
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  onClick={() => setShowCollaboration(!showCollaboration)}
                  disabled={!storyId || storyId === 'new'}
                >
                  {showCollaboration ? 'Hide Panel' : 'Show Panel'}
                </button>
              </div>
              
              {showCollaboration && storyId && storyId !== 'new' && (
                <CollaborationPanel storyId={storyId} isOwner={isOwner} />
              )}
              
              {(!storyId || storyId === 'new') && (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-2">👥</div>
                  <p className="text-sm text-gray-500">
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
    </div>
  );
};

export default WritePage;