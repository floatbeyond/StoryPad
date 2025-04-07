import { useState } from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="navbar sticky top-0 z-10">
      <div className="container-custom">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold text-storypad-primary">Story<span className="text-storypad-accent">Pad</span></span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            <Link to="/browse" className="text-storypad-text hover:text-storypad-primary transition-colors">Browse</Link>
            <Link to="/categories" className="text-storypad-text hover:text-storypad-primary transition-colors">Categories</Link>
            <Link to="/community" className="text-storypad-text hover:text-storypad-primary transition-colors">Community</Link>
            <Link to="/write" className="text-storypad-text hover:text-storypad-primary transition-colors">Write</Link>
          </div>

          {/* Auth Buttons - Desktop */}
          <div className="hidden md:flex space-x-4">
            <Link to="/login" className="btn-secondary">Log In</Link>
            <Link to="/signup" className="btn-primary">Sign Up</Link>
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
          <div className="md:hidden mt-4 pb-4">
            <div className="flex flex-col space-y-3">
              <Link to="/browse" className="text-storypad-text hover:text-storypad-primary transition-colors py-2">Browse</Link>
              <Link to="/categories" className="text-storypad-text hover:text-storypad-primary transition-colors py-2">Categories</Link>
              <Link to="/community" className="text-storypad-text hover:text-storypad-primary transition-colors py-2">Community</Link>
              <Link to="/write" className="text-storypad-text hover:text-storypad-primary transition-colors py-2">Write</Link>
              <div className="flex space-x-4 mt-2">
                <Link to="/login" className="btn-secondary flex-1 text-center">Log In</Link>
                <Link to="/signup" className="btn-primary flex-1 text-center">Sign Up</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
