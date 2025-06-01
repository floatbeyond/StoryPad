import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [username, setUsername] = useState(null);
  const [invitationCount, setInvitationCount] = useState(0);
  const navigate = useNavigate();
  

  useEffect(() => {
    setUsername(localStorage.getItem('username'));
    if (localStorage.getItem('token')) {
      fetchInvitationCount();
    }
  }, []);

  useEffect(() => {
    const handleStorage = () => {
      setUsername(localStorage.getItem('username'));
      if (localStorage.getItem('token')) {
        fetchInvitationCount();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const fetchInvitationCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/invitations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setInvitationCount(data.invitations.length);
      }
    } catch (err) {
      console.error('Error fetching invitation count:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('username');
    localStorage.removeItem('token');
    setUsername(null);
    setIsMenuOpen(false);
    setShowProfileDropdown(false);
    navigate('/');
  };

  return (
    <nav className="navbar sticky top-0 z-10 bg-white border-b shadow-sm">
      <div className="container-custom">
        <div className="flex justify-between items-center py-3">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold text-storypad-primary">
              Story<span className="text-storypad-accent">Pad</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            <Link to="/browse" className="text-storypad-text hover:text-storypad-primary transition-colors">Browse</Link>
            <Link to="/categories" className="text-storypad-text hover:text-storypad-primary transition-colors">Categories</Link>
            <Link to="/community" className="text-storypad-text hover:text-storypad-primary transition-colors">Community</Link>
            <Link to="/mystories" className="text-storypad-text hover:text-storypad-primary transition-colors">My Stories</Link>
          </div>

          {/* Desktop Auth/Profile Buttons */}
          <div className="hidden md:flex space-x-4 items-center">
            {username ? (
              <div className="relative">
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {username?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{username}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Profile Dropdown */}
                {showProfileDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-50">
                    <div className="py-2">
                      {/* Profile Header */}
                      <div className="px-4 py-2 border-b">
                        <p className="text-sm font-medium text-gray-900">{username}</p>
                        <p className="text-xs text-gray-500">Signed in</p>
                      </div>

                      {/* My Stories */}
                      <Link
                        to="/mystories"
                        onClick={() => setShowProfileDropdown(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        📚 My Stories
                      </Link>

                      {/* New Story */}
                      <Link
                        to="/newwrite"
                        onClick={() => setShowProfileDropdown(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        ✍️ Write New Story
                      </Link>

                      {/* Invitations */}
                      <Link
                        to="/invitations"
                        onClick={() => setShowProfileDropdown(false)}
                        className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <span className="flex items-center">
                          📨 Invitations
                        </span>
                        {invitationCount > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                            {invitationCount}
                          </span>
                        )}
                      </Link>

                      {/* Profile Settings */}
                      <Link
                        to="/profile"
                        onClick={() => setShowProfileDropdown(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        ⚙️ Profile Settings
                      </Link>

                      {/* Divider */}
                      <div className="border-t my-1"></div>

                      {/* Logout */}
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        🚪 Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-secondary">Log In</Link>
                <Link to="/signup" className="btn-primary">Sign Up</Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-storypad-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-2 pb-4">
            <div className="flex flex-col space-y-3">
              <Link to="/browse" className="text-storypad-text hover:text-storypad-primary py-2" onClick={() => setIsMenuOpen(false)}>Browse</Link>
              <Link to="/categories" className="text-storypad-text hover:text-storypad-primary py-2" onClick={() => setIsMenuOpen(false)}>Categories</Link>
              <Link to="/community" className="text-storypad-text hover:text-storypad-primary py-2" onClick={() => setIsMenuOpen(false)}>Community</Link>
              <Link to="/mystories" className="text-storypad-text hover:text-storypad-primary py-2" onClick={() => setIsMenuOpen(false)}>My Stories</Link>

              <div className="flex flex-col space-y-2 mt-4">
                {username ? (
                  <>
                    <span className="text-storypad-primary font-semibold text-center">Hello {username}</span>
                    <Link to="/mystories" className="btn-secondary text-center" onClick={() => setIsMenuOpen(false)}>My Stories</Link>
                    <Link to="/newwrite" className="btn-secondary text-center" onClick={() => setIsMenuOpen(false)}>New Story</Link>
                    <Link to="/invitations" className="btn-secondary text-center flex items-center justify-center" onClick={() => setIsMenuOpen(false)}>
                      Invitations {invitationCount > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-2 ml-2">{invitationCount}</span>}
                    </Link>
                    <Link to="/profile" className="btn-secondary text-center" onClick={() => setIsMenuOpen(false)}>Profile</Link>
                    <button onClick={handleLogout} className="btn-secondary text-center">Logout</button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="btn-secondary text-center" onClick={() => setIsMenuOpen(false)}>Log In</Link>
                    <Link to="/signup" className="btn-primary text-center" onClick={() => setIsMenuOpen(false)}>Sign Up</Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Close dropdown when clicking outside */}
        {showProfileDropdown && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowProfileDropdown(false)}
          ></div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;