// src/components/EditItemForm.js
import React, { useState, useEffect } from 'react';
// Removed axios import, parent will handle API call

const EditItemForm = ({ itemToEdit, onItemUpdateTrigger, onCancelEdit, isSubmitting }) => { // Renamed onItemUpdated
  const [item, setItem] = useState({
    name: '',
    unit: '',
    materialCost: '',
    laborCost: ''
  });
  const [error, setError] = useState(null);
  // Success state is removed, parent will handle success feedback

  useEffect(() => {
    if (itemToEdit) {
      setItem({
        name: itemToEdit.name || '',
        unit: itemToEdit.unit || '',
        materialCost: itemToEdit.materialCost != null ? String(itemToEdit.materialCost) : '0',
        laborCost: itemToEdit.laborCost != null ? String(itemToEdit.laborCost) : '0'
      });
      setError(null); // Clear error when form repopulates
    }
  }, [itemToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setItem(prevItem => ({ ...prevItem, [name]: value }));
  };

  const handleSubmit = (e) => { // Renamed from original handleSubmit
    e.preventDefault();
    setError(null);

    if (!itemToEdit || !itemToEdit._id) {
      setError("No item ID available for update.");
      return;
    }
    if (!item.name.trim() || !item.unit.trim()) {
        setError("Item Name and Unit are required.");
        return;
    }
    const matCost = parseFloat(item.materialCost);
    const labCost = parseFloat(item.laborCost);

    if (item.materialCost.trim() !== "" && (isNaN(matCost) || matCost < 0)) {
        setError("Material Cost must be a valid non-negative number if provided.");
        return;
    }
    if (item.laborCost.trim() !== "" && (isNaN(labCost) || labCost < 0)) {
        setError("Labor Cost must be a valid non-negative number if provided.");
        return;
    }

    const payload = {
      name: item.name.trim(),
      unit: item.unit.trim(),
      materialCost: matCost || 0,
      laborCost: labCost || 0,
    };

    if (onItemUpdateTrigger) {
      onItemUpdateTrigger(payload, itemToEdit._id); // Trigger parent to show modal and handle submission
    } else {
      console.error("EditItemForm: onItemUpdateTrigger prop is missing!");
    }
  };

  if (!itemToEdit) return null;

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg mt-6 border border-indigo-400">
      <h2 className="text-xl font-semibold mb-4 text-indigo-700">Edit Item: <span className="font-normal italic">{itemToEdit.name}</span></h2>
      {error && <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">{error}</div>}
      {/* Success message removed, parent will handle */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="edit-item-name" className="block text-sm font-medium text-gray-700">Item Name</label>
          <input
            type="text" id="edit-item-name" name="name" value={item.name} onChange={handleChange} required
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="edit-item-unit" className="block text-sm font-medium text-gray-700">Unit</label>
          <input
            type="text" id="edit-item-unit" name="unit" value={item.unit} onChange={handleChange} required
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="edit-item-materialCost" className="block text-sm font-medium text-gray-700">Material Cost</label>
          <input
            type="number" id="edit-item-materialCost" name="materialCost" value={item.materialCost} onChange={handleChange}
            step="0.01" min="0" placeholder="0.00"
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="edit-item-laborCost" className="block text-sm font-medium text-gray-700">Labor Cost</label>
          <input
            type="number" id="edit-item-laborCost" name="laborCost" value={item.laborCost} onChange={handleChange}
            step="0.01" min="0" placeholder="0.00"
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="flex space-x-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-indigo-600 text-white py-2.5 px-4 rounded-lg shadow-md hover:bg-indigo-700 transition duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button" onClick={onCancelEdit}
            disabled={isSubmitting}
            className="flex-1 bg-gray-300 text-gray-800 py-2.5 px-4 rounded-lg shadow-md hover:bg-gray-400 transition duration-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditItemForm;
