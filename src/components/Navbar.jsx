import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [username, setUsername] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setUsername(localStorage.getItem('username'));
  }, []);

  useEffect(() => {
    const handleStorage = () => setUsername(localStorage.getItem('username'));
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('username');
    setUsername(null);
    setIsMenuOpen(false);
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
            <Link to="/write" className="text-storypad-text hover:text-storypad-primary transition-colors">Write</Link>
          </div>

          {/* Desktop Auth/Profile Buttons */}
          <div className="hidden md:flex space-x-4 items-center">
            {username ? (
              <>
                <span className="text-storypad-primary font-semibold">Hello {username}!</span>
                <Link to="/profile" className="btn-secondary">Profile</Link>
                <button onClick={handleLogout} className="btn-secondary ml-2">Logout</button>
              </>
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
              <Link to="/write" className="text-storypad-text hover:text-storypad-primary py-2" onClick={() => setIsMenuOpen(false)}>Write</Link>

              <div className="flex flex-col space-y-2 mt-4">
                {username ? (
                  <>
                    <span className="text-storypad-primary font-semibold text-center">Hello {username}</span>
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
      </div>
    </nav>
  );
};

export default Navbar;
