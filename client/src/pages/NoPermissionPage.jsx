// Create client/src/pages/NoPermissionPage.jsx:

import { useNavigate } from 'react-router-dom';

const NoPermissionPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-storypad-dark-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-storypad-dark-surface rounded-lg shadow-md p-8 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v3m0-3h3m-3 0h-3m-3-7V9a6 6 0 1112 0v3" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-storypad-dark-text mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-storypad-dark-text-light mb-6">
            You don't have permission to edit this story. Only the author and invited collaborators can make changes.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            ← Go Back
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-storypad-dark-text px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            🏠 Home
          </button>
          
          <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
            <p className="text-sm text-gray-500 dark:text-storypad-dark-text-light mb-3">
              Want to start writing your own stories?
            </p>
            <button
              onClick={() => navigate('/write')}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              ✍️ Create New Story
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoPermissionPage;