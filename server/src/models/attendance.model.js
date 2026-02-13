import mongoose from "mongoose";
const attendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Which student

    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    // Which subject

    date: {
      type: Date,
      required: true,
    },
    // Lecture date

    status: {
      type: String,
      enum: ["present", "absent"],
      required: true,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
    },
    // Attendance result
  },
  { timestamps: true },
);

// Prevent duplicate attendance
attendanceSchema.index(
  { studentId: 1, subjectId: 1, date: 1 },
  { unique: true },
);

export const Attendance = mongoose.model("Attendance", attendanceSchema);
