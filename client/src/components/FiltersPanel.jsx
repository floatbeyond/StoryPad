import { useState } from 'react';

const FiltersPanel = ({ filters, setFilters, allCategories, maxChapters }) => {
  // Handle chapter range changes
  const handleChapterRangeChange = (type, value) => {
    const numValue = parseInt(value) || 0;
    setFilters(prev => ({
      ...prev,
      chaptersRange: {
        ...prev.chaptersRange,
        [type]: numValue
      }
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 sticky top-4">
      {/* Chapters Range */}
      <div className="mb-6">
        <h3 className="text-gray-800 font-semibold mb-3">Number of Chapters</h3>
        <div className="flex items-center gap-2">
            <div>
            <label className="block text-sm text-gray-600 mb-1">From</label>
            <input
                type="number"
                min="0"
                max={filters.chaptersRange.max}
                value={filters.chaptersRange.min}
                onChange={(e) => handleChapterRangeChange('min', e.target.value)}
                className="w-24 px-2 py-1 border rounded text-sm"
            />
            </div>
            <span className="text-gray-400 pt-6">-</span>
            <div>
            <label className="block text-sm text-gray-600 mb-1">To</label>
            <input
                type="number"
                min={filters.chaptersRange.min}
                max={maxChapters}
                value={filters.chaptersRange.max}
                onChange={(e) => handleChapterRangeChange('max', e.target.value)}
                className="w-24 px-2 py-1 border rounded text-sm"
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="mb-6">
        <h3 className="text-gray-800 font-semibold mb-3">Categories</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {allCategories.map(category => (
            <label key={category} className="flex items-center">
              <input
                type="checkbox"
                checked={filters.selectedCategories.includes(category)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFilters(prev => ({
                      ...prev,
                      selectedCategories: [...prev.selectedCategories, category]
                    }));
                  } else {
                    setFilters(prev => ({
                      ...prev,
                      selectedCategories: prev.selectedCategories.filter(c => c !== category)
                    }));
                  }
                }}
                className="rounded text-blue-600"
              />
              <span className="ml-2 text-sm text-gray-600">{category}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Time Filter */}
      <div className="mb-6">
        <h3 className="text-gray-800 font-semibold mb-3">Last Published</h3>
        <select
          value={filters.timeFilter}
          onChange={(e) => setFilters(prev => ({ ...prev, timeFilter: e.target.value }))}
          className="w-full p-2 border rounded text-sm"
        >
          <option value="all">All Time</option>
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
          <option value="3months">Last 3 Months</option>
          <option value="6months">Last 6 Months</option>
          <option value="year">Last Year</option>
        </select>
      </div>

      {/* Status */}
      <div className="mb-6">
        <h3 className="text-gray-800 font-semibold mb-3">Status</h3>
        <select
          value={filters.completion}
          onChange={(e) => setFilters(prev => ({ ...prev, completion: e.target.value }))}
          className="w-full p-2 border rounded text-sm"
        >
          <option value="all">All Stories</option>
          <option value="completed">Completed Only</option>
          <option value="ongoing">Ongoing Only</option>
        </select>
      </div>

      {/* Clear Filters */}
      <button
        onClick={() => setFilters({
          chaptersRange: { min: 0, max: maxChapters },
          selectedCategories: [],
          timeFilter: 'all',
          completion: 'all'
        })}
        className="w-full py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
      >
        Clear All Filters
      </button>
    </div>
  );
};

export default FiltersPanel;