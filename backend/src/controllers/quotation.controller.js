import Quotation from "../models/quotation.model.js";

export const createQuotation = async (req, res) => {
  const { projectTitle, clientName, location, items } = req.body;
  const quotation = new Quotation({ projectTitle, clientName, location, items });
  await quotation.save();
  res.status(201).json(quotation);
};

export const getQuotations = async (req, res) => {
  const quotations = await Quotation.find().populate("items.item");
  res.json(quotations);
};

