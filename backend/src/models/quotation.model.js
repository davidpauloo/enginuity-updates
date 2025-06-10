import mongoose from "mongoose";

const quotationSchema = new mongoose.Schema({
  projectTitle: { type: String, required: true },
  clientName: { type: String, required: true },
  location: { type: String },
  items: [
    {
      item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
      quantity: { type: Number, required: true }
    }
  ]
}, { timestamps: true });

const Quotation = mongoose.model("Quotation", quotationSchema);

export default Quotation;


