import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import FiltersPanel from '../components/FiltersPanel';
import BackButton from '../components/BackButton';
import { handleImageError, getImageWithFallback } from '../utils/imageUtils.jsx';


const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const DEFAULT_COVER = `${API_BASE_URL}/api/stories/default-cover`;

const BrowsePage = () => {
  const [stories, setStories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    chaptersRange: {
      min: 0,
      max: 100
    },
    selectedCategories: [],
    timeFilter: 'all',
    completion: 'all'
  });

  const timeFilterOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'week', label: 'Last Week' },
    { value: 'month', label: 'Last Month' },
    { value: '3months', label: 'Last 3 Months' },
    { value: '6months', label: 'Last 6 Months' },
    { value: 'year', label: 'Last Year' }
  ];

  const maxChapters = Math.max(
    ...stories.map(s => s.chapters?.length || 0),
    100
  );

  const allCategories = [...new Set(stories.flatMap(story => story.category))];

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

  const getSearchResults = () => {
    let results = [...stories];

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(story => 
        story.title.toLowerCase().includes(query) ||
        story.description.toLowerCase().includes(query)
      );

      // Sort by match relevance
      results.sort((a, b) => {
        const aTitleMatch = a.title.toLowerCase().includes(query);
        const bTitleMatch = b.title.toLowerCase().includes(query);
        if (aTitleMatch && !bTitleMatch) return -1;
        if (!aTitleMatch && bTitleMatch) return 1;
        return 0;
      });
    }

    // Apply filters
    // Chapters range filter
    results = results.filter(story => {
      const chaptersCount = story.chapters?.length || 0;
      return chaptersCount >= filters.chaptersRange.min && 
             chaptersCount <= filters.chaptersRange.max;
    });

    // Categories filter
    if (filters.selectedCategories.length > 0) {
      results = results.filter(story =>
        story.category.some(cat => filters.selectedCategories.includes(cat))
      );
    }

    // Time filter
    if (filters.timeFilter !== 'all') {
    const now = new Date();
    const timeFilters = {
      'week': 7,
      'month': 30,
      '3months': 90,
      '6months': 180,
      'year': 365
    };
    const days = timeFilters[filters.timeFilter];
    
    results = results.filter(story => {
      if (!story.publishedAt) return false;
      const publishDate = new Date(story.publishedAt);
      const diffTime = Math.ceil((now - publishDate) / (1000 * 60 * 60 * 24));
      return diffTime <= days;
    });
    }

    // Completion filter
    if (filters.completion !== 'all') {
      results = results.filter(story =>
        filters.completion === 'completed' ? story.completed : !story.completed
      );
    }

    return results;
  };

  const searchResults = getSearchResults();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-storypad-dark-bg">
      <div className="container-custom py-8">
        {/* Header */}
        <BackButton />
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-storypad-dark-text mb-4">Discover Stories</h1>
          <p className="text-gray-600 dark:text-storypad-dark-text-light max-w-2xl mx-auto">
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
              className="w-full px-6 py-4 pl-12 rounded-xl border border-gray-200 dark:border-gray-600 
                bg-white dark:bg-storypad-dark-surface text-gray-900 dark:text-storypad-dark-text
                focus:ring-2 focus:ring-blue-500 dark:focus:ring-storypad-dark-primary focus:border-transparent 
                transition-all shadow-sm text-lg"
            />
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <svg className="w-5 h-5 text-gray-400 dark:text-storypad-dark-text-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Active Filters */}
        {(filters.chaptersRange.min > 0 || 
          filters.chaptersRange.max < maxChapters ||
          filters.selectedCategories.length > 0 ||
          filters.timeFilter !== 'all' ||
          filters.completion !== 'all') && (
          <div className="flex flex-wrap gap-2 mb-6 items-center justify-center">
            {filters.chaptersRange.min > 0 || filters.chaptersRange.max < maxChapters ? (
              <span className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full">
                {filters.chaptersRange.min}-{filters.chaptersRange.max} Chapters
              </span>
            ) : null}
            
            {filters.selectedCategories.map(cat => (
              <span key={cat} className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full">
                {cat}
              </span>
            ))}
            
            {filters.timeFilter !== 'all' && (
              <span className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full">
                {timeFilterOptions.find(opt => opt.value === filters.timeFilter)?.label}
              </span>
            )}
            
            {filters.completion !== 'all' && (
              <span className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full">
                {filters.completion === 'completed' ? 'Completed' : 'Ongoing'}
              </span>
            )}

            <button
              onClick={() => setFilters({
                chaptersRange: { min: 0, max: maxChapters },
                selectedCategories: [],
                timeFilter: 'all',
                completion: 'all'
              })}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 ml-2"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Results Count */}
        {searchQuery && (
          <div className="text-center mb-6">
            <p className="text-gray-600 dark:text-storypad-dark-text-light">
              Found {searchResults.length} {searchResults.length === 1 ? 'story' : 'stories'}
            </p>
          </div>
        )}

        {/* Content Layout - Stories and Filters */}
        <div className="flex gap-8">
          {/* Stories List - Left Side */}
          <div className="flex-1">
            <AnimatePresence>
              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : error ? (
                <div className="text-red-500 text-center py-12 bg-white dark:bg-storypad-dark-surface rounded-lg shadow-sm">
                  <div className="text-6xl mb-4">📚</div>
                  <h3 className="text-xl font-semibold mb-2 dark:text-storypad-dark-text">Oops! Something went wrong</h3>
                  <p className="dark:text-storypad-dark-text-light">{error}</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-storypad-dark-surface rounded-lg shadow-sm">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-storypad-dark-text mb-2">No stories found</h3>
                  <p className="text-gray-600 dark:text-storypad-dark-text-light">
                    {searchQuery ? `No stories match "${searchQuery}"` : 'No published stories available yet'}
                  </p>
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {searchResults.map((story) => (
                    <Link 
                      to={`/story/${story._id}`} 
                      key={story._id} 
                      className="block bg-white dark:bg-storypad-dark-surface rounded-lg shadow-md hover:shadow-xl transition-all duration-300"
                    >
                      <div className="flex p-4">
                        {/* Book Cover - Left Side */}
                        <div className="flex-shrink-0 w-48">
                          <div className="aspect-[3/4] relative rounded-lg overflow-hidden">
                            <img 
                              src={getImageWithFallback(story.cover)} 
                              alt={story.title} 
                              className="w-full h-full object-cover"
                              onError={handleImageError}
                            />
                            {/* Fallback Cover Design */}
                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 
                              flex flex-col justify-center items-center text-white p-4 text-center hidden">
                              <div className="text-sm font-bold mb-2 line-clamp-3">
                                {story.title.toUpperCase()}
                              </div>
                              <div className="text-xs opacity-80">
                                {story.author.username}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Book Details - Right Side */}
                        <div className="flex-grow ml-6 flex flex-col">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-xl font-bold text-gray-900 dark:text-storypad-dark-text hover:text-blue-600 dark:hover:text-storypad-dark-primary transition-colors">
                                {story.title}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-storypad-dark-text-light mt-1">
                                by {story.author.username}
                              </p>
                            </div>
                            
                            {/* Stats */}
                            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-storypad-dark-text-light">
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                {story.views || 0}
                              </div>
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                                {story.likes?.length || 0}
                              </div>
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                {story.chapters?.length || 0} chapters
                              </div>
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-gray-600 dark:text-storypad-dark-text-light mt-4 line-clamp-2">
                            {story.description}
                          </p>

                          {/* Categories */}
                          <div className="flex flex-wrap gap-2 mt-4">
                            {story.category.map((cat, idx) => (
                              <span 
                                key={idx}
                                className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full leading-none"
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Filters Panel - Right Side */}
          <div className="w-80 flex-shrink-0">
            <FiltersPanel
              filters={filters}
              setFilters={setFilters}
              allCategories={allCategories}
              maxChapters={maxChapters}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowsePage;