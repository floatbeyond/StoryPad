import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BackButton from '../components/BackButton';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const FavoritesPage = () => {
  const [favorites, setFavorites] = useState([]);
  const username = localStorage.getItem("username");

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error("No token found");
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/users/${username}/favorites`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch favorites');
        }

        const data = await response.json();
        setFavorites(data);
      } catch (error) {
        console.error("Failed to load favorites", error);
      }
    };

    fetchFavorites();
  }, [username]);

 return (
  <div className="container-custom py-12">
    {/* שורת כותרת + BackButton */}
    <div className="flex items-center justify-between mb-6 px-4">
      <BackButton />
      <h1 className="text-3xl font-bold text-center flex-1 text-storypad-dark">My Favorite Stories</h1>
      <div className="w-24">{/* רווח לימין כדי לאזן */}</div>
    </div>

    {favorites.length === 0 ? (
      <div className="flex justify-center px-4">
        <p className="text-storypad-text-light text-center">No favorite stories yet.</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
        {favorites.map((story) => (
          <Link
            to={`/stories/${story._id}`}
            key={story._id}
            className="card hover:shadow-lg transition-shadow"
          >
            <img
              src={story.cover || "https://via.placeholder.com/150"}
              alt={story.title}
              className="w-full h-48 object-cover rounded-t-lg"
            />
            <div className="p-4">
              <h3 className="text-lg font-semibold text-storypad-dark">{story.title}</h3>
              <p className="text-sm text-storypad-text-light">
                by {story.authorName || "Unknown"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    )}
  </div>
);

};

export default FavoritesPage;