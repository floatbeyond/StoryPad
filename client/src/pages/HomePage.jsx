import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const FeaturedStory = ({ title, author, cover, tags, likes, reads }) => (
  <div className="card hover:shadow-lg transition-shadow">
    <div className="relative">
      <img src={cover} alt={title} className="w-full h-48 object-cover rounded-t-lg" />
      <div className="absolute bottom-2 left-2 flex space-x-1">
        {tags.map((tag) => (
          <span key={tag} className="bg-storypad-accent/80 text-white text-xs px-2 py-1 rounded-full">
            {tag}
          </span>
        ))}
      </div>
    </div>
    <div className="p-4">
      <h3 className="text-lg font-semibold text-storypad-dark mb-1">{title}</h3>
      <p className="text-storypad-text-light text-sm mb-3">by {author}</p>
      <div className="flex justify-between text-xs text-storypad-text-light">
        <span className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
          {likes.toLocaleString()}
        </span>
        <span className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
          {reads.toLocaleString()}
        </span>
      </div>
    </div>
  </div>
);

const StoryCard = ({ title, author, cover, description, likes, reads }) => (
  <div className="card flex flex-col md:flex-row overflow-hidden hover:shadow-lg transition-shadow">
    <img src={cover} alt={title} className="w-full md:w-32 h-48 md:h-auto object-cover" />
    <div className="p-4 flex-grow">
      <h3 className="text-lg font-semibold text-storypad-dark mb-1">{title}</h3>
      <p className="text-storypad-text-light text-sm mb-2">by {author}</p>
      <p className="text-storypad-text text-sm mb-3 line-clamp-2">{description}</p>
      <div className="flex justify-between text-xs text-storypad-text-light">
        <span className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
          {likes.toLocaleString()}
        </span>
        <span className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
          {reads.toLocaleString()}
        </span>
      </div>
    </div>
  </div>
);

const HomePage = () => {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("token"); // Check if user is logged in
  const [showOptions, setShowOptions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stories, setStories] = useState([]);

  const handleStartWriting = () => {
    if (!isLoggedIn) {
      navigate("/signup");
    } else {
      setShowOptions(true);
    }
  };

  useEffect(() => {
    const fetchPublishedStories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/stories/published`);
        const data = await response.json();
        
        if (data.success) {
          setStories(data.stories);
          setFeaturedStories(
            data.stories
              .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
              .slice(0, 4)
          );
          setPopularStories(
            data.stories
              .sort((a, b) => b.views - a.views)
              .slice(0, 3)
          );
        }
      } catch (err) {
        console.error('Error fetching stories:', err);
        setError('Failed to load stories');
      } finally {
        setLoading(false);
      }
    };

    fetchPublishedStories();
  }, []);

  // Dummy data for featured stories
  const featuredStories = [
    {
      id: 1,
      title: "The Midnight Traveler",
      author: "Alex Johnson",
      cover: "https://images.unsplash.com/photo-1518281580396-7d6ac06ba879?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
      tags: ["Fantasy", "Adventure"],
      likes: 1234,
      reads: 45678
    },
    {
      id: 2,
      title: "Echoes of Tomorrow",
      author: "Morgan Winters",
      cover: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
      tags: ["Sci-Fi", "Mystery"],
      likes: 3456,
      reads: 67890
    },
    {
      id: 3,
      title: "The Last Letter",
      author: "Samantha Grey",
      cover: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
      tags: ["Romance", "Drama"],
      likes: 5678,
      reads: 23456
    },
    {
      id: 4,
      title: "Shadow's Edge",
      author: "Daniel Black",
      cover: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
      tags: ["Thriller", "Horror"],
      likes: 7890,
      reads: 34567
    }
  ];

  // Dummy data for popular stories
  const popularStories = [
    {
      id: 1,
      title: "Beyond the Stars",
      author: "Elisa James",
      cover: "https://images.unsplash.com/photo-1608178398319-48f814d0750c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
      description: "A journey through the cosmos reveals the mysteries of life and the connections that bind us all.",
      likes: 12345,
      reads: 98765
    },
    {
      id: 2,
      title: "Whispers in the Dark",
      author: "Marcus Lee",
      cover: "https://images.unsplash.com/photo-1505970572189-1e290e7b849c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
      description: "When strange whispers begin to haunt Sarah at night, she discovers a world hidden beneath our own.",
      likes: 8765,
      reads: 54321
    },
    {
      id: 3,
      title: "Summer of '99",
      author: "Jamie Wilson",
      cover: "https://images.unsplash.com/photo-1473186578172-c141e6798cf4?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
      description: "A coming-of-age story about friendship, love, and the summer that changed everything.",
      likes: 6543,
      reads: 76543
    }
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-storypad-primary to-storypad-dark text-white py-16">
        <div className="container-custom">
          <div className="max-w-2xl">
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Discover Stories That Move You</h1>
            <p className="text-xl mb-6">
              StoryPad is the home for great stories and the people who write them. Join our community of storytellers.
            </p>
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              <button
                onClick={handleStartWriting}
                className="bg-storypad-accent hover:bg-opacity-90 text-white px-6 py-3 rounded-lg font-medium text-center"
              >
                Start Writing
              </button>
              <Link to="/browse" className="bg-white hover:bg-opacity-90 text-storypad-primary px-6 py-3 rounded-lg font-medium text-center">
                Start Reading
              </Link>
            </div>            
            {/* Modal קטן עם שתי אפשרויות */}
            {showOptions && (
              <div className="mt-6 bg-white rounded-lg shadow-lg p-6 flex flex-col space-y-4 text-storypad-dark">
                <button className="btn-primary" onClick={() => navigate("/newWrite")}>
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
        </div>
      </section>

      {/* Featured Stories Section */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-storypad-dark">Featured Stories</h2>
            <Link to="/browse" className="text-storypad-primary hover:underline text-sm font-medium">
              View All →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              <div className="col-span-full text-center py-8">Loading stories...</div>
            ) : error ? (
              <div className="col-span-full text-red-500 text-center py-8">{error}</div>
            ) : (
              featuredStories.map((story) => (
                <Link to={`/story/${story.id}`} key={story.id}>
                  <FeaturedStory {...story} />
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12 bg-storypad-light">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-storypad-dark mb-6">Browse by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from(new Set(stories.flatMap(s => s.category))).map((category) => (
              <Link
                to={`/categories/${category.toLowerCase().replace(' ', '-')}`}
                key={category}
                className="bg-white border border-gray-200 rounded-lg px-4 py-8 text-center hover:shadow-md transition-shadow"
              >
                <span className="text-lg font-medium text-storypad-dark">{category}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Stories Section */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-storypad-dark">Popular Stories</h2>
            <Link to="/popular" className="text-storypad-primary hover:underline text-sm font-medium">
              View All →
            </Link>
          </div>
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-8">Loading stories...</div>
            ) : error ? (
              <div className="text-red-500 text-center py-8">{error}</div>
            ) : (
              popularStories.map((story) => (
                <Link to={`/story/${story.id}`} key={story.id}>
                  <StoryCard {...story} />
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-12 bg-storypad-dark text-white">
        <div className="container-custom text-center">
          <h2 className="text-3xl font-bold mb-4">Start Your Writing Journey Today</h2>
          <p className="text-xl mb-6 max-w-2xl mx-auto">
            Join StoryPad to share your stories with the world, connect with readers, and be part of a vibrant community of writers.
          </p>
          <Link to="/signup" className="bg-storypad-accent hover:bg-opacity-90 text-white px-6 py-3 rounded-lg font-medium inline-block">
            Create Your Account
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
