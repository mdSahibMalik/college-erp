import mongoose from "mongoose";
const notesSchema = new mongoose.Schema(
  {
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    // Notes for which subject

    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
   
    // Uploaded by which teacher

    fileUrl: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
    },
    // Cloudflare R2 / S3 URL

    title: {
      type: String,
    },
    description: {
      type: String,
    },
    isActive:{
      type: Boolean,
      default: true,
    }
    // Display name
  },
  { timestamps: true }
);

export const Notes = mongoose.model("Notes", notesSchema);
