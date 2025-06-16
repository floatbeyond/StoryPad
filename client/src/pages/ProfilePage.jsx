import { useEffect, useState } from "react";
import defaultAvatar from "../assets/profileimage.png";
import BackButton from '../components/BackButton';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ProfilePage = () => {
  const [userData, setUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editData, setEditData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: ""
  });

  useEffect(() => {
    const username = localStorage.getItem("username");
    if (username) {
      fetch(`${API_BASE_URL}/api/user/${username}`)
        .then((res) => res.json())
        .then((data) => {
          setUserData(data);
          const [firstName = "", lastName = ""] = data.fullName?.split(" ") || [];
          setEditData({
            firstName,
            lastName,
            email: data.email,
            password: ""
          });
        })
        .catch((err) => console.error("Failed to fetch user data:", err));
    }
  }, []);

  const handleSave = () => {
    const payload = { ...editData };
    if (!payload.password) delete payload.password;

    fetch(`${API_BASE_URL}/api/users/${userData.username}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then(() => {
        setIsEditing(false);
        setUserData((prev) => ({
          ...prev,
          fullName: `${editData.firstName} ${editData.lastName}`,
          email: editData.email
        }));
      })
      .catch((err) => console.error("Update failed:", err));
  };

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600 dark:text-storypad-dark-text-light bg-gray-50 dark:bg-storypad-dark-bg">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-storypad-dark-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-storypad-dark-surface rounded-lg shadow-lg p-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-40 h-40 rounded-full overflow-hidden shadow border-4 border-gray-300 dark:border-gray-600">
            <img
              src={defaultAvatar}
              alt={userData.fullName}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-center md:text-left flex-1">
          <BackButton />
            <h1 className="text-3xl font-bold text-gray-800 dark:text-storypad-dark-text">
              {userData.fullName}
            </h1>
            <p className="text-gray-500 dark:text-storypad-dark-text-light">@{userData.username}</p>
            <p className="text-sm text-gray-400 dark:text-storypad-dark-text-light mt-1">
              Joined: {new Date(userData.joined).toLocaleDateString()}
            </p>
          </div>
        </div>

        {isEditing ? (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                className="w-full border dark:border-gray-600 p-2 rounded bg-white dark:bg-storypad-dark-bg text-gray-900 dark:text-storypad-dark-text"
                value={editData.firstName}
                onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                placeholder="First Name"
              />
              <input
                type="text"
                className="w-full border dark:border-gray-600 p-2 rounded bg-white dark:bg-storypad-dark-bg text-gray-900 dark:text-storypad-dark-text"
                value={editData.lastName}
                onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                placeholder="Last Name"
              />
            </div>
            <input
              type="email"
              className="w-full border dark:border-gray-600 p-2 rounded bg-white dark:bg-storypad-dark-bg text-gray-900 dark:text-storypad-dark-text"
              value={editData.email}
              onChange={(e) => setEditData({ ...editData, email: e.target.value })}
              placeholder="Email"
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full border dark:border-gray-600 p-2 pr-10 rounded bg-white dark:bg-storypad-dark-bg text-gray-900 dark:text-storypad-dark-text"
                value={editData.password}
                onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                placeholder="Change Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
              >
               
              </button>
            </div>
            <div className="flex justify-between items-center mt-6">
              {/* Back Button - Left side */}
              <button
                onClick={() => setIsEditing(false)}
                className="text-gray-500 dark:text-storypad-dark-text-light hover:underline"
              >
                ← Back
              </button>
              <button
                onClick={handleSave}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
           </div>
      
        ) : (
          <div className="text-right mt-6">
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Edit Profile
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 text-center">
          <div>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{userData.storiesCount}</p>
            <p className="text-gray-600 dark:text-storypad-dark-text-light">Stories</p>
          </div>
          <div>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{userData.followers}</p>
            <p className="text-gray-600 dark:text-storypad-dark-text-light">Followers</p>
          </div>
          <div>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{userData.likes}</p>
            <p className="text-gray-600 dark:text-storypad-dark-text-light">Likes</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
