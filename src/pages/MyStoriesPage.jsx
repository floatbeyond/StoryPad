import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const MyStoriesPage = () => {
  const [stories, setStories] = useState([]);
  const [collaborativeStories, setCollaborativeStories] = useState([]);
  const [activeTab, setActiveTab] = useState('owned');
  const [invitationCount, setInvitationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchInvitationCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/invitations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setInvitationCount(data.invitations.length);
      }
    } catch (err) {
      console.error('Error fetching invitation count:', err);
    }
  };

  useEffect(() => {
    const fetchMyStories = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const tokenData = JSON.parse(atob(token.split('.')[1]));

        // Fetch owned stories
        const ownedResponse = await fetch(`http://localhost:5000/api/user/${tokenData.id}/stories`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!ownedResponse.ok) {
          if (ownedResponse.status === 403) {
            localStorage.removeItem('token');
            navigate('/login');
            return;
          }
          throw new Error('Failed to fetch stories');
        }

        const ownedData = await ownedResponse.json();

        if (ownedData.success) {
          const processedStories = ownedData.stories.map(story => ({
            ...story,
            chapters: story.chapters || [],
            chaptersCount: (story.chapters || []).length,
            publishedChapters: (story.chapters || []).filter(ch => ch.published).length
          }));
          setStories(processedStories);
        }

        // Fetch collaborative stories
        const collaborativeResponse = await fetch(`http://localhost:5000/api/user/${tokenData.id}/collaborative-stories`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (collaborativeResponse.ok) {
          const collaborativeData = await collaborativeResponse.json();
          if (collaborativeData.success) {
            const processedCollaborativeStories = collaborativeData.stories.map(story => ({
              ...story,
              chapters: story.chapters || [],
              chaptersCount: (story.chapters || []).length,
              publishedChapters: (story.chapters || []).filter(ch => ch.published).length,
              isCollaborator: true
            }));
            setCollaborativeStories(processedCollaborativeStories);
          }
        }

        // Fetch invitation count
        await fetchInvitationCount();

      } catch (err) {
        console.error('Error fetching stories:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMyStories();
  }, [navigate]);

  return (
    <div className="container-custom py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Stories</h1>
        <Link to="/newwrite" className="btn-primary">
          ✍️ New Story
        </Link>
      </div>
      
      {/* Invitations Banner */}
      {invitationCount > 0 && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-500 text-white rounded-full p-2">
                📨
              </div>
              <div>
                <h3 className="font-medium text-blue-900">
                  New Collaboration Invitation{invitationCount !== 1 ? 's' : ''}
                </h3>
                <p className="text-blue-700 text-sm">
                  You have {invitationCount} pending invitation{invitationCount !== 1 ? 's' : ''} to collaborate on stories
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/invitations')}
              className="btn-primary whitespace-nowrap"
            >
              View Invitations
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('owned')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'owned'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📝 My Stories ({stories.length})
            </button>
            <button
              onClick={() => setActiveTab('collaborative')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'collaborative'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🤝 Collaborating ({collaborativeStories.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Loading and Error States */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-storypad-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your stories...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Stories Content */}
      {!loading && !error && (
        <>
          {/* Owned Stories Tab */}
          {activeTab === 'owned' && (
            <>
              {stories.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mb-4">
                    <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No stories yet</h3>
                  <p className="text-gray-600 mb-6">Start your writing journey by creating your first story!</p>
                  <Link to="/newwrite" className="btn-primary">
                    Create Your First Story
                  </Link>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {stories.map((story) => (
                    <StoryCard key={story._id} story={story} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Collaborative Stories Tab */}
          {activeTab === 'collaborative' && (
            <>
              {collaborativeStories.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mb-4">
                    <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No collaborative stories</h3>
                  <p className="text-gray-600 mb-6">You haven't joined any collaborative stories yet. Accept invitations from other writers to start collaborating!</p>
                  {invitationCount > 0 && (
                    <button 
                      onClick={() => navigate('/invitations')}
                      className="btn-primary"
                    >
                      Check Pending Invitations
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {collaborativeStories.map((story) => (
                    <CollaborativeStoryCard key={story._id} story={story} />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

// Story Card Component (for owned stories)
const StoryCard = ({ story }) => {
  const navigate = useNavigate();
  
  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
            {story.title}
          </h3>
          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full whitespace-nowrap ml-2">
            📝 Owner
          </span>
        </div>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {story.description}
        </p>
        
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <span>{story.category}</span>
          <span>{story.language}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
          <span>{story.chaptersCount} chapters</span>
          <span>{story.publishedChapters} published</span>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/write/${story._id}`)}
            className="btn-primary flex-1 text-sm"
          >
            ✍️ Edit
          </button>
          <button
            onClick={() => navigate(`/story/${story._id}`)}
            className="btn-secondary flex-1 text-sm"
          >
            👁️ View
          </button>
        </div>
      </div>
    </div>
  );
};

// Collaborative Story Card Component
const CollaborativeStoryCard = ({ story }) => {
  const navigate = useNavigate();
  
  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
            {story.title}
          </h3>
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full whitespace-nowrap ml-2">
            🤝 Collaborator
          </span>
        </div>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {story.description}
        </p>
        
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <span>by {story.author.username}</span>
          <span>{story.category}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
          <span>{story.chaptersCount} chapters</span>
          <span>{story.publishedChapters} published</span>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/write/${story._id}`)}
            className="btn-primary flex-1 text-sm"
          >
            ✍️ Edit
          </button>
          <button
            onClick={() => navigate(`/story/${story._id}`)}
            className="btn-secondary flex-1 text-sm"
          >
            👁️ View
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyStoriesPage;