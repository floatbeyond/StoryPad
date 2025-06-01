import { useState, useEffect } from 'react';

const CollaborationPanel = ({ storyId, isOwner }) => {
  const [collaborators, setCollaborators] = useState(null);
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
    const searchUsers = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      setSearching(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/users/search?query=${encodeURIComponent(searchQuery)}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.users);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300); // Debounce search
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const fetchCollaborators = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/stories/${storyId}/collaborators`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCollaborators(data.collaborators);
      }
    } catch (err) {
      console.error('Failed to load collaborators:', err);
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setSearchQuery(user.username);
    setShowDropdown(false);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    
    if (!selectedUser) {
      setError('Please select a user from the search results');
      return;
    }

    // Check if user is already invited or collaborating
    const isAlreadyCollaborator = collaborators?.collaborators?.some(
      collab => collab.user._id === selectedUser._id
    );
    const hasPendingInvitation = collaborators?.pendingInvitations?.some(
      inv => inv.invitedUser._id === selectedUser._id
    );

    if (isAlreadyCollaborator) {
      setError('This user is already a collaborator');
      return;
    }

    if (hasPendingInvitation) {
      setError('This user already has a pending invitation');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/stories/${storyId}/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userEmail: selectedUser.email, // Backend still expects email
          role: inviteRole
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setSearchQuery('');
        setSelectedUser(null);
        setSuccess(`Invitation sent to ${selectedUser.username}!`);
        fetchCollaborators(); // Refresh the list
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  if (!storyId || storyId === 'new') {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-gray-600">Save your story first to invite collaborators</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Invite Form (only for owner) */}
      {isOwner && (
        <div>
          <h4 className="font-medium text-sm text-gray-700 mb-3">Invite Collaborator</h4>
          <form onSubmit={handleInvite} className="space-y-3">
            {/* User Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search users by username..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedUser(null);
                }}
                className="input w-full"
                required
              />
              
              {searching && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              )}

              {/* Search Results Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user._id}
                      type="button"
                      onClick={() => handleUserSelect(user)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    >
                      <div className="font-medium">{user.username}</div>
                      <div className="text-sm text-gray-500">
                        {user.firstName} {user.lastName} • {user.email}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* No results message */}
              {showDropdown && searchResults.length === 0 && searchQuery.length >= 2 && !searching && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4 text-center text-gray-500">
                  No users found matching "{searchQuery}"
                </div>
              )}
            </div>

            {/* Role Selection */}
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="input w-full"
            >
              <option value="editor">Editor (can edit story)</option>
              <option value="viewer">Viewer (read-only)</option>
            </select>

            {/* Send Button */}
            <button
              type="submit"
              disabled={loading || !selectedUser}
              className={`btn-primary w-full ${(!selectedUser || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Sending...' : `Send Invitation${selectedUser ? ` to ${selectedUser.username}` : ''}`}
            </button>
          </form>
          
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          {success && <p className="text-green-500 text-sm mt-2">{success}</p>}
        </div>
      )}

      {/* Current Collaborators */}
      {collaborators && (
        <div className="border-t pt-4">
          <h5 className="font-medium text-sm text-gray-700 mb-2">Current Status:</h5>
          <p className="text-sm text-gray-600">
            {isOwner ? 'You are the owner' : 'You are collaborating'}
          </p>
          
          {collaborators.collaborators?.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                {collaborators.collaborators.length} active collaborator{collaborators.collaborators.length !== 1 ? 's' : ''}
              </p>
              <div className="mt-1 space-y-1">
                {collaborators.collaborators.map((collab, idx) => (
                  <div key={idx} className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                    {collab.user.username} ({collab.role})
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {collaborators.pendingInvitations?.length > 0 && (
            <p className="text-sm text-yellow-600 mt-1">
              {collaborators.pendingInvitations.length} pending invitation{collaborators.pendingInvitations.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default CollaborationPanel;