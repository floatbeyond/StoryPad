import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import HorizontalScrollSection from '../components/HorizontalScrollSection';
import { handleImageError } from '../utils/imageUtils';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const HomePage = () => {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("token");
  const [stories, setStories] = useState([]);
  const [featuredStories, setFeaturedStories] = useState([]);
  const [popularStories, setPopularStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showOptions, setShowOptions] = useState(false);

  const handleStartWriting = () => {
    if (!isLoggedIn) {
      navigate("/signup");
    } else {
      setShowOptions(true);
    }
  };

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/stories/published`);
        const data = await response.json();

      if (data.success) {
if (data.success) {
  setStories(data.stories);

  // Featured: לפי תאריך (אם publishedAt קיים – נשתמש בו, אחרת נ fallback ל־createdAt)
  setFeaturedStories(
    [...data.stories]
      .sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt))
      .slice(0, 10)
  );

  // Popular: לפי מספר לייקים (אם likes זה מערך)
  setPopularStories(
    [...data.stories]
      .sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
      .slice(0, 10)
  );
}


        }
      } catch (err) {
        setError("Failed to load stories");
      } finally {
        setLoading(false);
      }
    };

    fetchStories();
  }, []);

  const categories = Array.from(new Set(stories.flatMap(s => s.category)));

  return (
    <div className="bg-storypad-background dark:bg-storypad-dark-bg transition-colors">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-storypad-primary to-storypad-dark dark:from-storypad-dark-primary dark:to-storypad-dark-bg text-white py-16">
        <div className="container-custom">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Discover Stories That Move You</h1>
          <p className="text-xl mb-6">
            StoryPad is the home for great stories and the people who write them. Join our community of storytellers.
          </p>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
            <button
              onClick={handleStartWriting}
              className="bg-storypad-accent dark:bg-storypad-dark-accent hover:bg-opacity-90 text-white px-6 py-3 rounded-lg font-medium text-center"
            >
              Start Writing
            </button>
            <Link to="/browse" className="bg-white dark:bg-storypad-dark-surface text-storypad-primary dark:text-storypad-dark-primary px-6 py-3 rounded-lg font-medium text-center">
              Start Reading
            </Link>
          </div>
          {showOptions && (
            <div className="mt-6 bg-white dark:bg-storypad-dark-surface rounded-lg shadow-lg p-6 flex flex-col space-y-4 text-storypad-dark dark:text-storypad-dark-text">
              <button className="btn-primary" onClick={() => navigate("/write")}>
                Start a new story
              </button>
              <button className="btn-secondary" onClick={() => navigate("/mystories")}>
                My stories
              </button>
              <button className="text-red-500 mt-2" onClick={() => setShowOptions(false)}>
                Close
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Loading/Error handler once at top */}
      {loading ? (
        <div className="text-center py-12 text-lg text-gray-500 dark:text-storypad-dark-text-light">Loading stories...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">{error}</div>
      ) : (
        <>
          {/* New Releases */}
          <section className="pt-6 pb-4">
            <div className="container-custom">
              <HorizontalScrollSection title="New Releases" stories={featuredStories} />
            </div>
          </section>

          {/* Popular Stories */}
          <section className="py-4">
            <div className="container-custom">
              <HorizontalScrollSection title="Popular Stories" stories={popularStories} />
            </div>
          </section>

          {/* Browse by Categories */}
          {Array.from(new Set(stories.flatMap(s => s.category))).map((category) => {
            const storiesInCategory = stories.filter(s => s.category?.includes(category));
            if (storiesInCategory.length === 0) return null;

            return (
              <section key={category} className="py-4">
                <div className="container-custom">
                  <HorizontalScrollSection
                    title={category}
                    stories={storiesInCategory}
                  />
                </div>
              </section>
            );
          })}
        </>
      )}

      {/* CTA */}
      <section className="py-12 bg-storypad-dark dark:bg-storypad-dark-surface text-white">
        <div className="container-custom text-center">
          <h2 className="text-3xl font-bold mb-4">Start Your Writing Journey Today</h2>
          <p className="text-xl mb-6 max-w-2xl mx-auto">
            Join StoryPad to share your stories with the world, connect with readers, and be part of a vibrant community of writers.
          </p>
          <Link to="/signup" className="bg-storypad-accent dark:bg-storypad-dark-accent text-white px-6 py-3 rounded-lg font-medium inline-block">
            Create Your Account
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;