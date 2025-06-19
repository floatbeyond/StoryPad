import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from '../components/BackButton';
import ConfirmationModal from '../components/ConfirmationModal';
import ImageCropper from '../components/ImageCropper';
import { handleImageError } from '../utils/imageUtils.jsx';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const DEFAULT_PROFILE = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/default-profile.png`;
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [activeSection, setActiveSection] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Profile editing states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    profilePicture: null
  });
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  
  // Settings states
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [settingsData, setSettingsData] = useState({
    allowInvitations: true,
    emailNotifications: true
  });
  
  // Password change states
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  // Profile picture upload
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState(null);

  // Add invitations state
  const [invitations, setInvitations] = useState([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);

  useEffect(() => {
    fetchUserData();
    fetchInvitations();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          navigate('/login');
          return;
        }
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      if (data.success) {
        setUserData(data.user);
        setProfileData({
          firstName: data.user.firstName || '',
          lastName: data.user.lastName || '',
          username: data.user.username || '',
          email: data.user.email || '',
          profilePicture: data.user.profilePicture || DEFAULT_PROFILE
        });
        setSettingsData({
          allowInvitations: data.user.collaborationSettings?.allowInvitations ?? true,
          emailNotifications: data.user.collaborationSettings?.emailNotifications ?? true
        });
      }
    } catch (err) {
      setError('Failed to load profile data');
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitations = async () => {
    setLoadingInvitations(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/user/profile/invitations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations || []);
      }
    } catch (err) {
      console.error('Failed to fetch invitations:', err);
    } finally {
      setLoadingInvitations(false);
    }
  };

  const checkUsernameAvailability = async (username) => {
    if (!username || username === userData?.username) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/check-username/${username}`);
      const data = await response.json();
      setUsernameAvailable(data.available);
    } catch (err) {
      console.error('Username check error:', err);
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleProfilePictureSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    // Create image URL for cropper
    const imageUrl = URL.createObjectURL(file);
    setSelectedImageSrc(imageUrl);
    setShowImageCropper(true);
  };

  const handleCropComplete = async (croppedBlob) => {
    setShowImageCropper(false);
    setSelectedImageSrc(null);
    setUploadingPicture(true);

    try {
      const formData = new FormData();
      formData.append('profilePicture', croppedBlob, 'profile.jpg');

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/user/profile-picture`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        setProfileData(prev => ({ ...prev, profilePicture: data.profilePicture }));
        setUserData(prev => ({ ...prev, profilePicture: data.profilePicture }));
        setSuccess('Profile picture updated successfully!');
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      setError('Failed to upload profile picture');
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleCropCancel = () => {
    setShowImageCropper(false);
    if (selectedImageSrc) {
      URL.revokeObjectURL(selectedImageSrc);
      setSelectedImageSrc(null);
    }
  };

  const handleSaveProfile = async () => {
    if (usernameAvailable === false) {
      setError('Please choose an available username');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          username: profileData.username,
          email: profileData.email
        })
      });

      const data = await response.json();
      if (data.success) {
        setUserData(data.user);
        localStorage.setItem('username', data.user.username);
        setIsEditingProfile(false);
        setSuccess('Profile updated successfully!');
        setUsernameAvailable(null);
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/user/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          collaborationSettings: settingsData
        })
      });

      const data = await response.json();
      if (data.success) {
        setUserData(prev => ({ ...prev, collaborationSettings: settingsData }));
        setIsEditingSettings(false);
        setSuccess('Settings updated successfully!');
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      setError('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/user/change-password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();
      if (data.success) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setIsChangingPassword(false);
        setSuccess('Password changed successfully!');
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      setError('Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/user/account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        localStorage.clear();
        navigate('/');
      } else {
        throw new Error('Failed to delete account');
      }
    } catch (err) {
      setError('Failed to delete account');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-storypad-dark-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-storypad-dark-bg">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <BackButton />
        
        {/* Header */}
        <div className="bg-white dark:bg-storypad-dark-surface rounded-lg shadow-md mb-6">
          <div className="px-6 py-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden shadow-lg border-4 border-gray-200 dark:border-gray-600">
                  <img
                    src={userData?.profilePicture || DEFAULT_PROFILE}
                    alt={`${userData?.firstName} ${userData?.lastName}`}
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                  />
                </div>
                <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleProfilePictureSelect}
                    disabled={uploadingPicture}
                  />
                </label>
                {uploadingPicture && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
              
              <div className="text-center md:text-left flex-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-storypad-dark-text">
                  {userData?.firstName} {userData?.lastName}
                </h1>
                <p className="text-lg text-gray-600 dark:text-storypad-dark-text-light">@{userData?.username}</p>
                <p className="text-sm text-gray-500 dark:text-storypad-dark-text-light mt-1">
                  Member since {new Date(userData?.createdAt).toLocaleDateString()}
                </p>
                
                <div className="flex justify-center md:justify-start gap-6 mt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {userData?.stats?.storiesCount || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-storypad-dark-text-light">Stories</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {userData?.stats?.totalViews || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-storypad-dark-text-light">Views</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {userData?.stats?.totalLikes || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-storypad-dark-text-light">Likes</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <p className="text-red-600 dark:text-red-300">{error}</p>
              <button onClick={() => setError(null)} className="text-red-600 dark:text-red-300">✕</button>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <p className="text-green-600 dark:text-green-300">{success}</p>
              <button onClick={() => setSuccess(null)} className="text-green-600 dark:text-green-300">✕</button>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white dark:bg-storypad-dark-surface rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6">
              { [
                {
                  id: 'profile',
                  label: '👤 Profile',
                  icon: '👤'
                },
                {
                  id: 'invitations',
                  label: `📨 Invitations ${invitations.length > 0 ? `(${invitations.length})` : ''}`,
                  icon: '📨'
                },
                {
                  id: 'settings',
                  label: '⚙️ Settings',
                  icon: '⚙️'
                },
                {
                  id: 'security',
                  label: '🔒 Security',
                  icon: '🔒'
                }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeSection === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content Sections */}
        <div className="bg-white dark:bg-storypad-dark-surface rounded-lg shadow-md p-6">
          {/* Profile Section */}
          {activeSection === 'profile' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-storypad-dark-text">
                  Profile Information
                </h2>
                {!isEditingProfile && (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    ✏️ Edit
                  </button>
                )}
              </div>

              {isEditingProfile ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-storypad-dark-text mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-storypad-dark-bg text-gray-900 dark:text-storypad-dark-text"
                        placeholder="Enter first name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-storypad-dark-text mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-storypad-dark-bg text-gray-900 dark:text-storypad-dark-text"
                        placeholder="Enter last name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-storypad-dark-text mb-1">
                      Username
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={profileData.username}
                        onChange={(e) => {
                          setProfileData(prev => ({ ...prev, username: e.target.value }));
                          checkUsernameAvailability(e.target.value);
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-storypad-dark-bg text-gray-900 dark:text-storypad-dark-text ${
                          usernameAvailable === false ? 'border-red-500 dark:border-red-500' :
                          usernameAvailable === true ? 'border-green-500 dark:border-green-500' :
                          'border-gray-300 dark:border-gray-600'
                        }`}
                        placeholder="Enter username"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        {checkingUsername && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        )}
                        {usernameAvailable === true && !checkingUsername && (
                          <span className="text-green-500">✓</span>
                        )}
                        {usernameAvailable === false && !checkingUsername && (
                          <span className="text-red-500">✗</span>
                        )}
                      </div>
                    </div>
                    {usernameAvailable === false && (
                      <p className="text-red-500 text-sm mt-1">Username is already taken</p>
                    )}
                    {usernameAvailable === true && (
                      <p className="text-green-500 text-sm mt-1">Username is available</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-storypad-dark-text mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-storypad-dark-bg text-gray-900 dark:text-storypad-dark-text"
                      placeholder="Enter email"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving || usernameAvailable === false}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingProfile(false);
                        setUsernameAvailable(null);
                        setProfileData({
                          firstName: userData?.firstName || '',
                          lastName: userData?.lastName || '',
                          username: userData?.username || '',
                          email: userData?.email || '',
                          profilePicture: userData?.profilePicture || DEFAULT_PROFILE
                        });
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-storypad-dark-text-light">
                        First Name
                      </dt>
                      <dd className="text-sm text-gray-900 dark:text-storypad-dark-text">
                        {userData?.firstName || '-'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-storypad-dark-text-light">
                        Last Name
                      </dt>
                      <dd className="text-sm text-gray-900 dark:text-storypad-dark-text">
                        {userData?.lastName || '-'}
                      </dd>
                    </div>
                  </div>

                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-storypad-dark-text-light">
                      Username
                    </dt>
                    <dd className="text-sm text-gray-900 dark:text-storypad-dark-text">
                      {userData?.username || '-'}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-storypad-dark-text-light">
                      Email
                    </dt>
                    <dd className="text-sm text-gray-900 dark:text-storypad-dark-text">
                      {userData?.email || '-'}
                    </dd>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Edit Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Invitations Section */}
          {activeSection === 'invitations' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-storypad-dark-text mb-6">
                Story Invitations
              </h2>
              
              {loadingInvitations ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : invitations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-storypad-dark-text-light">
                    No pending invitations
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invitations.map((invitation) => (
                    <div key={invitation._id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-storypad-dark-text">
                            {invitation.story.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-storypad-dark-text-light mt-1">
                            by {invitation.story.author.firstName} {invitation.story.author.lastName}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-storypad-dark-text-light mt-1">
                            Invited by {invitation.invitedBy.firstName} {invitation.invitedBy.lastName} as {invitation.role}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                            {new Date(invitation.invitedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors">
                            Accept
                          </button>
                          <button className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors">
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings Section */}
          {activeSection === 'settings' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-storypad-dark-text">
                  Account Settings
                </h2>
                {!isEditingSettings && (
                  <button
                    onClick={() => setIsEditingSettings(true)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    ✏️ Edit
                  </button>
                )}
              </div>

              {isEditingSettings ? (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-storypad-dark-text mb-1">
                        Allow Story Invitations
                      </label>
                      <select
                        value={settingsData.allowInvitations ? 'yes' : 'no'}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, allowInvitations: e.target.value === 'yes' }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-storypad-dark-bg text-gray-900 dark:text-storypad-dark-text"
                      >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-storypad-dark-text mb-1">
                        Email Notifications
                      </label>
                      <select
                        value={settingsData.emailNotifications ? 'enabled' : 'disabled'}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, emailNotifications: e.target.value === 'enabled' }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-storypad-dark-bg text-gray-900 dark:text-storypad-dark-text"
                      >
                        <option value="enabled">Enabled</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSaveSettings}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => setIsEditingSettings(false)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <dt className="text-sm font-medium text-gray-500 dark:text-storypad-dark-text-light">
                        Allow Story Invitations
                      </dt>
                      <dd className="text-sm text-gray-900 dark:text-storypad-dark-text">
                        {settingsData.allowInvitations ? 'Yes' : 'No'}
                      </dd>
                    </div>
                    <div className="flex-1">
                      <dt className="text-sm font-medium text-gray-500 dark:text-storypad-dark-text-light">
                        Email Notifications
                      </dt>
                      <dd className="text-sm text-gray-900 dark:text-storypad-dark-text">
                        {settingsData.emailNotifications ? 'Enabled' : 'Disabled'}
                      </dd>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setIsEditingSettings(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Edit Settings
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Security Section */}
          {activeSection === 'security' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-storypad-dark-text">
                  Security Settings
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-storypad-dark-text mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-storypad-dark-bg text-gray-900 dark:text-storypad-dark-text"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                    >
                      {showPasswords.current ? (
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 01.52-2.07M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7a10.05 10.05 0 01-.217 1.09M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7a10.05 10.05 0 01-.217 1.09M21.542 12C20.268 16.057 16.477 19 12 19c-4.478 0-8.268-2.943-9.542-7a9.99 9.99 0 01.217-1.09" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-storypad-dark-text mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-storypad-dark-bg text-gray-900 dark:text-storypad-dark-text"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                    >
                      {showPasswords.new ? (
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 01.52-2.07M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7a10.05 10.05 0 01-.217 1.09M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7a10.05 10.05 0 01-.217 1.09M21.542 12C20.268 16.057 16.477 19 12 19c-4.478 0-8.268-2.943-9.542-7a9.99 9.99 0 01.217-1.09" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-storypad-dark-text mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-storypad-dark-bg text-gray-900 dark:text-storypad-dark-text"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                    >
                      {showPasswords.confirm ? (
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 01.52-2.07M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7a10.05 10.05 0 01-.217 1.09M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7a10.05 10.05 0 01-.217 1.09M21.542 12C20.268 16.057 16.477 19 12 19c-4.478 0-8.268-2.943-9.542-7a9.99 9.99 0 01.217-1.09" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleChangePassword}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                  >
                    {saving ? 'Changing...' : 'Change Password'}
                  </button>
                  <button
                    onClick={() => setActiveSection('profile')}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Back to Profile
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Cropper Modal */}
      {showImageCropper && selectedImageSrc && (
        <ImageCropper
          imageSrc={selectedImageSrc}
          onCrop={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={1} // Square crop for profile pictures
        />
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmationModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteAccount}
          title="Delete Account"
          message="Are you sure you want to delete your account? This action cannot be undone."
          confirmText="Delete Account"
          cancelText="Cancel"
        />
      )}
    </div>
  );
};

export default ProfilePage;