import mongoose from "mongoose";
import { Assignment } from "../models/assignments.model.js";
import { AssignmentSubmission } from "../models/assignmentSubmission.model.js";
import { Attendance } from "../models/attendance.model.js";
import { User } from "../models/user.model.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.js";
import { Subject } from "../models/subject.model.js";

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
  }).populate("subjectId", "subjectName").sort({ createdAt: -1 });
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
  try {
    const { assignmentId } = req.body;
    const studentId = req.user.id;
    // take the file using multer..
    const assignmentFile = req.file;
    if (!req.file) {
      return next(new AppError("No file uploaded", 400));
    }

    //* check file extension
    const allowedExtensions = [
      ".pdf",
      ".doc",
      ".docx",
      ".jpg",
      ".jpeg",
      ".png",
    ];
    const fileExt = path.extname(assignmentFile.path).toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      console.warn(`File type ${fileExt} is not allowed.`);
      fs.unlink(assignmentFile.path); // Delete invalid file
      return next(
        new AppError(
          `File type ${fileExt} is not allowed. Only PDF and JPG/JPEG are accepted.`,
          403,
        ),
      );
    }
    // check if assignment exists
    const existingAssignment = await AssignmentSubmission.findOne({
      studentId,
      assignmentId,
    });
    if (existingAssignment) {
      return next(new AppError("Assignment already submitted by you", 400));
    }

    // upload file to cloudinary and get the file path
    const cloudinaryResult = await uploadToCloudinary(assignmentFile.path);

    if (!cloudinaryResult || !cloudinaryResult.secure_url) {
      return next(new AppError("Failed to upload notes to cloud storage", 500));
    }
    let assignmentStatus = "Submitted";
    const submissionDeadLine =
      await Assignments.findById(assignmentId).select("deadline");
    if (!submissionDeadLine) {
      return next(new AppError("Assignment not found", 404));
    }
    if (new Date() > submissionDeadLine.deadline) {
      assignmentStatus = "Late";
    }

    const newAssignmentSubmission = new AssignmentSubmission({
      assignmentId,
      studentId,
      fileUrl: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
      status: assignmentStatus,
    });
    await newAssignmentSubmission.save();

    return res.status(200).json({
      success: true,
      message: "Assignment uploaded successfully",
    });
  } catch (error) {
    console.log(error);
    return next(error);
  }
});

export { getAttendance, getAssignmetns };
