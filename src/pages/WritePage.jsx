import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const WritePage = () => {
  const { storyId } = useParams();
  const navigate = useNavigate();
  const [story, setStory] = useState(null);
  const [chapters, setChapters] = useState([{ title: "", content: "" }]);
  const [activeChapter, setActiveChapter] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
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

        if (!response.ok) throw new Error('Failed to load story');

        const data = await response.json();
        if (data.success) {
          setStory(data.story);
          setChapters(data.story.chapters.length > 0 ? 
            data.story.chapters : 
            [{ title: "", content: "" }]
          );
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Initialize empty story if no storyId
    const initializeNewStory = () => {
      setStory(null);
      setChapters([{ title: "", content: "" }]);
      setLoading(false);
    };

    if (storyId && storyId !== 'new') {
      loadExistingStory(storyId);
    } else {
      initializeNewStory();
    }
  }, [storyId, navigate]);

  // Handle changes in chapter fields
  const handleChapterChange = (idx, field, value) => {
    const updated = chapters.map((ch, i) =>
      i === idx ? { ...ch, [field]: value } : ch
    );
    setChapters(updated);
  };

  // Add a new empty chapter
  const addChapter = () => {
    setChapters([...chapters, { title: "", content: "" }]);
  };

  // Save story changes
const handleSave = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const endpoint = storyId && storyId !== 'new' ?
      `http://localhost:5000/api/stories/${storyId}` :
      'http://localhost:5000/api/stories';

    const storyData = {
      ...(story || {}),  // Keep existing story data
      chapters: chapters.map(ch => ({  // Format chapters data
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
      setStory(data.story);  // Update local story state
      alert('Story saved successfully!');
    }
  } catch (err) {
    setError(err.message);
    alert('Failed to save story');
  }
};

  // Publish the story
  const handlePublish = async () => {
    try {
      if (!storyId || storyId === 'new') {
        alert('Please save the story before publishing');
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/stories/${storyId}/publish`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to publish story');

      const data = await response.json();
      if (data.success) {
        alert('Story published successfully!');
        navigate('/mystories');
      }
    } catch (err) {
      setError(err.message);
      alert('Failed to publish story');
    }
  };

  if (loading) return <div className="text-center p-4">Loading story...</div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

   return (
    <div className="container-custom py-12">
      <h1 className="text-3xl font-bold text-storypad-dark mb-6">
        {storyId && storyId !== 'new' ? 'Edit Story' : 'Write New Story'}
      </h1>

      <div className="flex gap-6">
        {/* Chapter Sidebar */}
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
              + Add Chapter
            </button>
          </div>
        </div>

        {/* Main Content Area */}
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
            <textarea
              className="input w-full mt-3"
              rows={12}
              placeholder={`Write chapter ${activeChapter + 1} content...`}
              value={chapters[activeChapter]?.content || ''}
              onChange={e => handleChapterChange(activeChapter, "content", e.target.value)}
            />
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
            >
              Save
            </button>
            <button
              type="button"
              className="btn-accent"
              onClick={handlePublish}
              disabled={!storyId || storyId === 'new'}
            >
              Publish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WritePage;