import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import BackButton from '../components/BackButton';
import CoverSelector from '../components/CoverSelector';
import { handleImageError } from '../utils/imageUtils';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const categories = [
  "Fantasy", "Romance", "Science Fiction", "Mystery", 
  "Horror", "Adventure", "Historical", "Poetry", 
  "Classic Literature", "Dystopian", "Cyberpunk", "Thriller",
];

const languages = [
  "עברית", "English", "Español", "Français", "Русский", "العربية"
];

const DEFAULT_COVER = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/default-cover.png`;

const NewWritePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams(); 
  
  // Initialize state from URL params
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef(null);
  const [coverImage, setCoverImage] = useState(DEFAULT_COVER);
  const [imageFile, setImageFile] = useState(null);
  const [showCoverSelector, setShowCoverSelector] = useState(false);

  // useEffect to populate form from URL params
  useEffect(() => {
    const title = searchParams.get('title');
    const description = searchParams.get('description');
    const language = searchParams.get('language');
    
    if (formRef.current) {
      if (title) formRef.current.title.value = title;
      if (description) formRef.current.description.value = description;
      if (language) formRef.current.language.value = decodeURIComponent(language);
    }
  }, [searchParams]);

  const handleCategoryChange = (category) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(cat => cat !== category)
        : [...prev, category]
    );
  };

  // Update handleImageChange to preserve form state
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result);
      };
      reader.readAsDataURL(file);
      setShowCoverSelector(false); // Close selector after upload
    }
  };

  //Fix the handleCoverSelect to prevent form reset
  const handleCoverSelect = (coverUrl) => {
    console.log('🔍 Before cover select:', {
      title: formRef.current?.title?.value,
      description: formRef.current?.description?.value,
      coverImage: coverImage
    });
    
    setCoverImage(coverUrl);
    setImageFile(null);
    setShowCoverSelector(false); // ← This state change might be causing re-render
    
    console.log('🔍 After cover select:', {
      title: formRef.current?.title?.value,
      description: formRef.current?.description?.value,
      coverImage: coverUrl
    });
  };

  // Add form validation before creating story
  const handleCreateStory = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError("You must be logged in to create a story");
        navigate('/login');
        return;
      }

      const formData = new FormData();
      const form = formRef.current;

      // Validate form fields
      if (!form.title.value || !form.description.value || !form.language.value || selectedCategories.length === 0) {
        setError("Please fill in all fields and select at least one category.");
        setIsLoading(false);
        return;
      }

      formData.append('title', form.title.value);
      formData.append('description', form.description.value);
      formData.append('language', form.language.value);
      formData.append('category', JSON.stringify(selectedCategories));

      // Handle cover image properly
      if (imageFile) {
        // User uploaded a custom image
        formData.append('cover', imageFile);
      } else if (coverImage !== DEFAULT_COVER) {
        // User selected a predefined cover
        formData.append('coverUrl', coverImage);
      }

      const response = await fetch(`${API_BASE_URL}/api/stories`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.status === 401) {
        setError("Session expired. Please log in again.");
        navigate('/login');
        return;
      }

      const result = await response.json();

      if (response.ok) {
        setSuccess("Story created successfully!");
        setTimeout(() => navigate(`/story/${result.story._id}/edit`), 500); // ✅ Use new edit route
      } else {
        throw new Error(result.message || "Failed to create story");
      }
    } catch (err) {
      console.error('Creation error:', err);
      if (err.message === "Failed to fetch") {
        setError("Cannot connect to server. Is the server running?");
      } else {
        setError(err.message || "An error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container-custom py-12 bg-gray-50 dark:bg-storypad-dark-bg min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-4">
        <BackButton />
        <h1 className="text-3xl font-bold text-center flex-1 text-storypad-dark dark:text-storypad-dark-text">
          Start Writing Your Story
        </h1>
        <div className="w-24" />
      </div>

      <div className="max-w-2xl mx-auto bg-white dark:bg-storypad-dark-surface rounded-lg shadow-md p-8">
        <form className="space-y-6" ref={formRef}>
          <div>
            <label className="block text-sm font-medium text-storypad-dark dark:text-storypad-dark-text mb-2">
              Cover Image
            </label>
            
            {/* Current Cover Display */}
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-32 h-40 relative border dark:border-gray-600 rounded overflow-hidden shadow-md">
                <img
                  src={coverImage}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                />
              </div>
              <div className="flex-1">
                <button
                  type="button"
                  onClick={() => setShowCoverSelector(!showCoverSelector)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  {showCoverSelector ? 'Close Cover Selector' : 'Change Cover'}
                </button>
                <p className="text-xs text-gray-500 dark:text-storypad-dark-text-light mt-2">
                  Choose from our library or upload your own
                </p>
              </div>
            </div>

            {/* Cover Selector */}
            <div className={`border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-storypad-dark-bg transition-all ${
                showCoverSelector ? 'block' : 'hidden'
              }`}>
              <CoverSelector
                currentCover={coverImage}
                onCoverSelect={handleCoverSelect}
                onUpload={handleImageChange}
                storyCategories={selectedCategories}
              />
            </div>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-storypad-dark dark:text-storypad-dark-text">
              Story Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              className="input w-full mt-1 bg-white dark:bg-storypad-dark-bg text-gray-900 dark:text-storypad-dark-text border-gray-300 dark:border-gray-600"
              placeholder="Enter your story title"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-storypad-dark dark:text-storypad-dark-text">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows="4"
              required
              className="input w-full mt-1 bg-white dark:bg-storypad-dark-bg text-gray-900 dark:text-storypad-dark-text border-gray-300 dark:border-gray-600"
              placeholder="Write a brief description of your story"
            />
          </div>

          <div>
            <label htmlFor="language" className="block text-sm font-medium text-storypad-dark dark:text-storypad-dark-text mb-2">
              Language
            </label>
            <select
              id="language"
              name="language"
              required
              className="input w-full mt-1 bg-white dark:bg-storypad-dark-bg text-gray-900 dark:text-storypad-dark-text border-gray-300 dark:border-gray-600"
            >
              <option value="">Select a language</option>
              {languages.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-storypad-dark dark:text-storypad-dark-text mb-3">
              Categories
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {categories.map((category) => (
                <label 
                  key={category} 
                  className={`flex items-center space-x-2 p-2 border dark:border-gray-600 rounded cursor-pointer transition-colors
                    ${selectedCategories.includes(category) 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category)}
                    onChange={() => handleCategoryChange(category)}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm dark:text-storypad-dark-text">{category}</span>
                </label>
              ))}
            </div>
            {selectedCategories.length > 0 && (
              <p className="mt-2 text-sm text-gray-600 dark:text-storypad-dark-text-light">
                selected: {selectedCategories.join(', ')}
              </p>
            )}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-500 text-sm">{success}</p>}

          <button
            type="button"
            className={`btn-primary w-full py-3 ${isLoading ? 'opacity-50' : ''}`}
            onClick={handleCreateStory}
            disabled={isLoading}
          >
            {isLoading ? "Creating..." : "Create Story"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NewWritePage;
