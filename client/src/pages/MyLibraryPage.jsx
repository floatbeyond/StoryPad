import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const DEFAULT_COVER = 'https://res.cloudinary.com/dwtcfxtfp/image/upload/v1749068343/default-cover_xrc5et.png';

const MyLibraryPage = () => {
  const [readingProgress, setReadingProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReadingProgress = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/reading-progress`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('token');
            navigate('/login');
            return;
          }
          throw new Error('Failed to fetch reading progress');
        }

        const data = await response.json();
        if (data.success) {
          setReadingProgress(data.progress);
        }
      } catch (err) {
        console.error('Error fetching reading progress:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReadingProgress();
  }, [navigate]);

  const formatLastRead = (date) => {
    const now = new Date();
    const readDate = new Date(date);
    const diffTime = Math.abs(now - readDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return readDate.toLocaleDateString();
  };

  const getProgressPercentage = (progress) => {
    if (!progress.story || !progress.story.chapters) return 0;
    const publishedChapters = progress.story.chapters.filter(ch => ch.published);
    if (publishedChapters.length === 0) return 0;
    return Math.round(((progress.chapterIndex + 1) / publishedChapters.length) * 100);
  };

  const handleContinueReading = (progress) => {
    navigate(`/story/${progress.story._id}?chapter=${progress.currentChapter}&scroll=${progress.scrollPosition}`);
  };

  if (loading) {
    return (
      <div className="container-custom py-8">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Library</h1>
        <Link to="/browse" className="btn-primary">
          📚 Browse Stories
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {readingProgress.length === 0 ? (
        <div className="text-center py-12">
          <div className="mb-4">
            <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">No reading progress yet</h3>
          <p className="text-gray-600 mb-6">Start reading stories to build your personal library!</p>
          <Link to="/browse" className="btn-primary">
            Discover Stories
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {readingProgress.map((progress) => (
            <ReadingProgressCard 
              key={progress._id} 
              progress={progress} 
              onContinueReading={handleContinueReading}
              formatLastRead={formatLastRead}
              getProgressPercentage={getProgressPercentage}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ReadingProgressCard = ({ progress, onContinueReading, formatLastRead, getProgressPercentage }) => {
  const story = progress.story;
  const progressPercentage = getProgressPercentage(progress);
  const publishedChapters = story.chapters.filter(ch => ch.published);
  const currentChapterTitle = publishedChapters[progress.chapterIndex]?.title || 'Chapter';

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200">
      <div className="p-6">
        <div className="flex items-start space-x-4 mb-4">
          <div className="w-16 h-20 flex-shrink-0">
            <img
              src={story.cover || DEFAULT_COVER}
              alt={story.title}
              className="w-full h-full object-cover rounded"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 mb-1">
              {story.title}
            </h3>
            <p className="text-sm text-gray-600">
              by {story.author.username}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Reading Progress</span>
            <span>{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Last read: {currentChapterTitle}
          </p>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <span>{publishedChapters.length} chapters</span>
          <span>{formatLastRead(progress.lastReadAt)}</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onContinueReading(progress)}
            className="btn-primary flex-1 text-sm"
          >
            📖 Continue Reading
          </button>
          <Link
            to={`/story/${story._id}`}
            className="btn-secondary flex-1 text-sm text-center"
          >
            👁️ View Story
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MyLibraryPage;