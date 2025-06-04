// FavoritesPage.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const FavoritesPage = () => {
  const [favorites, setFavorites] = useState([]);
  const username = localStorage.getItem("username");

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/users/${username}/favorites`);
        setFavorites(response.data);
      } catch (error) {
        console.error("Failed to load favorites", error);
      }
    };

    fetchFavorites();
  }, []);

  return (
    <div className="container-custom py-12">
      <h1 className="text-3xl font-bold text-storypad-dark mb-6">My Favorite Stories</h1>
      {favorites.length === 0 ? (
        <p className="text-storypad-text-light">No favorite stories yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((story) => (
            <Link to={`/stories/${story._id}`} key={story._id} className="card hover:shadow-lg transition-shadow">
              <img src={story.cover || "https://via.placeholder.com/150"} alt={story.title} className="w-full h-48 object-cover rounded-t-lg" />
              <div className="p-4">
                <h3 className="text-lg font-semibold text-storypad-dark">{story.title}</h3>
                <p className="text-sm text-storypad-text-light">by {story.authorName || "Unknown"}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
