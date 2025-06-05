import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const StoryPage = () => {
  const { id } = useParams();
  const [story, setStory] = useState(null);
  const [currentChapter, setCurrentChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchStory = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/stories/${id}`);
        
        if (!response.ok) {
          throw new Error('Story not found');
        }

        const data = await response.json();
        if (data.success) {
          setStory(data.story);
          // Set first published chapter as current
          const publishedChapters = data.story.chapters.filter(ch => ch.published);
          if (publishedChapters.length > 0) {
            setCurrentChapter(publishedChapters[0]);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStory();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading story...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Story Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link to="/browse" className="btn-primary">
            ← Back to Browse
          </Link>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Story Not Found</h1>
          <Link to="/browse" className="btn-primary">
            ← Back to Browse
          </Link>
        </div>
      </div>
    );
  }

  const publishedChapters = story.chapters.filter(ch => ch.published);

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      {/* Story Header */}
      <div className="relative">
        <div className="h-80 w-full overflow-hidden">
          <img
            src={story.cover}
            alt={story.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        </div>

        <div className="container-custom relative -mt-40 z-10 pb-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/3 lg:w-1/4">
              <div className="bg-white rounded-lg overflow-hidden shadow-lg">
                <img
                  src={story.cover}
                  alt={story.title}
                  className="w-full h-64 object-cover"
                />
              </div>
            </div>

            <div className="w-full md:w-2/3 lg:w-3/4 text-white">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{story.title}</h1>

              <div className="flex items-center mb-4">
                <div>
                  <span className="block font-medium">by {story.author.username}</span>
                  <span className="text-sm opacity-80">
                    {story.chapters.length} chapters • {publishedChapters.length} published
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {story.category.map((tag) => (
                  <span
                    key={tag}
                    className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <p className="mb-4 text-gray-200">{story.description}</p>

              <div className="flex space-x-4 text-sm">
                <div className="flex items-center">
                  <span className="mr-1">👁️</span>
                  {story.views || 0} Views
                </div>
                <div className="flex items-center">
                  <span className="mr-1">🌐</span>
                  {story.language}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Story Content */}
      {publishedChapters.length > 0 ? (
        <div className="container-custom mt-6">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Chapter List */}
            <div className="w-full lg:w-1/4">
              <div className="bg-white rounded-lg shadow-md p-4 sticky top-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Published Chapters</h3>

                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {publishedChapters.map((chapter, index) => (
                    <button
                      key={chapter._id}
                      onClick={() => setCurrentChapter(chapter)}
                      className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                        currentChapter?._id === chapter._id
                          ? 'bg-blue-600 text-white'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {index + 1}. {chapter.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Reading Area */}
            <div className="w-full lg:w-3/4">
              {currentChapter ? (
                <div className="bg-white rounded-lg shadow-md p-6 lg:p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    {currentChapter.title}
                  </h2>

                  <div className="prose max-w-none">
                    <div 
                      className="text-gray-700 leading-relaxed"
                      style={{ whiteSpace: 'pre-line' }}
                    >
                      {currentChapter.content}
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="mt-8 flex justify-between">
                    <button
                      onClick={() => {
                        const currentIndex = publishedChapters.findIndex(ch => ch._id === currentChapter._id);
                        if (currentIndex > 0) {
                          setCurrentChapter(publishedChapters[currentIndex - 1]);
                        }
                      }}
                      disabled={publishedChapters.findIndex(ch => ch._id === currentChapter._id) === 0}
                      className={`px-4 py-2 rounded-md ${
                        publishedChapters.findIndex(ch => ch._id === currentChapter._id) === 0
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      Previous Chapter
                    </button>

                    <button
                      onClick={() => {
                        const currentIndex = publishedChapters.findIndex(ch => ch._id === currentChapter._id);
                        if (currentIndex < publishedChapters.length - 1) {
                          setCurrentChapter(publishedChapters[currentIndex + 1]);
                        }
                      }}
                      disabled={publishedChapters.findIndex(ch => ch._id === currentChapter._id) === publishedChapters.length - 1}
                      className={`px-4 py-2 rounded-md ${
                        publishedChapters.findIndex(ch => ch._id === currentChapter._id) === publishedChapters.length - 1
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      Next Chapter
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-md p-6 text-center">
                  <p className="text-gray-600">Select a chapter to start reading</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="container-custom mt-6">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Published Chapters</h3>
            <p className="text-gray-600">This story hasn't published any chapters yet.</p>
            <Link to="/browse" className="btn-primary mt-4 inline-block">
              ← Back to Browse
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryPage;