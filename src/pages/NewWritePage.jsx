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

const NewWritePage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef(null);

  // Handle form submission and story creation
  const handleCreateStory = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      // Check if server is available
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const serverCheck = await fetch(API_URL);
      if (!serverCheck.ok) {
        throw new Error("Server is not responding");
      }

      // Get form data
      const form = formRef.current;
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      console.log('Attempting to create story:', data);

      // Validate required fields
      if (!data.title || !data.description || !data.category || !data.language) {
        setError("Please fill in all fields.");
        return;
      }

      // Send POST request to create story
      const response = await fetch(`${API_URL}/api/stories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          // Add this line if you have authentication
          ...(localStorage.getItem('token') && { 
            Authorization: `Bearer ${localStorage.getItem('token')}` 
          })
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      console.log('Server response:', response);

      const result = await response.json();
      console.log('Full result:', result); // Add this debug line

      if (response.ok) {
        setSuccess("Story created successfully!");
        console.log('Story ID:', result.story?._id); // Add this debug line
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
          <label htmlFor="category" className="block text-sm font-medium text-storypad-dark">
            Category
          </label>
          <select
            id="category"
            name="category"
            required
            className="input w-full mt-1"
            defaultValue=""
          >
            <option value="" disabled>Choose a category</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="language" className="block text-sm font-medium text-storypad-dark">
            Language
          </label>
          <select
            id="language"
            name="language"
            required
            className="input w-full mt-1"
            defaultValue=""
          >
            <option value="" disabled>Choose a language</option>
            {languages.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
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