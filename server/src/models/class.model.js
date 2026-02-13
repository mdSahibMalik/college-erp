import mongoose from "mongoose";
const classSchema = new mongoose.Schema(
  {
    className: {
      type: String,
      required: true,
    },
    // MCA, BCA, BTech

    department: {
      type: String,
      required: true,
    },
    // Computer Science, IT etc.

    semester: {
      type: Number,
      required: true,
    },
    // 1,2,3,4…
  },
  { timestamps: true }
);

export const Class = mongoose.model("Class", classSchema);
