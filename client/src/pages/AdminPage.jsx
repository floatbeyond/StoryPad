import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';

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
      const response = await fetch(`${API_BASE_URL}/api/import/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
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

  const handleImportDataset = async (source, limit) => {
    setImportLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/import/dataset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ source, limit })
      });

      const result = await response.json();
      
      if (result.success) {
        setSuccess(`✅ Successfully imported ${result.storiesCreated} stories from ${source}!`);
        fetchStats();
        fetchStories();
      } else {
        setError(`❌ Import failed: ${result.message}`);
      }
    } catch (err) {
      setError(`❌ Error: ${err.message}`);
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
                      {stats.categoriesData.slice(0, 10).map((cat) => (
                        <div key={cat._id} className="flex items-center justify-between">
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
                  {/* Project Gutenberg */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Project Gutenberg</h3>
                    <p className="text-gray-600 mb-4">Import classic literature from Project Gutenberg's free collection.</p>
                    <div className="space-y-2">
                      <button
                        onClick={() => handleImportDataset('gutenberg', 10)}
                        disabled={importLoading}
                        className="w-full btn-primary text-sm disabled:opacity-50"
                      >
                        Import 10 Books
                      </button>
                      <button
                        onClick={() => handleImportDataset('gutenberg', 25)}
                        disabled={importLoading}
                        className="w-full btn-secondary text-sm disabled:opacity-50"
                      >
                        Import 25 Books
                      </button>
                    </div>
                  </div>

                  {/* Open Library */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Open Library</h3>
                    <p className="text-gray-600 mb-4">Import books by genre from the Internet Archive's Open Library.</p>
                    <div className="space-y-2">
                      <button
                        onClick={() => handleImportDataset('openlibrary', 15)}
                        disabled={importLoading}
                        className="w-full btn-primary text-sm disabled:opacity-50"
                      >
                        Import 15 Books
                      </button>
                      <button
                        onClick={() => handleImportDataset('openlibrary', 30)}
                        disabled={importLoading}
                        className="w-full btn-secondary text-sm disabled:opacity-50"
                      >
                        Import 30 Books
                      </button>
                    </div>
                  </div>

                  {/* Sample Stories */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Sample Stories</h3>
                    <p className="text-gray-600 mb-4">Add original sample stories for testing and demonstration.</p>
                    <div className="space-y-2">
                      <button
                        onClick={() => handleImportDataset('sample', 5)}
                        disabled={importLoading}
                        className="w-full btn-primary text-sm disabled:opacity-50"
                      >
                        Import 5 Stories
                      </button>
                    </div>
                  </div>
                </div>

                {importLoading && (
                  <div className="text-center py-4">
                    <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-gray-600">Importing stories... This may take a few minutes.</p>
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
                  {stories.slice(0, 20).map((story) => (
                    <div key={story._id} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                        {story.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        by {story.author?.username}
                      </p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {story.category?.slice(0, 2).map((cat) => (
                          <span
                            key={cat}
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