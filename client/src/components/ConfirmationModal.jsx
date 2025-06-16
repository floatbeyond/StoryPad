import React from 'react';

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger", // "danger" | "warning" | "info"
  details = null,
  isLoading = false
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          confirmBtn: 'bg-red-600 hover:bg-red-700'
        };
      case 'warning':
        return {
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          confirmBtn: 'bg-yellow-600 hover:bg-yellow-700'
        };
      case 'info':
        return {
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          confirmBtn: 'bg-blue-600 hover:bg-blue-700'
        };
      default:
        return {
          iconBg: 'bg-gray-100',
          iconColor: 'text-gray-600',
          confirmBtn: 'bg-gray-600 hover:bg-gray-700'
        };
    }
  };

  const styles = getTypeStyles();

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
        );
      case 'warning':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        );
      case 'info':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        {/* Icon */}
        <div className={`flex items-center justify-center w-12 h-12 mx-auto ${styles.iconBg} rounded-full mb-4`}>
          <svg className={`w-6 h-6 ${styles.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {getIcon()}
          </svg>
        </div>
        
        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
          {title}
        </h3>
        
        {/* Message */}
        <div className="text-gray-600 text-center mb-4">
          {typeof message === 'string' ? <p>{message}</p> : message}
        </div>

        {/* Details */}
        {details && (
          <div className="text-sm text-gray-500 bg-gray-50 rounded p-3 mb-6">
            {details}
          </div>
        )}
        
        {/* Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 text-white rounded-lg font-medium disabled:opacity-50 ${styles.confirmBtn}`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;