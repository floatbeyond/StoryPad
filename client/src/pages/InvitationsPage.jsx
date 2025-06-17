import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const InvitationsPage = () => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingInvitation, setProcessingInvitation] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Please log in to view invitations');
        setLoading(false);
        return;
      }

      // Use /api/user/invitations instead of /api/users/
      const response = await fetch(`${API_BASE_URL}/api/user/invitations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations);
      } else {
        setError('Failed to load invitations');
      }
    } catch (err) {
      console.error('Error fetching invitations:', err);
      setError('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (storyId, invitationId, response) => {
    setProcessingInvitation(invitationId);
    try {
      const token = localStorage.getItem('token');
      
      const res = await fetch(`${API_BASE_URL}/api/stories/${storyId}/invitations/${invitationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ response })
      });

      const data = await res.json();
      
      if (res.ok) {
        // Remove the invitation from the list
        setInvitations(prev => prev.filter(inv => inv._id !== invitationId));
        
        if (response === 'accepted') {
          alert('🎉 Invitation accepted! You can now collaborate on this story.');
          // Navigate to the story after a short delay
          setTimeout(() => navigate(`/write/${storyId}`), 1000);
        } else {
          alert('📝 Invitation declined.');
        }
      } else {
        throw new Error(data.message || 'Failed to respond to invitation');
      }
    } catch (err) {
      console.error('❌ Error responding to invitation:', err);
      alert('Error: ' + err.message);
    } finally {
      setProcessingInvitation(null);
    }
  };

  if (loading) return (
    <div className="container-custom py-8">
      <div className="text-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p>Loading your invitations...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="container-custom py-8">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-600">Error: {error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="btn-primary mt-4"
        >
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="container-custom py-8 bg-gray-50 dark:bg-storypad-dark-bg min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <BackButton />
        <h1 className="text-3xl font-bold dark:text-storypad-dark-text">Collaboration Invitations</h1>
        <button 
          onClick={fetchInvitations}
          className="btn-secondary text-sm"
        >
          🔄 Refresh
        </button>
      </div>
      
      {invitations.length === 0 ? (
        <div className="bg-white dark:bg-storypad-dark-surface rounded-lg shadow p-8 text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2m13-4h-2m-5-4v2m0 0v2m0-2h2m-2 0H9" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-storypad-dark-text mb-2">No pending invitations</h3>
          <p className="text-gray-600 dark:text-storypad-dark-text-light">You don't have any collaboration invitations at the moment.</p>
          <button 
            onClick={() => navigate('/mystories')}
            className="btn-primary mt-4"
          >
            View Your Stories
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {invitations.map((invitation) => (
            <div key={invitation._id} className="bg-white dark:bg-storypad-dark-surface rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-storypad-dark-text mb-2">
                    {invitation.story.title}
                  </h3>
                  <p className="text-gray-600 dark:text-storypad-dark-text-light mb-3 line-clamp-2">
                    {invitation.story.description}
                  </p>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-storypad-dark-text-light">
                    <div className="flex items-center">
                      <span className="font-medium">Invited by:</span>
                      <span className="ml-1 text-blue-600 dark:text-blue-400">{invitation.invitedBy.username}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium">Role:</span>
                      <span className={`ml-1 px-2 py-1 rounded text-xs font-medium ${
                        invitation.role === 'editor' 
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                          : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                      }`}>
                        {invitation.role}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(invitation.invitedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => handleResponse(invitation.story._id, invitation._id, 'accepted')}
                  disabled={processingInvitation === invitation._id}
                  className="btn-primary px-6 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingInvitation === invitation._id ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      ✅ Accept
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => handleResponse(invitation.story._id, invitation._id, 'declined')}
                  disabled={processingInvitation === invitation._id}
                  className="btn-secondary px-6 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingInvitation === invitation._id ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      ❌ Decline
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => navigate(`/story/${invitation.story._id}/preview`)}
                  className="btn-outline px-6 py-2"
                >
                  👁️ Preview Story
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Summary */}
      {invitations.length > 0 && (
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-blue-800 dark:text-blue-300 text-sm">
            📊 You have <strong>{invitations.length}</strong> pending invitation{invitations.length !== 1 ? 's' : ''} 
            waiting for your response.
          </p>
        </div>
      )}
    </div>
  );
};

export default InvitationsPage;