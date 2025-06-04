import { useNavigate } from "react-router-dom";
import { useState, useRef } from "react";

// Available categories for stories
const categories = [
  "Fantasy", "Romance", "Science Fiction", "Mystery", 
  "Horror", "Adventure", "Historical", "Poetry"
];

// Supported languages for stories
const languages = [
  "עברית", "English", "Español", "Français", "Русский", "العربية"
];

const DEFAULT_COVER = 'https://res.cloudinary.com/dwtcfxtfp/image/upload/v1749068343/default-cover_xrc5et.png';

const NewWritePage = () => {
  const navigate = useNavigate();
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef(null);
  const [coverImage, setCoverImage] = useState(DEFAULT_COVER);
  const [imageFile, setImageFile] = useState(null);

  // Handle category selection
  const handleCategoryChange = (category) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(cat => cat !== category) // Remove category if already selected
        : [...prev, category] // Add category if not selected
    );
  };

  // Handle image file selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form submission and story creation
  const handleCreateStory = async (e) => {
  e.preventDefault();
  setError(null);
  setSuccess(null);
  setIsLoading(true);

  try {
    const token = localStorage.getItem('token');
    console.log('Token from localStorage:', token); // DEBUG

    if (!token) {
      setError("You must be logged in to create a story");
      navigate('/login');
      return;
    }

    const formData = new FormData();
    const form = formRef.current;

    formData.append('title', form.title.value);
    formData.append('description', form.description.value);
    formData.append('language', form.language.value);
    formData.append('category', JSON.stringify(selectedCategories));

    if (imageFile) {
      formData.append('cover', imageFile);
    }

    // Validate required fields
    if (!form.title.value || !form.description.value || !form.language.value || selectedCategories.length === 0) {
      setError("Please fill in all fields and select at least one category.");
      setIsLoading(false);
      return;
    }

    const response = await fetch("http://localhost:5000/api/stories", {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${token}`  // שים לב לפורמט המדויק
      },
      body: formData
    });

    if (response.status === 401) {
      setError("Session expired. Please log in again.");
      // Optional: Redirect to login
      navigate('/login');
      return;
    }

    const result = await response.json();

    if (response.ok) {
      setSuccess("Story created successfully!");
      setTimeout(() => navigate(`/write/${result.story._id}`), 500);
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
    <div className="container-custom py-12">
      <h1 className="text-3xl font-bold text-storypad-dark mb-6">
        Start Writing Your Story
      </h1>
      <form className="space-y-6" ref={formRef}>
        {/* Add this new image upload section */}
      <div>
        <label className="block text-sm font-medium text-storypad-dark mb-2">
          Cover Image
        </label>
        <div className="mt-1 flex items-center space-x-4">
          <div className="w-32 h-32 relative border rounded overflow-hidden">
            <img
              src={coverImage}
              alt="Cover preview"
              className="w-full h-full object-cover"
            />
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0
              file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>
      </div>
        {/* Form Fields */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-storypad-dark">
            Story Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            className="input w-full mt-1"
            placeholder="Enter your story title"
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-storypad-dark">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows="4"
            required
            className="input w-full mt-1"
            placeholder="Write a brief description of your story"
          />
        </div>
    <div>
      <label htmlFor="language" className="block text-sm font-medium text-storypad-dark mb-2">
        Language
      </label>
      <select
        id="language"
        name="language"
        required
        className="input w-full mt-1"
      >
        <option value="">Select a language</option>
        {languages.map((lang) => (
          <option key={lang} value={lang}>
            {lang}
          </option>
        ))}
      </select>
    </div>
       <div>
          <label className="block text-sm font-medium text-storypad-dark mb-2">
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {categories.map((category) => (
              <label 
                key={category} 
                className={`flex items-center space-x-2 p-2 border rounded cursor-pointer
                  ${selectedCategories.includes(category) 
                    ? 'bg-blue-50 border-blue-300' 
                    : 'hover:bg-gray-50'
                  }`}
              >
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(category)}
                  onChange={() => handleCategoryChange(category)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">{category}</span>
              </label>
            ))}
          </div>
          {selectedCategories.length > 0 && (
            <p className="mt-2 text-sm text-gray-600">
              selected: {selectedCategories.join(', ')}
            </p>
          )}
        </div>

        {/* Error and Success Messages */}
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
  );
};

export default NewWritePage;