import { useState } from 'react';

const PublishModal = ({ 
  isOpen, 
  onClose, 
  chapters, 
  initialSelectedChapters = [], 
  onPublish 
}) => {
  const [selectedChapters, setSelectedChapters] = useState(initialSelectedChapters);

  if (!isOpen) return null;

  const handleToggleChapter = (index) => {
    setSelectedChapters(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handlePublish = () => {
    onPublish(selectedChapters);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-semibold mb-4">Select Chapters to Publish</h3>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {chapters.map((chapter, idx) => (
            <label 
              key={idx} 
              className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedChapters.includes(idx) || chapter.published}
                onChange={() => handleToggleChapter(idx)}
                disabled={chapter.published}
                className="w-4 h-4 text-blue-600 rounded border-gray-300"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Chapter {idx + 1}</p>
                  {chapter.published && (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                      Already Published
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {chapter.title || 'Untitled'}
                </p>
              </div>
            </label>
          ))}
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={selectedChapters.length === 0}
            className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700
              ${selectedChapters.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Publish Selected
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublishModal;