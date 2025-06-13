import { Link } from "react-router-dom";
import { useEffect } from "react";

const HorizontalScrollSection = ({ title, stories }) => {
  // הדפסת הנתונים לבדיקה ב־Console
  useEffect(() => {
    console.log(`📦 HorizontalScrollSection (${title}) stories:`, stories);
  }, [stories, title]);

  // אם אין סיפורים בכלל
  if (!stories || stories.length === 0) return null;

  return (
    <section className="py-10">
      <div className="container-custom">
        <h2 className="text-2xl font-bold text-storypad-dark mb-4">{title}</h2>
        <div className="flex space-x-4 overflow-x-auto scrollbar-hide pb-2">
          {stories.map((story) => (
            <Link
              key={story._id || story.id} // ✅ key בטוח
              to={`/story/${story._id || story.id}`}
              className="min-w-[200px] max-w-[200px] bg-white rounded shadow hover:shadow-lg transition-shadow"
            >
              <img
                src={story.cover || "https://via.placeholder.com/200x160?text=No+Cover"}
                alt={story.title || "Untitled"}
                className="w-full h-40 object-cover rounded-t"
              />
              <div className="p-3">
                <h3 className="font-semibold text-storypad-dark truncate">
                  {story.title || "Untitled"}
                </h3>
                <p className="text-sm text-storypad-text-light truncate">
                  by {
                    typeof story.author === 'string'
                      ? "Author"
                      : story.author?.username || story.author?.firstName || "Unknown"
                  }
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HorizontalScrollSection;
