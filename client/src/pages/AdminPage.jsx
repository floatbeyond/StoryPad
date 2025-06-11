import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';

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

  useEffect(() => {
    checkAdminAccess();
    fetchStats();
    fetchUsers();
    fetchStories();
  }, []);

  const promoteUser = async (userId, username) => {
    if (!confirm(`Are you sure you want to promote ${username} to admin?`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/promote`, {
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
    }
  };

  const demoteUser = async (userId, username) => {
    if (!confirm(`Are you sure you want to demote ${username} from admin?`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/demote`, {
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
    }
  };

  const deleteUser = async (userId, username) => {
    if (!confirm(`Are you sure you want to delete ${username}? This will also delete all their stories.`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();
      
      if (result.success) {
        setSuccess(result.message);
        fetchUsers();
        fetchStats();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    }
  };

  const checkAdminAccess = () => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');
    
    if (!token) {
      setLoading(false);
      return;
    }

    if (!currentUser || (!currentUser.username && !currentUser._id)) {
      console.log('❌ No user data found');
      setLoading(false);
      return;
    }

    // Check if user is admin
    const isAdmin = currentUser.role === 'admin' || 
                   currentUser.username === 'admin' || 
                   currentUser.email === 'admin@storypad.com';
    
    console.log('🔐 Admin check result:', { 
      role: currentUser.role, 
      username: currentUser.username, 
      email: currentUser.email,
      isAdmin 
    });

    if (!isAdmin) {
      console.log('❌ User is not admin');
      setLoading(false);
      return;
    }

    console.log('✅ Admin access granted');
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
      const response = await fetch(`${API_BASE_URL}/api/stories/published`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStories(data.stories || []);
      }
    } catch (err) {
      console.error('Error fetching stories:', err);
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

  const deleteStory = async (storyId) => {
    if (!confirm('Are you sure you want to delete this story?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/stories/${storyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setSuccess('Story deleted successfully');
        fetchStories();
        fetchStats();
      } else {
        setError('Failed to delete story');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600">
            Manage users, stories, and import datasets
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
            <p className="text-green-600">{success}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
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
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                <h2 className="text-xl font-semibold text-gray-900">Overview</h2>
                
                {stats && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-blue-50 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-blue-900">Total Stories</h3>
                      <p className="text-3xl font-bold text-blue-600">{stats.totalStories}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-green-900">Published</h3>
                      <p className="text-3xl font-bold text-green-600">{stats.publishedStories}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-purple-900">Total Users</h3>
                      <p className="text-3xl font-bold text-purple-600">{stats.totalUsers}</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-yellow-900">Categories</h3>
                      <p className="text-3xl font-bold text-yellow-600">{stats.categoriesData?.length || 0}</p>
                    </div>
                  </div>
                )}

                {/* Categories Chart */}
                {stats?.categoriesData && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Stories by Category</h3>
                    <div className="space-y-2">
                      {stats.categoriesData.slice(0, 10).map((cat, index) => ( // ADD index to make keys unique
                        <div key={`${cat._id}-${index}`} className="flex items-center justify-between"> {/* CHANGED: Use category + index as key */}
                          <span className="text-gray-700">{cat._id}</span>
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
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
                <h2 className="text-xl font-semibold text-gray-900">Import Datasets</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* AI Generated Books */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Gutenberg Import</h3>
                    <p className="text-gray-600 mb-4">Import 40+ classic books from Project Gutenberg across all your existing categories.</p>
                    <button
                      onClick={importAIStories}
                      disabled={importLoading}  // This is crucial!
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors"
                    >
                      {importLoading ? 'Importing...' : 'Import Classic Literature'}
                    </button>
                  </div>

                  {/* Dataset Stories */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">AI Pre-made Stories</h3>
                    <p className="text-gray-600 mb-4">Import pre-made stories fitting already existing categories.</p>
                    <button
                      onClick={importDatasetStories}
                      disabled={importLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors"
                    >
                      {importLoading ? 'Importing...' : 'Import Dataset Stories'}
                    </button>
                  </div>

                  {/* Cleanup Dataset */}
                  <div className="border border-red-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-red-900 mb-2">Cleanup Dataset</h3>
                    <p className="text-red-600 mb-4">Remove all dataset stories to re-import with better chapter titles.</p>
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
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-center justify-center space-x-3">
                      <div className="animate-spin h-6 w-6 border-3 border-blue-500 border-t-transparent rounded-full"></div>
                      <div className="text-center">
                        <p className="text-blue-800 font-medium">Processing...</p>
                        <p className="text-blue-600 text-sm">This may take a few minutes depending on the dataset size.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Users Tab */}
            {activeTab === 'users' && (
                <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
                
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Joined
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                        </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                        <tr key={user._id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                                <div className="text-sm font-medium text-gray-900">
                                {user.firstName} {user.lastName}
                                </div>
                                <div className="text-sm text-gray-500">@{user.username}</div>
                            </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                user.role === 'admin' || user.username === 'admin'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                                {user.role === 'admin' || user.username === 'admin' ? 'Admin' : 'User'}
                            </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            {/* Role Management */}
                            {user.role !== 'admin' && user.username !== 'admin' ? (
                                <button
                                onClick={() => promoteUser(user._id, user.username)}
                                className="text-green-600 hover:text-green-900"
                                >
                                Promote to Admin
                                </button>
                            ) : user._id !== JSON.parse(localStorage.getItem('user') || '{}')._id && (
                                <button
                                onClick={() => demoteUser(user._id, user.username)}
                                className="text-yellow-600 hover:text-yellow-900"
                                >
                                Demote to User
                                </button>
                            )}
                            
                            {/* Delete User */}
                            {user._id !== JSON.parse(localStorage.getItem('user') || '{}')._id && (
                                <button
                                onClick={() => deleteUser(user._id, user.username)}
                                className="text-red-600 hover:text-red-900"
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
                <h2 className="text-xl font-semibold text-gray-900">Story Management</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {stories.slice(0, 20).map((story, index) => ( // ADD index
                    <div key={`${story._id}-${index}`} className="border border-gray-200 rounded-lg p-4"> {/* CHANGED: Use story ID + index */}
                      <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                        {story.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        by {story.author?.username}
                      </p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {story.category?.slice(0, 2).map((cat, catIndex) => ( // ADD catIndex
                          <span
                            key={`${story._id}-${cat}-${catIndex}`} // CHANGED: Use story ID + category + index
                            className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          {story.views || 0} views
                        </span>
                        <button
                          onClick={() => deleteStory(story._id)}
                          className="text-red-600 hover:text-red-800 text-sm"
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
    </div>
  );
};

export default AdminPage;