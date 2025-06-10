// src/components/AddItemForm.js
import React, { useState } from "react";
// Removed axios import, parent will handle API call

const AddItemForm = ({ onAddItemSubmitTrigger, isSubmitting }) => { 
  const [item, setItem] = useState({
    name: "",
    unit: "",
    materialCost: "",
    laborCost: ""
  });
  const [error, setError] = useState(null);
  // Success state is removed, parent will handle success feedback

  const handleChange = (e) => {
    const { name, value } = e.target;
    setItem({ ...item, [name]: value });
  };

  const handleSubmit = (e) => { // Renamed from original handleSubmit to avoid confusion with parent's
    e.preventDefault();
    setError(null);

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

    if (onAddItemSubmitTrigger) {
      onAddItemSubmitTrigger(payload); // Trigger parent to show modal and handle submission
    } else {
      console.error("AddItemForm: onAddItemSubmitTrigger prop is missing!");
    }
  };

  // Parent will typically clear the form by re-fetching items or re-keying this component
  // If direct clearing is needed from parent, a dedicated prop & function could be added.

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">{error}</div>}
      {/* Success message removed, parent will handle */}

      <div>
        <label htmlFor="add-item-name" className="block text-sm font-medium text-gray-700">Item Name</label>
        <input
          type="text"
          id="add-item-name"
          name="name"
          value={item.name}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="add-item-unit" className="block text-sm font-medium text-gray-700">Unit</label>
        <input
          type="text"
          id="add-item-unit"
          name="unit"
          value={item.unit}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="add-item-materialCost" className="block text-sm font-medium text-gray-700">Material Cost</label>
        <input
          type="number"
          id="add-item-materialCost"
          name="materialCost"
          value={item.materialCost}
          onChange={handleChange}
          step="0.01"
          min="0"
          placeholder="0.00"
          className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="add-item-laborCost" className="block text-sm font-medium text-gray-700">Labor Cost</label>
        <input
          type="number"
          id="add-item-laborCost"
          name="laborCost"
          value={item.laborCost}
          onChange={handleChange}
          step="0.01"
          min="0"
          placeholder="0.00"
          className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting} // Disable button while parent is processing
        className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg shadow-md hover:bg-blue-700 transition duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {isSubmitting ? "Submitting..." : "Add Item"}
      </button>
    </form>
  );
};

export default AddItemForm;