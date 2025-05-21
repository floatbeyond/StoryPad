import { useNavigate } from "react-router-dom";
import { useState, useRef } from "react";

const categories = [
  "Fantasy", "Romance", "Science Fiction", "Mystery", "Horror", "Adventure", "Historical", "Poetry"
];
const languages = [
  "עברית", "English", "Español", "Français", "Русский", "العربية"
];

const NewWritePage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const formRef = useRef(null);

  const handleSkipAndSave = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // קבלת ערכים מהטופס דרך ה-ref
    const form = formRef.current;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    if (!data.title || !data.description || !data.category || !data.language) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/stories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess("Story created successfully!");
        setTimeout(() => navigate("/write"), 500);
      } else {
        setError(result.message || "Failed to create story");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    }
  };

  return (
    <div className="container-custom py-12">
      <h1 className="text-3xl font-bold text-storypad-dark mb-6">Start Writing Your Story</h1>
      <form className="space-y-6" ref={formRef}>
        {/* ...שדות הטופס... */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-storypad-dark">Story Title</label>
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
          <label htmlFor="description" className="block text-sm font-medium text-storypad-dark">Description</label>
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
          <label htmlFor="category" className="block text-sm font-medium text-storypad-dark">Category</label>
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
          <label htmlFor="language" className="block text-sm font-medium text-storypad-dark">Language</label>
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

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-500 text-sm">{success}</p>}

        <button
          type="button"
          className="btn-primary w-full py-3"
          onClick={handleSkipAndSave}
        >
          Skip
        </button>
      </form>
    </div>
  );
};

export default NewWritePage;