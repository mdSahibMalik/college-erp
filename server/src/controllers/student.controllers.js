import mongoose from "mongoose";
import { Assignment } from "../models/assignments.model.js";
import { AssignmentSubmission } from "../models/assignmentSubmission.model.js";
import { Attendance } from "../models/attendance.model.js";
import { User } from "../models/user.model.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.js";
import { Subject } from "../models/subject.model.js";
import path from "path";
import fs from "fs";
import { uploadToCloudinary } from "../utils/uploadOnCloudinary.js";
import AppError from "../utils/appError.js";

const getAttendance = asyncErrorHandler(async (req, res, next) => {
  console.log("User info from token:", req.user);
  console.log("this is here");

  const loggedInUserId = req.user.id;
  const loggedInUserRole = req.user.role;
  // 6978f79cdb7ad95a842837ba
  let targetUserId;

  // 🧑‍🎓 Student → can see only own attendance
  if (loggedInUserRole === "student") {
    targetUserId = loggedInUserId;
  }

  // 🧑‍🏫 Teacher / HOD → can see any student's attendance
  if (loggedInUserRole === "teacher" || loggedInUserRole === "hod") {
    targetUserId = req.body.studentId;

    if (!targetUserId) {
      return next(
        new AppError("studentId is required to view attendance", 400),
      );
    }
  }

  // 🚫 Unauthorized role
  if (!targetUserId) {
    return next(new AppError("Not authorized", 403));
  }

  // 🔍 Fetch student (ensure target is student)
  const student = await User.findOne({
    _id: targetUserId,
    role: "student",
  });

  if (!student) {
    return next(new AppError("Student not found", 404));
  }

  // 📊 Fetch attendance
  const attendance = await Attendance.find({
    studentId: student._id,
  });

  return res.status(200).json({
    success: true,
    student: {
      id: student._id,
      name: student.name,
      enrollmentNumber: student.enrollmentNumber,
    },
    attendance,
  });
});

//! user assignment submission using cloudinary..........

// get all the assignments of class and the details of the assignment

const getAssignmetns = asyncErrorHandler(async (req, res, next) => {
  const userId = req.user.id;
  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  const classId = user.classId;
  const assignments = await Assignment.find({
    classId: new mongoose.Types.ObjectId(classId),
  })
    .populate("subjectId", "subjectName")
    .sort({ createdAt: -1 });
  return res.status(200).json({
    success: true,
    assignments,
  });
});

const assignments = asyncErrorHandler(async (req, res, next) => {
  const assignmentId = req.params.assignmentId;
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    return next(new AppError("Assignment not found", 404));
  }
  return res.status(200).json({
    success: true,
    assignment,
  });
});

const submitAssignments = asyncErrorHandler(async (req, res, next) => {
  const assignmentId = req.params.assignmentId || req.body.assignmentId;
  const studentId = req.user.id;
  const assignmentFile = req.file;

  if (!assignmentFile) {
    return next(new AppError("No file uploaded", 400));
  }

  const allowedExtensions = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"];
  const fileExt = path.extname(assignmentFile.originalname).toLowerCase();

  if (!allowedExtensions.includes(fileExt)) {
    await fs.promises.unlink(assignmentFile.path);
    return next(new AppError(`File type ${fileExt} not allowed`, 403));
  }

  const assignment = await Assignment.findById(assignmentId).select("deadline");

  if (!assignment) {
    return next(new AppError("Assignment not found", 404));
  }

  const existingAssignment = await AssignmentSubmission.findOne({
    studentId,
    assignmentId,
  });

  if (existingAssignment) {
    return next(new AppError("Assignment already submitted by you", 400));
  }
  const cloudinaryResult = await uploadToCloudinary(assignmentFile.path);
  

  let assignmentStatus = "Submitted";

  if (new Date() > assignment.deadline) {
    assignmentStatus = "Late";
  }

  await AssignmentSubmission.create({
    assignmentId,
    studentId,
    fileUrl: cloudinaryResult.secure_url,
    publicId: cloudinaryResult.public_id,
    status: assignmentStatus,
  });

  res.status(200).json({
    success: true,
    message: "Assignment uploaded successfully",
  });
});
export { getAttendance, getAssignmetns, submitAssignments };
