import { useState, useRef, useCallback } from 'react';

const ImageCropper = ({ imageSrc, onCrop, onCancel, aspectRatio = 1 }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 200, height: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizing, setResizing] = useState(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  const handleMouseDown = useCallback((e, type = 'move') => {
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (type === 'move') {
      setIsDragging(true);
      setDragStart({ x: x - crop.x, y: y - crop.y });
    } else {
      setResizing(type);
      setDragStart({ x, y });
    }
  }, [crop]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging && !resizing) return;

    const rect = containerRef.current.getBoundingClientRect();
    const imageRect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const maxX = imageRect.width;
    const maxY = imageRect.height;

    if (isDragging) {
      const newX = Math.max(0, Math.min(x - dragStart.x, maxX - crop.width));
      const newY = Math.max(0, Math.min(y - dragStart.y, maxY - crop.height));
      setCrop(prev => ({ ...prev, x: newX, y: newY }));
    } else if (resizing) {
      let newCrop = { ...crop };

      if (resizing.includes('right')) {
        newCrop.width = Math.max(50, Math.min(x - crop.x, maxX - crop.x));
      }
      if (resizing.includes('left')) {
        const newWidth = Math.max(50, crop.width + (crop.x - x));
        const newX = Math.max(0, Math.min(x, crop.x + crop.width - 50));
        newCrop.x = newX;
        newCrop.width = newWidth;
      }
      if (resizing.includes('bottom')) {
        newCrop.height = Math.max(50, Math.min(y - crop.y, maxY - crop.y));
      }
      if (resizing.includes('top')) {
        const newHeight = Math.max(50, crop.height + (crop.y - y));
        const newY = Math.max(0, Math.min(y, crop.y + crop.height - 50));
        newCrop.y = newY;
        newCrop.height = newHeight;
      }

      // Maintain aspect ratio if specified
      if (aspectRatio) {
        if (resizing.includes('right') || resizing.includes('left')) {
          newCrop.height = newCrop.width / aspectRatio;
        } else {
          newCrop.width = newCrop.height * aspectRatio;
        }
      }

      setCrop(newCrop);
    }
  }, [isDragging, resizing, dragStart, crop, aspectRatio]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setResizing(null);
  }, []);

  const handleCrop = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const image = imageRef.current;

    // Calculate scale factors
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Set canvas size to crop size
    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;

    // Draw the cropped image
    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    // Convert to blob and call onCrop
    canvas.toBlob((blob) => {
      onCrop(blob);
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-storypad-dark-surface rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-storypad-dark-text mb-4">
          Crop Your Profile Picture
        </h3>
        
        <div 
          ref={containerRef}
          className="relative inline-block border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Crop preview"
            className="max-w-full max-h-96 object-contain"
            draggable={false}
          />
          
          {/* Crop overlay */}
          <div 
            className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-20 cursor-move"
            style={{
              left: crop.x,
              top: crop.y,
              width: crop.width,
              height: crop.height,
            }}
            onMouseDown={(e) => handleMouseDown(e, 'move')}
          >
            {/* Grid lines */}
            <div className="absolute inset-0">
              {/* Vertical lines */}
              <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white bg-opacity-50"></div>
              <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white bg-opacity-50"></div>
              {/* Horizontal lines */}
              <div className="absolute top-1/3 left-0 right-0 h-px bg-white bg-opacity-50"></div>
              <div className="absolute top-2/3 left-0 right-0 h-px bg-white bg-opacity-50"></div>
            </div>

            {/* Resize handles */}
            <div 
              className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 border border-white cursor-nw-resize"
              onMouseDown={(e) => handleMouseDown(e, 'top-left')}
            ></div>
            <div 
              className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border border-white cursor-ne-resize"
              onMouseDown={(e) => handleMouseDown(e, 'top-right')}
            ></div>
            <div 
              className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 border border-white cursor-sw-resize"
              onMouseDown={(e) => handleMouseDown(e, 'bottom-left')}
            ></div>
            <div 
              className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border border-white cursor-se-resize"
              onMouseDown={(e) => handleMouseDown(e, 'bottom-right')}
            ></div>
            
            {/* Side handles */}
            <div 
              className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 border border-white cursor-n-resize"
              onMouseDown={(e) => handleMouseDown(e, 'top')}
            ></div>
            <div 
              className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 border border-white cursor-s-resize"
              onMouseDown={(e) => handleMouseDown(e, 'bottom')}
            ></div>
            <div 
              className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-blue-500 border border-white cursor-w-resize"
              onMouseDown={(e) => handleMouseDown(e, 'left')}
            ></div>
            <div 
              className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-blue-500 border border-white cursor-e-resize"
              onMouseDown={(e) => handleMouseDown(e, 'right')}
            ></div>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600 dark:text-storypad-dark-text-light">
          Drag to move the crop area, use the handles to resize. The grid helps you align your image.
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCrop}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Crop & Upload
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;
