// ../controllers/item.controller.js
import Item from "../models/item.model.js";

export const getItems = async (req, res) => {
  try {
    const items = await Item.find().sort({ name: 1 });
    res.status(200).json(items);
  } catch (error) {
    console.error("Error in getItems:", error);
    res.status(500).json({ message: "Failed to fetch items", error: error.message });
  }
};

export const addItem = async (req, res) => {
  try {
    const { name, unit, materialCost, laborCost } = req.body;
    if (!name || !unit) {
        return res.status(400).json({ message: "Name and Unit are required." });
    }
    const newItem = new Item({
      name,
      unit,
      materialCost: materialCost || 0,
      laborCost: laborCost || 0
    });
    await newItem.save();
    res.status(201).json(newItem);
  } catch (error) {
    console.error("Error in addItem:", error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to add item", error: error.message });
  }
};

export const getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    res.status(200).json(item);
  } catch (error) {
    console.error("Error in getItemById:", error);
    if (error.kind === 'ObjectId') {
        return res.status(400).json({ message: "Invalid item ID format" });
    }
    res.status(500).json({ message: "Failed to fetch item", error: error.message });
  }
};

export const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, unit, materialCost, laborCost } = req.body;
     if (!name || !unit) {
        return res.status(400).json({ message: "Name and Unit are required for update." });
    }
    const updateData = {
      name,
      unit,
      materialCost: materialCost || 0,
      laborCost: laborCost || 0
    };
    const updatedItem = await Item.findByIdAndUpdate(id, updateData, {
      new: true, runValidators: true,
    });
    if (!updatedItem) {
      return res.status(404).json({ message: "Item not found for update" });
    }
    res.status(200).json({ message: "Item updated successfully", item: updatedItem });
  } catch (error) {
    console.error("Error in updateItem:", error);
     if (error.name === 'ValidationError') {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
    }
    if (error.kind === 'ObjectId') {
        return res.status(400).json({ message: "Invalid item ID format for update" });
    }
    res.status(500).json({ message: "Failed to update item", error: error.message });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedItem = await Item.findByIdAndDelete(id);
    if (!deletedItem) {
      return res.status(404).json({ message: "Item not found for deletion" });
    }
    res.status(200).json({ message: "Item deleted successfully", itemId: id });
  } catch (error) {
    console.error("Error in deleteItem:", error);
    if (error.kind === 'ObjectId') {
        return res.status(400).json({ message: "Invalid item ID format for delete" });
    }
    res.status(500).json({ message: "Failed to delete item", error: error.message });
  }
};