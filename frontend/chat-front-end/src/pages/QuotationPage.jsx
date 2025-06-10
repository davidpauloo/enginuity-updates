// src/pages/QuotationPage.jsx
import React, { useEffect, useState, useCallback, useMemo} from "react";
import axios from "axios";
import AddItemForm from "../components/AddItemForm"; 
import QuotationForm from "../components/QuotationForm"; 
import ItemTable from "../components/ItemTable";
import EditItemForm from "../components/EditItemForm"; 
import ConfirmationModal from '../components/ConfirmationModal'; 

const QuotationPage = () => {
  const [items, setItems] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false); 
  const [showQuoteForm, setShowQuoteForm] = useState(false); 
  const [itemSearchTerm, setItemSearchTerm] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [currentItemToEdit, setCurrentItemToEdit] = useState(null);

  const [isLoading, setIsLoading] = useState({ list: false, action: false });
  const [error, setError] = useState({ list: null, action: null });

  // --- Modal State ---
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalAction, setModalAction] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalContent, setModalContent] = useState({ title: '', message: '', confirmText: 'Confirm' });

  const API_BASE_URL = 'http://localhost:5001/api'; 

  const fetchItems = useCallback(async () => {
    console.log("QuotationPage: Fetching items...");
    setIsLoading(prev => ({ ...prev, list: true }));
    setError(prev => ({ ...prev, list: null }));
    try {
      const res = await axios.get(`${API_BASE_URL}/items`);
      if (Array.isArray(res.data)) {
        setItems(res.data.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
      } else {
        setItems([]);
        console.error("Fetched items data is not an array:", res.data);
      }
    } catch (err) {
      console.error("Failed to fetch items:", err);
      setError(prev => ({ ...prev, list: err.response?.data?.message || "Could not load items." }));
      setItems([]);
    } finally {
      setIsLoading(prev => ({ ...prev, list: false }));
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // --- Add Item Handlers ---
  const handleAddItemTrigger = (itemPayload) => {
    console.log("QuotationPage: handleAddItemTrigger called with payload:", itemPayload);
    setModalData({ itemPayload });
    setModalAction(() => () => executeAddItem(itemPayload)); // Store the function to execute
    setModalContent({
      title: "Confirm Add Item",
      message: `Are you sure you want to add the item "${itemPayload.name}"?`,
      confirmText: "Add Item"
    });
    setShowConfirmModal(true);
    console.log("QuotationPage: setShowConfirmModal(true) called for Add Item");
  };

  const executeAddItem = async (itemPayload) => {
    console.log("QuotationPage: executeAddItem called with payload:", itemPayload);
    setIsLoading(prev => ({ ...prev, action: true }));
    setError(prev => ({ ...prev, action: null }));
    try {
      await axios.post(`${API_BASE_URL}/items`, itemPayload);
      // alert('Item added successfully!'); // Replaced with more subtle feedback if needed
      console.log('Item added successfully via API');
      fetchItems(); 
      setShowAddForm(false); 
    } catch (err) {
      console.error('Error adding item:', err);
      const errorMessage = err.response?.data?.message || 'Failed to add item. Please try again.';
      setError(prev => ({ ...prev, action: errorMessage }));
      alert(`Error adding item: ${errorMessage}`);
    } finally {
      setIsLoading(prev => ({ ...prev, action: false }));
    }
  };

  const displayedItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    let filtered = items; // Start with all items fetched from backend
    if (itemSearchTerm.trim()) {
      const searchTermLower = itemSearchTerm.toLowerCase();
      filtered = items.filter(item =>
        (item.name || "").toLowerCase().includes(searchTermLower) ||
        (item.unit || "").toLowerCase().includes(searchTermLower) // Optional: search by unit too
      );
    }
    // You might also add sorting logic here if you want the main item list to be sortable
    // Example:
    // filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return filtered;
  }, [items, itemSearchTerm]); 

  
  // --- Edit Item Handlers ---
  const handleOpenEditForm = (item) => {
    console.log("QuotationPage: handleOpenEditForm called for item:", item);
    setCurrentItemToEdit(item);
    setIsEditing(true);
    setShowAddForm(false); 
    setShowQuoteForm(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    console.log("QuotationPage: handleCancelEdit called");
    setIsEditing(false);
    setCurrentItemToEdit(null);
  };

  const handleUpdateItemTrigger = (itemPayload, itemId) => {
    console.log("QuotationPage: handleUpdateItemTrigger called for itemId:", itemId, "with payload:", itemPayload);
    setModalData({ itemPayload, itemId });
    setModalAction(() => () => executeUpdateItem(itemPayload, itemId)); // Store the function to execute
    setModalContent({
      title: "Confirm Update Item",
      message: `Are you sure you want to update the item "${itemPayload.name}"?`,
      confirmText: "Update Item"
    });
    setShowConfirmModal(true);
    console.log("QuotationPage: setShowConfirmModal(true) called for Update Item");
  };

  const executeUpdateItem = async (itemPayload, itemId) => {
    console.log("QuotationPage: executeUpdateItem called for itemId:", itemId, "with payload:", itemPayload);
    setIsLoading(prev => ({ ...prev, action: true }));
    setError(prev => ({ ...prev, action: null }));
    try {
      await axios.put(`${API_BASE_URL}/items/${itemId}`, itemPayload);
      // alert('Item updated successfully!'); // Replaced with more subtle feedback if needed
      console.log('Item updated successfully via API');
      fetchItems(); 
      handleCancelEdit(); 
    } catch (err) {
      console.error('Error updating item:', err);
      const errorMessage = err.response?.data?.message || 'Failed to update item. Please try again.';
      setError(prev => ({ ...prev, action: errorMessage }));
      alert(`Error updating item: ${errorMessage}`);
    } finally {
      setIsLoading(prev => ({ ...prev, action: false }));
    }
  };

  // --- Delete Item Handlers ---
  const handleDeleteItemTrigger = (itemToDelete) => {
    console.log("QuotationPage: handleDeleteItemTrigger called for item:", itemToDelete);
    // Ensure itemToDelete and _id are valid before proceeding
    if (!itemToDelete || !itemToDelete._id) {
        console.error("handleDeleteItemTrigger: Invalid itemToDelete object or missing _id.", itemToDelete);
        alert("Error: Cannot delete item due to missing information.");
        return;
    }
    setModalData(itemToDelete); 
    setModalAction(() => () => executeDeleteItem(itemToDelete._id)); 
    setModalContent({
      title: "Confirm Delete Item",
      message: `Are you sure you want to delete the item "${itemToDelete.name}"? This action cannot be undone.`,
      confirmText: "Delete Item"
    });
    setShowConfirmModal(true);
    console.log("QuotationPage: setShowConfirmModal(true) called for Delete Item");
  };

  const executeDeleteItem = async (itemId) => {
    console.log("QuotationPage: executeDeleteItem called for itemId:", itemId);
    setIsLoading(prev => ({ ...prev, action: true }));
    setError(prev => ({ ...prev, action: null }));
    try {
      const response = await axios.delete(`${API_BASE_URL}/items/${itemId}`);
      console.log('Item deleted successfully from backend:', response.data); // Log backend response
      // The UI will update due to fetchItems. 
      // No need for an alert here if the UI update is sufficient feedback.
      // If you want an alert: alert('Item deleted successfully!'); 
      await fetchItems(); // Ensure this completes before finishing
    } catch (err) {
      console.error('Error deleting item (API call):', err);
      const errorMessage = err.response?.data?.message || 'Failed to delete item. Please try again.';
      setError(prev => ({ ...prev, action: errorMessage }));
      alert(`Error deleting item: ${errorMessage}`); // This is the error message the user sees
    } finally {
      setIsLoading(prev => ({ ...prev, action: false }));
    }
  };

  // --- Modal Handlers ---
  const handleModalConfirm = () => {
    console.log("QuotationPage: handleModalConfirm called. Action to execute:", modalAction);
    if (typeof modalAction === 'function') {
      modalAction(); 
    }
    setShowConfirmModal(false);
    setModalAction(null); 
    setModalData(null);   
  };

  const handleModalClose = () => {
    console.log("QuotationPage: handleModalClose called");
    setShowConfirmModal(false);
    setModalAction(null); 
    setModalData(null);   
  };


  return (
    <div className="flex flex-col items-center min-h-screen bg-base-200 pt-10 md:pt-20 px-4 pb-20">
      <div className="bg-base-100 rounded-lg shadow-xl p-6 md:p-8 w-full max-w-5xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center text-primary">Construction Quotation System</h1>
  

        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
          <button
            onClick={() => { setShowAddForm(prev => !prev); setIsEditing(false); setShowQuoteForm(false); setCurrentItemToEdit(null); }}
            className={`btn ${showAddForm && !isEditing ? 'btn-active btn-neutral' : 'btn-primary'}`}
          >
            {showAddForm && !isEditing ? "Close Add Item Form" : "Add New Item"}
          </button>
          <button
            onClick={() => { setShowQuoteForm(prev => !prev); setShowAddForm(false); setIsEditing(false); setCurrentItemToEdit(null);}}
            className={`btn ${showQuoteForm ? 'btn-active btn-neutral' : 'btn-secondary'}`}
          >
            {showQuoteForm ? "Close Quotation Form" : "Make Quotation"}
          </button>
        </div>

        {isEditing && currentItemToEdit && (
          <div className="my-6">
            <EditItemForm
              key={currentItemToEdit._id} 
              itemToEdit={currentItemToEdit}
              onItemUpdateTrigger={handleUpdateItemTrigger} 
              onCancelEdit={handleCancelEdit}
              isSubmitting={isLoading.action}
            />
          </div>
        )}
        
        {showAddForm && !isEditing && (
          <div className="my-6">
            <AddItemForm
              onAddItemSubmitTrigger={handleAddItemTrigger} 
              isSubmitting={isLoading.action}
            />
          </div>
        )}
        
        {showQuoteForm && (
          <div className="my-6 p-4 border border-gray-300 rounded-lg bg-gray-50">
             <h2 className="text-2xl font-semibold mb-4 text-gray-700">Create PDF Quotation</h2>
            <QuotationForm items={items} projectDetails={null} /> 
          </div>
        )}

     <div className="mt-10">
          <div className="flex flex-col md:flex-row justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-700 mb-3 md:mb-0">Available Items List</h2>
            {/* --- Search input for items --- */}
            <input
              type="text"
              placeholder="Search items (name/unit)..."
              value={itemSearchTerm} // <<<< Connect to itemSearchTerm state
              onChange={(e) => setItemSearchTerm(e.target.value)} // <<<< Update itemSearchTerm state
              className="input input-bordered input-sm w-full md:max-w-xs"
            />
          </div>
          
          {!isLoading.list && !error.list && (
            <ItemTable
              items={displayedItems}
              onItemDeleted={handleDeleteItemTrigger} 
              onEditItem={handleOpenEditForm}      
            />
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={handleModalClose}
        onConfirm={handleModalConfirm}
        title={modalContent.title}
        message={modalContent.message}
        confirmText={modalContent.confirmText}
      />
    </div>
  );
};

export default QuotationPage;