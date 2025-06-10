// src/components/ConfirmationModal.js
import React from 'react';

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel"
}) => {
  if (!isOpen) {
    return null;
  }

  // The main change is in the className of this div:
  // Removed: bg-black bg-opacity-50
  // Kept: fixed inset-0 to cover the screen for positioning and click-outside
  // Kept: flex items-center justify-center to center the modal box
  // Kept: z-50 to ensure it's on top
  // Kept: p-4 for some padding around the modal box if screen is small
  return (
    <div
      className="fixed inset-0 overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4"
      onClick={onClose} // Allows closing by clicking outside the modal content box
    >
      {/* Modal Content Box */}
      <div
        className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm transform transition-all duration-300 ease-in-out scale-100 opacity-100"
        onClick={(e) => e.stopPropagation()} // Prevents modal closing when clicking inside the content box
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
        <p className="text-sm text-gray-600 mb-6 whitespace-pre-wrap">{message}</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            type="button"
            className="btn btn-ghost btn-sm" // DaisyUI-like class
            // Example for plain Tailwind:
            // className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            type="button"
            className="btn btn-primary btn-sm" // DaisyUI-like class
            // Example for plain Tailwind:
            // className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;