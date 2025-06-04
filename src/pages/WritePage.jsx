import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CollaborationPanel from '../components/CollaborationPanel';
import CollaborativeEditor from '../components/CollaborativeEditor';

const DEFAULT_COVER = '/default-cover.jpg';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

const WritePage = () => {
  // Custom hook to get the current user from local storage
  const [coverImage, setCoverImage] = useState(DEFAULT_COVER);
  const [imageFile, setImageFile] = useState(null);

  // Route and navigation
  const { storyId } = useParams();
  const navigate = useNavigate();

  // Story and chapter states
  const [story, setStory] = useState(null);
  const [chapters, setChapters] = useState([{ title: "", content: "" }]);
  const [activeChapter, setActiveChapter] = useState(0);

  // User and collaboration states
  const [currentUser, setCurrentUser] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [showCollaboration, setShowCollaboration] = useState(false);

  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [chaptersToPublish, setChaptersToPublish] = useState([]);

  // Publishing modal component
  const PublishModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-semibold mb-4">Select Chapters to Publish</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {chapters.map((chapter, idx) => (
            <label key={idx} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={chaptersToPublish.includes(idx) || chapter.published}
                onChange={(e) => {
                  setChaptersToPublish(
                    e.target.checked 
                      ? [...new Set([...chaptersToPublish, idx])]
                      : chaptersToPublish.filter(i => i !== idx)
                  );
                }}
                className="w-4 h-4 text-blue-600 rounded border-gray-300"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Chapter {idx + 1}</p>
                  {chapter.published && (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                      Already Published
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{chapter.title || 'Untitled'}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={() => setShowPublishModal(false)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={chaptersToPublish.length === 0}
            className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700
              ${chaptersToPublish.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Publish Selected
          </button>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUser({
          id: payload.id,
          username: localStorage.getItem('username') || 'Anonymous'
        });
      } catch (err) {
        console.error('Error parsing token:', err);
      }
    }

    const loadExistingStory = async (id) => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch(`http://localhost:5000/api/stories/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('You do not have permission to access this story');
          }
          throw new Error('Failed to load story');
        }

        const data = await response.json();
        if (data.success) {
          setStory(data.story);
          const payload = JSON.parse(atob(token.split('.')[1]));
          setIsOwner(data.story.author._id === payload.id);
          
          const storyChapters = data.story.chapters.length > 0 ? 
            data.story.chapters : 
            [{ title: "", content: "", published: false }];
          
          setChapters(storyChapters);
          
          const publishedIndices = storyChapters
            .map((chapter, index) => chapter.published ? index : -1)
            .filter(index => index !== -1);
          
          setChaptersToPublish(publishedIndices);
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
      setLoading(false);
    }
  }, [storyId, navigate]);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > MAX_IMAGE_SIZE) {
        setError('Image size should be less than 5MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }

      try {
        setLoading(true);
        const formData = new FormData();
        formData.append('cover', file);

        const response = await fetch(`http://localhost:5000/api/stories/${storyId}/cover`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });

        if (!response.ok) throw new Error('Failed to update cover');

        const data = await response.json();
        if (data.success) {
          setCoverImage(data.coverUrl);
          setStory(prev => ({ ...prev, cover: data.coverUrl }));
          setError(null);
        } else {
          throw new Error(data.message || 'Failed to update cover');
        }
      } catch (err) {
        setError('Failed to update cover image: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleChapterChange = (idx, field, value) => {
    const updated = chapters.map((ch, i) =>
      i === idx ? { ...ch, [field]: value } : ch
    );
    setChapters(updated);
  };

  const addChapter = () => {
    setChapters([...chapters, { title: "", content: "" }]);
  };

  const validateChapter = (chapter) => {
    if (!chapter.title.trim()) {
      setError('Chapter title is required');
      return false;
    }
    if (!chapter.content.trim()) {
      setError('Chapter content is required');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      if (!validateChapter(chapters[activeChapter])) {
        return;
      }

      setLoading(true);
      const endpoint = storyId && storyId !== 'new' ?
        `http://localhost:5000/api/stories/${storyId}` :
        'http://localhost:5000/api/stories';

      const storyData = {
        ...(story || {}),
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
          navigate(`/write/${data.story._id}`);
        }
        setStory(data.story);
        setError(null);
        alert('Story saved successfully!');
      }
    } catch (err) {
      setError(err.message);
      alert('Failed to save story');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      if (!storyId || storyId === 'new') {
        alert('Please save the story before publishing');
        return;
      }

      if (chaptersToPublish.length === 0) {
        alert('Please select at least one chapter to publish');
        return;
      }

      const invalidChapters = chaptersToPublish.filter(idx => !validateChapter(chapters[idx]));
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

      const response = await fetch(`http://localhost:5000/api/stories/${storyId}/publish`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          publishedChapters: chaptersToPublish
        })
      });

      if (!response.ok) throw new Error('Failed to publish chapters');

      const data = await response.json();
      if (data.success) {
        setChapters(chapters.map((chapter, idx) => ({
          ...chapter,
          published: chaptersToPublish.includes(idx)
        })));
        
        setShowPublishModal(false);
        setError(null);
        alert('Selected chapters published successfully!');
      }
    } catch (err) {
      setError(err.message);
      alert('Failed to publish chapters');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center p-4">Loading story...</div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {story && (
        <div className="bg-white border-b px-6 py-4 shadow-sm">
          <div className="container-custom">
            <div className="flex items-start space-x-8">
              <div className="w-48 flex-shrink-0">
                <div className="relative aspect-[3/4] rounded-lg overflow-hidden shadow-md">
                  <img
                    src={story.cover || DEFAULT_COVER}
                    alt={story.title}
                    className="w-full h-full object-cover"
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

      <div className="container-custom py-6">
        <div className="flex gap-6">
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-semibold mb-4">Chapters</h2>
              <div className="space-y-2">
                {chapters.map((chapter, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveChapter(idx)}
                    className={`w-full text-left p-2 rounded transition-colors ${
                      activeChapter === idx 
                        ? 'bg-blue-100 text-blue-800'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="text-sm font-medium">
                      Chapter {idx + 1}
                    </div>
                    <div className="text-xs truncate text-gray-600">
                      {chapter.title || 'Untitled'}
                    </div>
                    {chapter.published && (
                      <span className="text-xs text-green-600">Published</span>
                    )}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="w-full mt-4 p-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                onClick={addChapter}
              >
                + Add New Chapter
              </button>
            </div>
          </div>

          <div className="flex-1">
            <div className="mb-8 p-4 bg-white rounded-lg shadow">
              <label className="block text-sm font-medium text-storypad-dark mb-2">
                Chapter Title
                <input
                  type="text"
                  className="input w-full mt-1"
                  placeholder={`Enter chapter ${activeChapter + 1} title`}
                  value={chapters[activeChapter]?.title || ''}
                  onChange={e => handleChapterChange(activeChapter, "title", e.target.value)}
                />
              </label>
              
              <div className="mt-3">
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

            <div className="flex gap-4">
              <button
                type="button"
                className="btn-primary"
                onClick={handleSave}
              >
                Save Changes
              </button>
              <button
                type="button"
                className="btn-accent"
                onClick={() => setShowPublishModal(true)}
                disabled={!storyId || storyId === 'new'}
              >
                Select & Publish
              </button>
            </div>
          </div>

          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Collaboration</h2>
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-800"
                  onClick={() => setShowCollaboration(!showCollaboration)}
                  disabled={!storyId || storyId === 'new'}
                >
                  {showCollaboration ? 'Hide Panel' : 'Show Panel'}
                </button>
              </div>
              
              {showCollaboration && (
                <CollaborationPanel storyId={storyId} isOwner={isOwner} />
              )}
              
              {(!storyId || storyId === 'new') && (
                <p className="text-sm text-gray-500">
                  Save your story first to enable collaboration
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showPublishModal && <PublishModal />}
    </div>
  );
};

export default WritePage;