import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';

// Make sure your API_BASE_URL is correct:
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminPage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [importLoading, setImportLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [stories, setStories] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [storyToDelete, setStoryToDelete] = useState(null);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [showDemoteModal, setShowDemoteModal] = useState(false);
  const [userToPromote, setUserToPromote] = useState(null);
  const [userToDemote, setUserToDemote] = useState(null);

  useEffect(() => {
    checkAdminAccess();
    fetchStats();
    fetchUsers();
    fetchStories();
  }, []);

  const checkAdminAccess = () => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');
    
    if (!token) {
      setLoading(false);
      return;
    }

    if (!currentUser || (!currentUser.username && !currentUser._id)) {
      setLoading(false);
      return;
    }

    // Check if user is admin
    const isAdmin = currentUser.role === 'admin' || 
                   currentUser.username === 'admin' || 
                   currentUser.email === 'admin@storypad.com';

    if (!isAdmin) {
      setLoading(false);
      return;
    }

    setUser(currentUser);
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/stats`, { // CHANGED: admin/stats instead of import/stats
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      } else {
        console.error('Failed to fetch stats:', response.status);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      // You'll need to create this endpoint
      const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchStories = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // ✅ Use admin route to get all stories
      const response = await fetch(`${API_BASE_URL}/api/admin/stories`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        setStories(data.stories || []);
      } else {
        setError(data.message || 'Failed to fetch stories');
      }
    } catch (error) {
      setError('Failed to fetch stories');
    }
  };

  const importAIStories = async () => {
    // Prevent multiple calls
    if (importLoading) {
      console.log('Import already in progress, skipping...');
      return;
    }

    setImportLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log('🚀 Starting AI stories import...');
      const token = localStorage.getItem('token');
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

      const response = await fetch(`${API_BASE_URL}/api/import/ai-stories`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setSuccess(`✅ Successfully imported ${result.stories.length} classic books!`);
        fetchStats();
        fetchStories();
      } else {
        setError(result.message || 'Import failed');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Import timed out after 5 minutes');
      } else {
        setError(`Error: ${err.message}`);
      }
    } finally {
      setImportLoading(false);
    }
  };

  const importDatasetStories = async () => {
    if (importLoading) return;
    
    setImportLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const token = localStorage.getItem('token');
      console.log('🚀 Starting dataset import to:', `${API_BASE_URL}/api/import/dataset-stories`);
      
      const response = await fetch(`${API_BASE_URL}/api/import/dataset-stories`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setSuccess(`✅ Successfully imported ${result.totalStories} dataset stories across ${result.categoriesWithStories.length} categories!`);
        fetchStats();
        fetchStories();
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('❌ Dataset import error:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setImportLoading(false);
    }
  };

  const cleanupDatasetStories = async () => {
    setImportLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/import/cleanup-dataset`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();
      
      if (result.success) {
        setSuccess(`✅ Cleaned up ${result.deletedCount} dataset stories`);
        fetchStats();
        fetchStories();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setImportLoading(false);
    }
  };

  const handleDeleteStory = (story) => {
    setStoryToDelete(story);
    setShowDeleteModal(true);
  };

  const confirmDeleteStory = async () => {
    if (!storyToDelete) return;
    
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/api/admin/stories/${storyToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setStories(stories.filter(story => story._id !== storyToDelete._id));
        setSuccess(`Story "${storyToDelete.title}" deleted successfully`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.message || 'Failed to delete story');
      }
    } catch (error) {
      setError('Failed to delete story');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setStoryToDelete(null);
    }
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setShowDeleteUserModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setUsers(users.filter(user => user._id !== userToDelete._id));
        setSuccess(`User "${userToDelete.username}" deleted successfully`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.message || 'Failed to delete user');
      }
    } catch (error) {
      setError('Failed to delete user');
    } finally {
      setIsDeleting(false);
      setShowDeleteUserModal(false);
      setUserToDelete(null);
    }
  };

  const handlePromoteUser = (user) => {
    setUserToPromote(user);
    setShowPromoteModal(true);
  };

  const handleDemoteUser = (user) => {
    setUserToDemote(user);
    setShowDemoteModal(true);
  };

  const confirmPromoteUser = async () => {
    if (!userToPromote) return;
    
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userToPromote._id}/promote`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();
      
      if (result.success) {
        setSuccess(result.message);
        fetchUsers();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setShowPromoteModal(false);
      setUserToPromote(null);
    }
  };

  const confirmDemoteUser = async () => {
    if (!userToDemote) return;
    
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userToDemote._id}/demote`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();
      
      if (result.success) {
        setSuccess(result.message);
        fetchUsers();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setShowDemoteModal(false);
      setUserToDemote(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-storypad-dark-bg">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white dark:bg-storypad-dark-surface rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-storypad-dark-text mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-storypad-dark-text-light">
            Manage users, stories, and import datasets
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mb-6">
            <p className="text-red-600 dark:text-red-300">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4 mb-6">
            <p className="text-green-600 dark:text-green-300">{success}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-storypad-dark-surface rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { key: 'dashboard', label: 'Dashboard' },
                { key: 'import', label: 'Import Data' },
                { key: 'users', label: 'Users' },
                { key: 'stories', label: 'Stories' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-storypad-dark-text">Overview</h2>
                
                {stats && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-blue-900 dark:text-blue-300">Total Stories</h3>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.totalStories}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-green-900 dark:text-green-300">Published</h3>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.publishedStories}</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-purple-900 dark:text-purple-300">Total Users</h3>
                      <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.totalUsers}</p>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-yellow-900 dark:text-yellow-300">Categories</h3>
                      <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.categoriesData?.length || 0}</p>
                    </div>
                  </div>
                )}

                {/* Categories Chart */}
                {stats?.categoriesData && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-storypad-dark-text mb-4">Stories by Category</h3>
                    <div className="space-y-2">
                      {stats.categoriesData.slice(0, 10).map((cat, index) => (
                        <div key={`${cat._id}-${index}`} className="flex items-center justify-between">
                          <span className="text-gray-700 dark:text-storypad-dark-text">{cat._id}</span>
                          <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-sm">
                            {cat.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Import Tab */}
            {activeTab === 'import' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-storypad-dark-text">Import Datasets</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* AI Generated Books */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-storypad-dark-surface">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-storypad-dark-text mb-2">Gutenberg Import</h3>
                    <p className="text-gray-600 dark:text-storypad-dark-text-light mb-4">Import 40+ classic books from Project Gutenberg across all your existing categories.</p>
                    <button
                      onClick={importAIStories}
                      disabled={importLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors"
                    >
                      {importLoading ? 'Importing...' : 'Import Classic Literature'}
                    </button>
                  </div>

                  {/* Dataset Stories */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-storypad-dark-surface">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-storypad-dark-text mb-2">AI Pre-made Stories</h3>
                    <p className="text-gray-600 dark:text-storypad-dark-text-light mb-4">Import pre-made stories fitting already existing categories.</p>
                    <button
                      onClick={importDatasetStories}
                      disabled={importLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors"
                    >
                      {importLoading ? 'Importing...' : 'Import Dataset Stories'}
                    </button>
                  </div>

                  {/* Cleanup Dataset */}
                  <div className="border border-red-200 dark:border-red-800 rounded-lg p-6 bg-white dark:bg-storypad-dark-surface">
                    <h3 className="text-lg font-medium text-red-900 dark:text-red-300 mb-2">Cleanup Dataset</h3>
                    <p className="text-red-600 dark:text-red-400 mb-4">Remove all dataset stories to re-import with better chapter titles.</p>
                    <button
                      onClick={cleanupDatasetStories}
                      disabled={importLoading}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors"
                    >
                      {importLoading ? 'Cleaning...' : 'Cleanup Dataset Stories'}
                    </button>
                  </div>
                </div>

                {importLoading && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                    <div className="flex items-center justify-center space-x-3">
                      <div className="animate-spin h-6 w-6 border-3 border-blue-500 border-t-transparent rounded-full"></div>
                      <div className="text-center">
                        <p className="text-blue-800 dark:text-blue-300 font-medium">Processing...</p>
                        <p className="text-blue-600 dark:text-blue-400 text-sm">This may take a few minutes depending on the dataset size.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-storypad-dark-text">User Management</h2>
                
                <div className="bg-white dark:bg-storypad-dark-surface border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Joined</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-storypad-dark-surface divide-y divide-gray-200 dark:divide-gray-700">
                      {users.map((user) => (
                        <tr key={user._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-storypad-dark-text">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-storypad-dark-text-light">@{user.username}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-storypad-dark-text">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.role === 'admin' || user.username === 'admin'
                                ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                            }`}>
                              {user.role === 'admin' || user.username === 'admin' ? 'Admin' : 'User'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-storypad-dark-text-light">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            {/* Role Management */}
                            {user.role !== 'admin' && user.username !== 'admin' ? (
                              <button
                                onClick={() => handlePromoteUser(user)}
                                className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                              >
                                Promote to Admin
                              </button>
                            ) : user._id !== JSON.parse(localStorage.getItem('user') || '{}')._id && (
                              <button
                                onClick={() => handleDemoteUser(user)}
                                className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-300"
                              >
                                Demote to User
                              </button>
                            )}
                            
                            {/* Delete User */}
                            {user._id !== JSON.parse(localStorage.getItem('user') || '{}')._id && (
                              <button
                                onClick={() => handleDeleteUser(user)}
                                className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {/* Stories Tab */}
            {activeTab === 'stories' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-storypad-dark-text">Story Management</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {stories.slice(0, 20).map((story, index) => (
                    <div key={`${story._id}-${index}`} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-storypad-dark-surface">
                      <h3 className="font-medium text-gray-900 dark:text-storypad-dark-text mb-2 line-clamp-2">
                        {story.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-storypad-dark-text-light mb-2">
                        by {story.author?.username}
                      </p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {story.category?.slice(0, 2).map((cat, catIndex) => (
                          <span
                            key={`${story._id}-${cat}-${catIndex}`}
                            className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500 dark:text-storypad-dark-text-light">
                          {story.views || 0} views
                        </span>
                        <button
                          onClick={() => handleDeleteStory(story)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteStory}
        title="Delete Story"
        message={
          <>
            Are you sure you want to delete "<strong>{storyToDelete?.title}</strong>"?
            <span className="block font-medium text-red-600 mt-1">
              This action cannot be undone.
            </span>
          </>
        }
        details={
          storyToDelete && (
            <>
              <p><strong>Story Details:</strong></p>
              <p>• Author: {storyToDelete.author?.username}</p>
              <p>• Chapters: {storyToDelete.chapters?.length || 0}</p>
              <p>• Created: {new Date(storyToDelete.createdAt).toLocaleDateString()}</p>
            </>
          )
        }
        confirmText="Delete Story"
        cancelText="Cancel"
        type="danger"
        isLoading={isDeleting}
      />

      <ConfirmationModal
        isOpen={showDeleteUserModal}
        onClose={() => setShowDeleteUserModal(false)}
        onConfirm={confirmDeleteUser}
        title="Delete User"
        message={
          <>
            Are you sure you want to delete user "<strong>{userToDelete?.username}</strong>"?
            <span className="block font-medium text-red-600 mt-1">
              This will also delete all their stories and cannot be undone.
            </span>
          </>
        }
        details={
          userToDelete && (
            <>
              <p><strong>User Details:</strong></p>
              <p>• Username: {userToDelete.username}</p>
              <p>• Email: {userToDelete.email}</p>
              <p>• Role: {userToDelete.role}</p>
              <p>• Joined: {new Date(userToDelete.createdAt).toLocaleDateString()}</p>
            </>
          )
        }
        confirmText="Delete User"
        cancelText="Cancel"
        type="danger"
        isLoading={isDeleting}
      />

      <ConfirmationModal
        isOpen={showPromoteModal}
        onClose={() => setShowPromoteModal(false)}
        onConfirm={confirmPromoteUser}
        title="Promote User to Admin"
        message={
          <>
            Are you sure you want to promote "<strong>{userToPromote?.username}</strong>" to admin?
            <span className="block font-medium text-yellow-600 mt-1">
              This will give them full administrative privileges.
            </span>
          </>
        }
        details={
          userToPromote && (
            <>
              <p><strong>User Details:</strong></p>
              <p>• Username: {userToPromote.username}</p>
              <p>• Email: {userToPromote.email}</p>
              <p>• Current Role: {userToPromote.role}</p>
              <p>• Joined: {new Date(userToPromote.createdAt).toLocaleDateString()}</p>
            </>
          )
        }
        confirmText="Promote to Admin"
        cancelText="Cancel"
        type="warning"
        isLoading={isDeleting}
      />

      <ConfirmationModal
        isOpen={showDemoteModal}
        onClose={() => setShowDemoteModal(false)}
        onConfirm={confirmDemoteUser}
        title="Demote Admin to User"
        message={
          <>
            Are you sure you want to demote "<strong>{userToDemote?.username}</strong>" from admin?
            <span className="block font-medium text-yellow-600 mt-1">
              This will remove their administrative privileges.
            </span>
          </>
        }
        details={
          userToDemote && (
            <>
              <p><strong>User Details:</strong></p>
              <p>• Username: {userToDemote.username}</p>
              <p>• Email: {userToDemote.email}</p>
              <p>• Current Role: {userToDemote.role}</p>
              <p>• Joined: {new Date(userToDemote.createdAt).toLocaleDateString()}</p>
            </>
          )
        }
        confirmText="Demote to User"
        cancelText="Cancel"
        type="warning"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default AdminPage;