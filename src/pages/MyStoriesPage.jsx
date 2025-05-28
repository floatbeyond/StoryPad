import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const MyStoriesPage = () => {
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

 useEffect(() => {
  const fetchMyStories = async () => {
    try {
      // Get and validate token
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Decode token
      let tokenData;
      try {
        tokenData = JSON.parse(atob(token.split('.')[1]));
        if (!tokenData.id) {
          throw new Error('Invalid token');
        }
      } catch (e) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      // Fetch stories
      const response = await fetch(`http://localhost:5000/api/user/${tokenData.id}/stories`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Handle response
      if (!response.ok) {
        if (response.status === 403) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
        throw new Error('Failed to fetch stories');
      }

      const data = await response.json();

      // Process and set stories data
      if (data.success) {
        const processedStories = data.stories.map(story => ({
          ...story,
           chapters: story.chapters || [],
          chaptersCount: (story.chapters || []).length,
          publishedChapters: (story.chapters || []).filter(ch => ch.published).length
        }));
        setStories(processedStories);
      } else {
        throw new Error(data.message || 'Failed to fetch stories');
      }
    } catch (err) {
      console.error('Error fetching stories:', err);
      setError(err.message);
      if (err.message.includes('token')) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  fetchMyStories();
}, [navigate]);

  const handleEditStory = (storyId) => {
    navigate(`/write/${storyId}`);
  };

  const renderStoryCard = (story) => (
  <div key={story._id} className="bg-white rounded-lg shadow-md p-6">
    <div className="flex justify-between items-start mb-4">
      <h2 className="text-xl font-semibold">{story.title}</h2>
      <span className={`px-2 py-1 rounded text-sm ${
        story.published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
      }`}>
        {story.published ? 'Published' : 'Draft'}
      </span>
    </div>
    
    <p className="text-gray-600 mb-4">{story.description}</p>

    {/* Simplified chapter count display */}
    <div className="mb-4">
      <span className="text-sm text-gray-500">
        Chapters: {(story.chapters || []).length}
      </span>
    </div>
    
    <div className="flex gap-2">
      <button
        onClick={() => handleEditStory(story._id)}
        className="btn-secondary flex-1"
      >
        Continue Writing
      </button>
      <button
        onClick={() => navigate(`/story/${story._id}/preview`)}
        className="btn-outline flex-1"
      >
        Preview
      </button>
    </div>

    <div className="mt-4 text-sm text-gray-500">
      <p>Category: {story.category}</p>
      <p>Language: {story.language}</p>
      <p>Last updated: {new Date(story.updatedAt).toLocaleDateString()}</p>
    </div>
  </div>
);

  if (loading) return <div className="text-center p-4">Loading your stories...</div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <div className="container-custom py-8">
      <h1 className="text-3xl font-bold mb-6">My Stories</h1>
      
      {stories.length === 0 ? (
        <div className="text-center p-8">
          <p className="mb-4">You haven't created any stories yet.</p>
          <button 
            onClick={() => navigate('/write/new')}
            className="btn-primary hover:bg-blue-600 transition-colors"
            aria-label="Create new story"
          >
            Start Writing
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stories.map(renderStoryCard)}
        </div>
      )}
    </div>
  );
};

export default MyStoriesPage;