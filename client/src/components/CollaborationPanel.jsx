import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CollaborationPanel = ({ storyId, isOwner }) => {
  const [collaborators, setCollaborators] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [inviteRole, setInviteRole] = useState('editor');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (storyId) {
      fetchCollaborators();
    }
  }, [storyId]);

  // Search users when query changes
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timeoutId = setTimeout(() => {
        searchUsers();
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [searchQuery]);

  const fetchCollaborators = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/stories/${storyId}/collaborators`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCollaborators(data.collaborators || []);
        setPendingInvitations(data.pendingInvitations || []);
      } else {
        console.error('Failed to fetch collaborators');
      }
    } catch (err) {
      console.error('Error fetching collaborators:', err);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/user/search?query=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
        setShowDropdown(true);
      }
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setSearchQuery(user.email);
    setShowDropdown(false);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/stories/${storyId}/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userEmail: selectedUser.email,
          role: inviteRole
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Invitation sent successfully!');
        setSearchQuery('');
        setSelectedUser(null);
        fetchCollaborators(); // Refresh the list
      } else {
        setError(data.message || 'Failed to send invitation');
      }
    } catch (err) {
      setError('Failed to send invitation');
      console.error('Error sending invitation:', err);
    } finally {
      setLoading(false);
    }
  };

  const removeCollaborator = async (collaboratorId) => {
    if (!confirm('Are you sure you want to remove this collaborator?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/stories/${storyId}/collaborators/${collaboratorId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSuccess('Collaborator removed successfully');
        fetchCollaborators();
      } else {
        setError('Failed to remove collaborator');
      }
    } catch (err) {
      setError('Failed to remove collaborator');
      console.error('Error removing collaborator:', err);
    }
  };

  const cancelInvitation = async (invitationId) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/stories/${storyId}/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSuccess('Invitation cancelled');
        fetchCollaborators();
      } else {
        setError('Failed to cancel invitation');
      }
    } catch (err) {
      setError('Failed to cancel invitation');
      console.error('Error cancelling invitation:', err);
    }
  };

  return (
    <div className="bg-white dark:bg-storypad-dark-surface rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-storypad-dark-text mb-4">
        Collaboration
      </h3>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 mb-4">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3 mb-4">
          <p className="text-green-600 dark:text-green-400 text-sm">{success}</p>
        </div>
      )}

      {/* Current Collaborators */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-700 dark:text-storypad-dark-text mb-3">
          Active Collaborators ({collaborators.length})
        </h4>
        
        {collaborators.length === 0 ? (
          <p className="text-gray-500 dark:text-storypad-dark-text-light text-sm">No collaborators yet</p>
        ) : (
          <div className="space-y-2">
            {collaborators.map((collab) => (
              <div key={collab._id} className="p-3 bg-gray-50 dark:bg-storypad-dark-bg rounded-lg">
                {/* Mobile layout - side by side */}
                <div className="flex items-center justify-between sm:hidden">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 dark:text-blue-400 font-medium text-sm">
                        {collab.user.firstName?.[0]}{collab.user.lastName?.[0]}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-storypad-dark-text truncate">
                        {collab.user.firstName} {collab.user.lastName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-storypad-dark-text-light truncate">@{collab.user.username}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                      collab.role === 'editor' 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    }`}>
                      {collab.role}
                    </span>
                    
                    {isOwner && (
                      <button
                        onClick={() => removeCollaborator(collab._id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm whitespace-nowrap px-1"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Desktop layout - stacked */}
                <div className="hidden sm:block">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 dark:text-blue-400 font-medium text-sm">
                        {collab.user.firstName?.[0]}{collab.user.lastName?.[0]}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-storypad-dark-text">
                        {collab.user.firstName} {collab.user.lastName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-storypad-dark-text-light">@{collab.user.username}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      collab.role === 'editor' 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    }`}>
                      {collab.role}
                    </span>
                    
                    {isOwner && (
                      <button
                        onClick={() => removeCollaborator(collab._id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm px-2 py-1"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-700 dark:text-storypad-dark-text mb-3">
            Pending Invitations ({pendingInvitations.length})
          </h4>
          
          <div className="space-y-2">
            {pendingInvitations.map((invitation) => (
              <div key={invitation._id} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                {/* Mobile layout - side by side */}
                <div className="flex items-center justify-between sm:hidden">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-yellow-600 dark:text-yellow-400 font-medium text-sm">
                        {invitation.invitedUser.firstName?.[0]}{invitation.invitedUser.lastName?.[0]}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-storypad-dark-text truncate">
                        {invitation.invitedUser.firstName} {invitation.invitedUser.lastName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-storypad-dark-text-light truncate">@{invitation.invitedUser.username}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                    <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-medium whitespace-nowrap">
                      {invitation.role} (pending)
                    </span>
                    
                    {isOwner && (
                      <button
                        onClick={() => cancelInvitation(invitation._id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm whitespace-nowrap px-1"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Desktop layout - stacked */}
                <div className="hidden sm:block">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-yellow-600 dark:text-yellow-400 font-medium text-sm">
                        {invitation.invitedUser.firstName?.[0]}{invitation.invitedUser.lastName?.[0]}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-storypad-dark-text">
                        {invitation.invitedUser.firstName} {invitation.invitedUser.lastName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-storypad-dark-text-light">@{invitation.invitedUser.username}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-medium">
                      {invitation.role} (pending)
                    </span>
                    
                    {isOwner && (
                      <button
                        onClick={() => cancelInvitation(invitation._id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm px-2 py-1"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite New Collaborator */}
      {isOwner && (
        <div>
          <h4 className="text-md font-medium text-gray-700 dark:text-storypad-dark-text mb-3">
            Invite New Collaborator
          </h4>
          
          <form onSubmit={handleInvite} className="space-y-4">
            {/* User Search */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users by name, username, or email..."
                className="w-full p-3 border border-gray-300 dark:border-storypad-dark-border bg-white dark:bg-storypad-dark-bg text-gray-900 dark:text-storypad-dark-text rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              {searching && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              )}

              {/* Search Results Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-storypad-dark-surface border border-gray-300 dark:border-storypad-dark-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user._id}
                      type="button"
                      onClick={() => handleUserSelect(user)}
                      className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-storypad-dark-bg border-b border-gray-100 dark:border-storypad-dark-border last:border-b-0"
                    >
                      <div className="font-medium text-gray-900 dark:text-storypad-dark-text">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-storypad-dark-text-light">
                        @{user.username} • {user.email}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-storypad-dark-text mb-2">
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-storypad-dark-border bg-white dark:bg-storypad-dark-bg text-gray-900 dark:text-storypad-dark-text rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="editor">Editor - Can edit and view content</option>
                <option value="viewer">Viewer - Can only view content</option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!selectedUser || loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending Invitation...' : 'Send Invitation'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default CollaborationPanel;