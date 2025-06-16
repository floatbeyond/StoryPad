import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-storypad-dark dark:bg-storypad-dark-surface text-white py-12 mt-16">
      <div className="container-custom">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-1">
            <div className="mb-4">
              <h3 className="text-2xl font-bold">
                Story<span className="text-storypad-accent dark:text-storypad-dark-accent">Pad</span>
              </h3>
              <p className="text-gray-300 dark:text-storypad-dark-text-light mt-2 text-sm">
                The home for great stories and the people who write them.
              </p>
            </div>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 dark:text-storypad-dark-text-light hover:text-white dark:hover:text-storypad-dark-text transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#" className="text-gray-300 dark:text-storypad-dark-text-light hover:text-white dark:hover:text-storypad-dark-text transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="#" className="text-gray-300 dark:text-storypad-dark-text-light hover:text-white dark:hover:text-storypad-dark-text transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.749.097.118.112.221.083.343-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Discover</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/browse" className="text-gray-300 dark:text-storypad-dark-text-light hover:text-white dark:hover:text-storypad-dark-text transition-colors">
                  Browse Stories
                </Link>
              </li>
              <li>
                <Link to="/browse?filter=popular" className="text-gray-300 dark:text-storypad-dark-text-light hover:text-white dark:hover:text-storypad-dark-text transition-colors">
                  Popular Stories
                </Link>
              </li>
              <li>
                <Link to="/browse?filter=new" className="text-gray-300 dark:text-storypad-dark-text-light hover:text-white dark:hover:text-storypad-dark-text transition-colors">
                  New Releases
                </Link>
              </li>
              <li>
                <Link to="/browse?category=Fantasy" className="text-gray-300 dark:text-storypad-dark-text-light hover:text-white dark:hover:text-storypad-dark-text transition-colors">
                  Featured Writers
                </Link>
              </li>
            </ul>
          </div>

          {/* For Writers */}
          <div>
            <h4 className="text-lg font-semibold mb-4">For Writers</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/write" className="text-gray-300 dark:text-storypad-dark-text-light hover:text-white dark:hover:text-storypad-dark-text transition-colors">
                  Start Writing
                </Link>
              </li>
              <li>
                <Link to="/mystories" className="text-gray-300 dark:text-storypad-dark-text-light hover:text-white dark:hover:text-storypad-dark-text transition-colors">
                  My Stories
                </Link>
              </li>
              <li>
                <a href="#" className="text-gray-300 dark:text-storypad-dark-text-light hover:text-white dark:hover:text-storypad-dark-text transition-colors">
                  Writing Tips
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 dark:text-storypad-dark-text-light hover:text-white dark:hover:text-storypad-dark-text transition-colors">
                  Community Guidelines
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-gray-300 dark:text-storypad-dark-text-light hover:text-white dark:hover:text-storypad-dark-text transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 dark:text-storypad-dark-text-light hover:text-white dark:hover:text-storypad-dark-text transition-colors">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 dark:text-storypad-dark-text-light hover:text-white dark:hover:text-storypad-dark-text transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 dark:text-storypad-dark-text-light hover:text-white dark:hover:text-storypad-dark-text transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-600 dark:border-gray-700 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-300 dark:text-storypad-dark-text-light">
              © 2024 StoryPad. All rights reserved.
            </div>
            <div className="mt-4 md:mt-0">
              <div className="flex items-center space-x-4 text-sm text-gray-300 dark:text-storypad-dark-text-light">
                <span>Made with ❤️ for storytellers</span>
                <span>•</span>
                <span>Version 1.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
