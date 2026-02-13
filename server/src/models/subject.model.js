import mongoose from "mongoose";  
const subjectSchema = new mongoose.Schema(
  {
    subjectName: {
      type: String,
      required: true,
    },
    // DBMS, OS, CN

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    // Subject belongs to which class

    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Who teaches this subject
  },
  { timestamps: true }
);

export const Subject = mongoose.model("Subject", subjectSchema);
