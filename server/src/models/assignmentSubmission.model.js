import mongoose from "mongoose";

const assignmentSubmissionSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // uploaded solution file
    fileUrl: {
      type: String,
      required: true,
    },

    publicId: {
      type: String,
      required: true,
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },

    // auto detect late submission
    isLate: {
      type: Boolean,
      default: false,
    },

    // teacher evaluation
    obtainedMarks: {
      type: Number,
      default: null,
    },

    feedback: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["submitted","Late", "checked"],
      default: "submitted",
    },
  },
  { timestamps: true }
);

// prevent multiple submissions
assignmentSubmissionSchema.index(
  { assignmentId: 1, studentId: 1 },
  { unique: true }
);

export const AssignmentSubmission = mongoose.model(
  "AssignmentSubmission",
  assignmentSubmissionSchema
);