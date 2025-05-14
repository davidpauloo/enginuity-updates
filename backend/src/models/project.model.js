import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  clientName: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  startDate: { type: Date, required: true },
  targetDeadline: { type: Date, required: true },
 
  //Important documents regarding the construction project.
  documents: [
    {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true,
      },
      fileName: String,
      filePath: String,
      fileType: String,
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
}, {
  timestamps: true // This adds createdAt and updatedAt fields automatically
});

const Project = mongoose.model('Project', projectSchema);
export default Project;
