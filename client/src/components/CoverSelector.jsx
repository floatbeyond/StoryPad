import { useState } from 'react';
import { handleImageError } from '../utils/imageUtils.jsx';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_BASE = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;
const COVER_CATEGORIES = {
  'Adventure': { count: 4, folderName: 'adventure' },
  'Classic Literature': { count: 4, folderName: 'classic-literature' },
  'Cyberpunk': { count: 3, folderName: 'cyberpunk' },
  'Dystopian': { count: 3, folderName: 'dystopian' },
  'Fantasy': { count: 4, folderName: 'fantasy' },
  'Historical': { count: 4, folderName: 'historical' },
  'Horror': { count: 4, folderName: 'horror' },
  'Mystery': { count: 4, folderName: 'mystery' },
  'Poetry': { count: 4, folderName: 'poetry' },
  'Romance': { count: 5, folderName: 'romance' },
  'Science Fiction': { count: 4, folderName: 'scifi' },
  'Thriller': { count: 3, folderName: 'thriller' }
};

// Generate predefined covers based on your folder structure
const generatePredefinedCovers = () => {
  if (!CLOUD_NAME) {
    console.warn('⚠️ Cloudinary cloud name not configured');
    return [{
      id: 'default',
      url: 'https://via.placeholder.com/400x600?text=Default+Cover',
      name: 'Default Cover',
      category: 'General'
    }];
  }

  const covers = [
    {
      id: 'default',
      url: `${CLOUDINARY_BASE}/default-cover.png`, // Update if your default has different name
      name: 'Default Cover',
      category: 'General'
    }
  ];

  Object.entries(COVER_CATEGORIES).forEach(([categoryName, config]) => {
    for (let i = 1; i <= config.count; i++) {
      covers.push({
        id: `${config.folderName}-${i}`,
        url: `${CLOUDINARY_BASE}/${config.folderName}${i}.jpg`, // ✅ Simple format without version
        name: `${categoryName} ${i}`,
        category: categoryName
      });
    }
  });

  return covers;
};

const PREDEFINED_COVERS = generatePredefinedCovers();

const CoverSelector = ({ currentCover, onCoverSelect, onUpload, storyCategories = [] }) => {
  const [activeTab, setActiveTab] = useState('predefined');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Get unique categories for filter
  const categories = ['All', 'General', ...Object.keys(COVER_CATEGORIES)];

  // Filter covers based on selected category
  const getFilteredCovers = () => {
    if (selectedCategory === 'All') {
      return PREDEFINED_COVERS;
    }
    
    return PREDEFINED_COVERS.filter(cover => cover.category === selectedCategory);
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('predefined')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'predefined'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📚 Choose from Library ({PREDEFINED_COVERS.length})
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'upload'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📤 Upload Custom
        </button>
      </div>

      {/* Current Cover Preview */}
      <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
        <div className="w-16 h-20 rounded overflow-hidden shadow-sm">
          <img
            src={currentCover}
            alt="Current cover"
            className="w-full h-full object-cover"
            onError={handleImageError}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">Current Cover</p>
          <p className="text-xs text-gray-500">Click below to change</p>
        </div>
      </div>

      {/* Predefined Covers Tab */}
      {activeTab === 'predefined' && (
        <div className="space-y-4">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 text-xs rounded-full transition-colors whitespace-nowrap ${
                  selectedCategory === category
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category}
                {category !== 'All' && (
                  <span className="ml-1 text-xs opacity-75">
                    ({category === 'General' ? 1 : COVER_CATEGORIES[category]?.count || 0})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Cover Grid */}
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-64 overflow-y-auto">
            {getFilteredCovers().map(cover => (
              <div
                key={cover.id}
                className={`relative cursor-pointer group transition-all rounded-lg overflow-hidden ${
                  currentCover === cover.url
                    ? 'ring-2 ring-blue-500 ring-offset-1'
                    : 'hover:ring-2 hover:ring-gray-300'
                }`}
                onClick={() => onCoverSelect(cover.url)}
              >
                <div className="aspect-[3/4]">
                  <img
                    src={cover.url}
                    alt={cover.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    onError={handleImageError}
                  />
                </div>
                
                {/* Selection Indicator */}
                {currentCover === cover.url && (
                  <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}

                {/* Category Badge */}
                <div className="absolute top-1 left-1">
                  <span className="bg-black bg-opacity-75 text-white text-xs px-1 py-0.5 rounded">
                    {cover.category}
                  </span>
                </div>

                {/* Hover Tooltip */}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-1 transform translate-y-full group-hover:translate-y-0 transition-transform">
                  <p className="truncate">{cover.name}</p>
                </div>
              </div>
            ))}
          </div>

          {getFilteredCovers().length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No covers found for "{selectedCategory}"</p>
              <button
                onClick={() => setSelectedCategory('All')}
                className="text-blue-600 hover:text-blue-800 text-sm mt-1"
              >
                Show all covers
              </button>
            </div>
          )}
        </div>
      )}

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <div className="mt-2">
              <label htmlFor="cover-upload" className="cursor-pointer">
                <span className="block text-sm font-medium text-gray-900 mb-1">
                  Upload your own cover image
                </span>
                <span className="block text-xs text-gray-500 mb-3">
                  PNG, JPG, GIF up to 5MB. Recommended: 400x600px
                </span>
                <span className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                  Choose File
                </span>
                <input
                  id="cover-upload"
                  type="file"
                  accept="image/*"
                  onChange={onUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Upload Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">📋 Cover Image Tips:</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Use high-resolution images (at least 400x600px)</li>
              <li>• Portrait orientation works best for book covers</li>
              <li>• Ensure text is readable if you include any</li>
              <li>• Consider your story's genre and mood</li>
              <li>• File size should be under 5MB</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoverSelector;