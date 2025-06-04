import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const BrowsePage = () => {
  const [stories, setStories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/stories/published');
        const data = await response.json();
        
        if (data.success) {
          setStories(data.stories);
        } else {
          setError('Failed to load stories');
        }
      } catch (err) {
        setError('Error connecting to server');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStories();
  }, []);

  // Search and sort functionality
  const getSearchResults = () => {
    if (!searchQuery) return stories;

    const query = searchQuery.toLowerCase();
    
    return stories.sort((a, b) => {
      const aTitleMatch = a.title.toLowerCase().includes(query);
      const bTitleMatch = b.title.toLowerCase().includes(query);
      const aDescMatch = a.description.toLowerCase().includes(query);
      const bDescMatch = b.description.toLowerCase().includes(query);

      // Sort by match priority
      if (aTitleMatch && !bTitleMatch) return -1;
      if (!aTitleMatch && bTitleMatch) return 1;
      if (aDescMatch && !bDescMatch) return -1;
      if (!aDescMatch && bDescMatch) return 1;
      return 0;
    }).filter(story => 
      story.title.toLowerCase().includes(query) ||
      story.description.toLowerCase().includes(query)
    );
  };

  const searchResults = getSearchResults();

  return (
    <div className="container-custom py-12">
      {/* Search Bar */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="Search stories by title or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 
            focus:ring-blue-500 focus:border-transparent transition-colors"
        />
      </div>

      {/* Results Count */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-storypad-dark">Browse Stories</h1>
        {searchQuery && (
          <p className="text-gray-600">
            Found {searchResults.length} {searchResults.length === 1 ? 'story' : 'stories'}
          </p>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">Loading stories...</div>
      ) : error ? (
        <div className="text-red-500 text-center py-12">{error}</div>
      ) : searchResults.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          No stories found matching "{searchQuery}"
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {searchResults.map((story) => (
            <Link 
              to={`/story/${story._id}`} 
              key={story._id} 
              className="card hover:shadow-lg transition-shadow"
            >
              <img 
                src={story.cover || '/default-cover.jpg'} 
                alt={story.title} 
                className="w-full h-48 object-cover rounded-t-lg" 
              />
              <div className="p-4">
                <h3 className="text-lg font-semibold text-storypad-dark">
                  {story.title}
                </h3>
                <p className="text-sm text-storypad-text-light">
                  by {story.author.username}
                </p>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                  {story.description}
                </p>
                <div className="flex gap-2 mt-3">
                  {story.category.map((cat, idx) => (
                    <span 
                      key={idx}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default BrowsePage;