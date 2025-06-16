import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

const HorizontalScrollSection = ({ title, stories }) => {
  const scrollContainerRef = useRef(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);
  const [showScrollbar, setShowScrollbar] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    console.log(`📦 HorizontalScrollSection (${title}) stories:`, stories);
  }, [stories, title]);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate scroll dimensions
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const updateScrollInfo = () => {
        const maxScrollLeft = container.scrollWidth - container.clientWidth;
        setMaxScroll(maxScrollLeft);
        setShowScrollbar(maxScrollLeft > 0);
      };

      updateScrollInfo();
      window.addEventListener('resize', updateScrollInfo);
      return () => window.removeEventListener('resize', updateScrollInfo);
    }
  }, [stories]);

  // Handle scroll position tracking
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setScrollPosition(container.scrollLeft);
    }
  };

  // Scroll navigation functions (desktop only)
  const scrollLeft = () => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollBy({ left: -240, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollBy({ left: 240, behavior: 'smooth' });
    }
  };

  if (!stories || stories.length === 0) return null;

  const scrollPercentage = maxScroll > 0 ? (scrollPosition / maxScroll) * 100 : 0;

  return (
    <section className="py-10">
      <div className="container-custom">
        {/* Header with title and navigation (desktop arrows) */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-storypad-dark dark:text-storypad-dark-text">{title}</h2>
          
          {/* Navigation arrows - desktop only */}
          {showScrollbar && !isMobile && (
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={scrollLeft}
                disabled={scrollPosition <= 0}
                className={`p-2 rounded-full border-2 transition-all ${
                  scrollPosition <= 0
                    ? 'border-gray-200 dark:border-gray-600 text-gray-300 dark:text-gray-500 cursor-not-allowed'
                    : 'border-blue-500 dark:border-storypad-dark-primary text-blue-500 dark:text-storypad-dark-primary hover:bg-blue-50 dark:hover:bg-gray-700'
                }`}
                aria-label="Scroll left"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <button
                onClick={scrollRight}
                disabled={scrollPosition >= maxScroll}
                className={`p-2 rounded-full border-2 transition-all ${
                  scrollPosition >= maxScroll
                    ? 'border-gray-200 dark:border-gray-600 text-gray-300 dark:text-gray-500 cursor-not-allowed'
                    : 'border-blue-500 dark:border-storypad-dark-primary text-blue-500 dark:text-storypad-dark-primary hover:bg-blue-50 dark:hover:bg-gray-700'
                }`}
                aria-label="Scroll right"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Mobile scrollbar indicator text */}
        {isMobile && showScrollbar && (
          <div className="md:hidden mb-2">
            <p className="text-sm text-gray-500 dark:text-storypad-dark-text-light flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l4-4m0 0l4-4m-4 4H3m18 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Swipe to see more stories
            </p>
          </div>
        )}

        {/* Scrollable container */}
        <div className="relative">
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className={`flex space-x-4 overflow-x-auto pb-2 scroll-smooth ${
              isMobile 
                ? 'scrollbar-custom' // Show custom scrollbar on mobile
                : 'scrollbar-hide'   // Hide scrollbar on desktop
            }`}
            style={!isMobile ? { scrollbarWidth: 'none', msOverflowStyle: 'none' } : {}}
          >
            {stories.map((story) => (
              <Link
                key={story._id || story.id}
                to={`/story/${story._id || story.id}`}
                className="min-w-[180px] max-w-[180px] md:min-w-[200px] md:max-w-[200px] bg-white dark:bg-storypad-dark-surface rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="relative overflow-hidden rounded-t-lg">
                  <img
                    src={story.cover || "https://via.placeholder.com/200x280?text=No+Cover"}
                    alt={story.title || "Untitled"}
                    className="w-full h-48 md:h-56 object-cover transition-transform duration-300 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
                
                <div className="p-3">
                  <h3 className="font-semibold text-storypad-dark dark:text-storypad-dark-text truncate mb-1 text-sm md:text-base">
                    {story.title || "Untitled"}
                  </h3>
                  <p className="text-xs md:text-sm text-storypad-text-light dark:text-storypad-dark-text-light truncate">
                    by {
                      typeof story.author === 'string'
                        ? "Author"
                        : story.author?.username || story.author?.firstName || "Unknown"
                    }
                  </p>
                  
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{story.chapters?.length || 0} ch</span>
                    <span>{story.views || 0} views</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop progress indicator */}
          {showScrollbar && !isMobile && (
            <div className="hidden md:block mt-4">
              <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 dark:from-storypad-dark-primary dark:to-storypad-dark-accent rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(100, Math.max(20, scrollPercentage + 20))}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>Scroll to explore more</span>
                <span>{Math.round(scrollPercentage)}% viewed</span>
              </div>
            </div>
          )}

          {/* Mobile progress indicator - simpler */}
          {showScrollbar && isMobile && (
            <div className="md:hidden mt-3">
              <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 dark:bg-storypad-dark-primary rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(10, scrollPercentage + 10)}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HorizontalScrollSection;
