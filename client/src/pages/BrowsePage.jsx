import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const DEFAULT_COVER = `${API_BASE_URL}/api/stories/default-cover`;

console.log('🔧 Environment check:');
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('API_BASE_URL:', API_BASE_URL);

const BrowsePage = () => {
  const [stories, setStories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/stories/published`);
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
    <div className="min-h-screen bg-gray-50">
      <div className="container-custom py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Discover Stories</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Explore amazing stories written by our community of writers
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search stories by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 pl-12 rounded-xl border border-gray-200 
                focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                transition-all shadow-sm text-lg"
            />
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Results Count */}
        {searchQuery && (
          <div className="text-center mb-6">
            <p className="text-gray-600">
              Found {searchResults.length} {searchResults.length === 1 ? 'story' : 'stories'}
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center py-12 bg-white rounded-lg shadow-sm">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold mb-2">Oops! Something went wrong</h3>
            <p>{error}</p>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No stories found</h3>
            <p className="text-gray-600">
              {searchQuery ? `No stories match "${searchQuery}"` : 'No published stories available yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {searchResults.map((story) => (
              <Link 
                to={`/story/${story._id}`} 
                key={story._id} 
                className="group block transition-transform hover:scale-105"
              >
                {/* Book Cover */}
                <div className="relative mb-3">
                  <div className="aspect-[3/4] bg-white rounded-lg shadow-md overflow-hidden 
                    group-hover:shadow-xl transition-shadow duration-300">
                    <img 
                      src={story.cover || DEFAULT_COVER} 
                      alt={story.title} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Create a beautiful fallback cover
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    {/* Fallback Cover Design */}
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 
                      flex flex-col justify-center items-center text-white p-4 text-center hidden">
                      <div className="text-xs font-bold mb-2 line-clamp-3 leading-tight">
                        {story.title.toUpperCase()}
                      </div>
                      <div className="text-xs opacity-80">
                        {story.author.username}
                      </div>
                      <div className="absolute bottom-2 right-2 opacity-30">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  {/* Chapter Count Badge */}
                  <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white 
                    text-xs px-2 py-1 rounded-full shadow-sm">
                    {story.chapters?.length || 0} ch.
                  </div>
                </div>

                {/* Book Info */}
                <div className="space-y-1">
                  <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 
                    group-hover:text-blue-600 transition-colors">
                    {story.title}
                  </h3>
                  
                  <p className="text-xs text-gray-500">
                    by {story.author.username}
                  </p>

                  {/* Categories */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {story.category.slice(0, 2).map((cat, idx) => (
                      <span 
                        key={idx}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 
                          rounded-full leading-none"
                      >
                        {cat}
                      </span>
                    ))}
                    {story.category.length > 2 && (
                      <span className="text-xs text-gray-400">
                        +{story.category.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowsePage;