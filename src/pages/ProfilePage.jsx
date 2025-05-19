import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const ProfilePage = () => {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // כאן אתה יכול למשוך נתונים מהשרת לפי ה-username השמור בלוקל סטורג'
    const username = localStorage.getItem("username");
    if (username) {
      // סימולציה לנתונים
      setUserData({
        username,
        fullName: "Alex Johnson",
        email: "alex@example.com",
        bio: "Fantasy and sci-fi writer. Dreaming across timelines. 📚✨",
        profileImage:
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&auto=format&fit=crop&w=120&q=80",
        joined: "2023-08-01",
        storiesCount: 4,
        followers: 198,
        likes: 4235,
      });
    }
  }, []);

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-storypad-background text-white">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-storypad-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <img
            src={userData.profileImage}
            alt={userData.fullName}
            className="w-32 h-32 rounded-full object-cover shadow"
          />
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold text-storypad-dark">
              {userData.fullName}
            </h1>
            <p className="text-storypad-text-light">@{userData.username}</p>
            <p className="mt-2 text-storypad-text">{userData.bio}</p>
            <p className="text-sm text-gray-400 mt-1">
              Joined: {new Date(userData.joined).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 text-center">
          <div>
            <p className="text-xl font-bold text-storypad-primary">
              {userData.storiesCount}
            </p>
            <p className="text-storypad-text">Stories</p>
          </div>
          <div>
            <p className="text-xl font-bold text-storypad-primary">
              {userData.followers}
            </p>
            <p className="text-storypad-text">Followers</p>
          </div>
          <div>
            <p className="text-xl font-bold text-storypad-primary">
              {userData.likes}
            </p>
            <p className="text-storypad-text">Likes</p>
          </div>
          <div>
            <Link
              to="/edit-profile"
              className="text-sm text-storypad-primary hover:underline"
            >
              Edit Profile
            </Link>
          </div>
        </div>

        {/* Placeholder: User's Stories */}
        <div className="mt-10">
          <h2 className="text-2xl font-semibold text-storypad-dark mb-4">
            Your Stories
          </h2>
          <p className="text-storypad-text-light">Coming soon: List of your stories with edit options.</p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

