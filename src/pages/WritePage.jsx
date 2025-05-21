import { useState } from "react";

const WritePage = () => {
  const [chapters, setChapters] = useState([
    { title: "", content: "" }
  ]);

  const handleChapterChange = (idx, field, value) => {
    const updated = chapters.map((ch, i) =>
      i === idx ? { ...ch, [field]: value } : ch
    );
    setChapters(updated);
  };

  const addChapter = () => {
    setChapters([...chapters, { title: "", content: "" }]);
  };

  const handleSave = () => {
    // כאן אפשר להוסיף לוגיקה לשמירה
    alert("Story saved!");
  };

  const handlePublish = () => {
    // כאן אפשר להוסיף לוגיקה לפרסום
    alert("Story published!");
  };

  return (
    <div className="container-custom py-12">
      <h1 className="text-3xl font-bold text-storypad-dark mb-6">Write Your Story</h1>
      {chapters.map((chapter, idx) => (
        <div key={idx} className="mb-8 p-4 bg-white rounded-lg shadow">
          <label className="block text-sm font-medium text-storypad-dark mb-2">
            Chapter Title
            <input
              type="text"
              className="input w-full mt-1"
              placeholder={`Enter chapter ${idx + 1} title`}
              value={chapter.title}
              onChange={e => handleChapterChange(idx, "title", e.target.value)}
            />
          </label>
          <textarea
            className="input w-full mt-3"
            rows={8}
            placeholder={`Write chapter ${idx + 1} content...`}
            value={chapter.content}
            onChange={e => handleChapterChange(idx, "content", e.target.value)}
          />
        </div>
      ))}
      <button
        type="button"
        className="btn-secondary mb-6"
        onClick={addChapter}
      >
        Add Chapter
      </button>
      <div className="flex gap-4">
        <button
          type="button"
          className="btn-primary"
          onClick={handleSave}
        >
          Save
        </button>
        <button
          type="button"
          className="btn-accent"
          onClick={handlePublish}
        >
          Publish
        </button>
      </div>
    </div>
  );
};

export default WritePage;