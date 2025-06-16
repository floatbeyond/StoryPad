import { Link } from 'react-router-dom';


const NotFound = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-storypad-dark-bg pt-6">
    {/* Content */}
    <div className="flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-5xl font-bold text-blue-700 dark:text-blue-400 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-storypad-dark-text mb-2">Page Not Found</h2>
      <p className="text-gray-600 dark:text-storypad-dark-text-light mb-6 max-w-md">
        Sorry, the page you are looking for does not exist.
      </p>
      <Link
        to="/"
        className="btn-primary px-6 py-2 rounded text-white bg-blue-600 hover:bg-blue-700 transition"
      >
        Go Home
      </Link>
    </div>
  </div>
);

export default NotFound;
