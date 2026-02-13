import { Attendance } from "../models/attendance.models.js";
import mongoose from "mongoose";
import { Subject } from "../models/subjects.models.js";
import AppError from "../utils/appError.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.js";
import { uploadToCloudinary } from "../utils/uploadonCloudinary.js";
import path from "path";
import fs from "fs";
import { Notes } from "../models/notes.models.js";
import { Assignments } from "../models/assignments.models.js";
import { AssignmentSubmission } from "../models/assignments.submission.models.js";

const markAttendance = asyncErrorHandler(async (req, res, next) => {
  const { studentIds, subjectId, date } = req.body;
  const teacherId = req.user.id;

  // Check if the teacher is assigned to the subject
  const subject = await Subject.findOne({ _id: subjectId, teacherId });
  if (!subject) {
    return next(new AppError("You are not assigned to this subject", 403));
  }

  // Check if attendance for the given date and subject already exists
  const attendanceRecords = studentIds.map((studentId) => ({
    studentId,
    subjectId,
    date: new Date(date),
    status: "present",
    markedBy: teacherId,
  }));
  // Create new attendance record
  try {
    await Attendance.insertMany(attendanceRecords, { ordered: false });
  } catch (error) {
    if (error.code !== 11000) {
      // Ignore duplicate key errors
      return next(new AppError("Error marking attendance", 500));
    }
  }

  return res.status(200).json({
    success: true,
    message: "Attendance marked successfully",
    attendance: attendanceRecords,
  });
});

// see the student attendance

const viewStudentAttendanceDetails = asyncErrorHandler(
  async (req, res, next) => {
    const teacherId = req.user.id;
    const { subjectId, studentId } = req.body;

    // Verify subject
    const subject = await Subject.findOne({ _id: subjectId, teacherId });
    if (!subject) {
      return next(new AppError("Unauthorized", 403));
    }

    const stats = await Attendance.aggregate([
      {
        $match: {
          subjectId: new mongoose.Types.ObjectId(subjectId),
          studentId: new mongoose.Types.ObjectId(studentId),
        },
      },
      {
        $group: {
          _id: "$studentId",
          totalClasses: { $sum: 1 },
          presentCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "present"] }, 1, 0],
            },
          },
          records: {
            $push: {
              date: "$date",
              status: "$status",
            },
          },
        },
      },
      {
        $project: {
          studentId: "$_id",
          totalClasses: 1,
          presentCount: 1,
          records: 1,
          percentage: {
            $cond: [
              { $eq: ["$totalClasses", 0] },
              0,
              {
                $multiply: [
                  { $divide: ["$presentCount", "$totalClasses"] },
                  100,
                ],
              },
            ],
          },
        },
      },
    ]);
    res.status(200).json({
      success: true,
      stats: stats[0] || {
        studentId,
        totalClasses: 0,
        presentCount: 0,
        percentage: 0,
        records: [],
      },
    });
  },
);

const viewClassSubjectStats = asyncErrorHandler(async (req, res, next) => {
  const teacherId = req.user.id;
  const { subjectId } = req.body;

  // 1️⃣ Verify teacher owns subject
  const subject = await Subject.findOne({ _id: subjectId, teacherId });
  if (!subject) {
    return next(new AppError("You are not assigned to this subject", 403));
  }

  const stats = await Attendance.aggregate([
    {
      $match: {
        subjectId: new mongoose.Types.ObjectId(subjectId),
      },
    },
    {
      $lookup: {
        from: "users", // student collection
        localField: "studentId",
        foreignField: "_id",
        as: "student",
      },
    },
    { $unwind: "$student" },
    {
      $match: {
        "student.classId": subject.classId,
      },
    },
    {
      $group: {
        _id: "$studentId",
        totalClasses: { $sum: 1 },
        presentCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "present"] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        totalClasses: 1,
        presentCount: 1,
        percentage: {
          $cond: [
            { $eq: ["$totalClasses", 0] },
            0,
            {
              $multiply: [{ $divide: ["$presentCount", "$totalClasses"] }, 100],
            },
          ],
        },
      },
    },
    { $sort: { percentage: 1 } },
  ]);

  res.status(200).json({
    success: true,
    totalStudents: stats.length,
    stats,
  });
});

//! uploads notes and assignments using cloudinary..........

const uploadNotes = asyncErrorHandler(async (req, res, next) => {
  try {
    const { subjectId, title, description } = req.body;
    const teacherId = req.user.id;
    const notesfile = req.file;
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
    const fileExt = path.extname(notesfile.path).toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      console.warn(`File type ${fileExt} is not allowed.`);
      fs.unlink(notesfile.path); // Delete invalid file
      return next(
        new AppError(
          `File type ${fileExt} is not allowed. Only PDF and JPG/JPEG are accepted.`,
          403,
        ),
      );
    }
    // subjectId and teacherId  fileName and filePath
    const existingSubject = await Notes.findOne({
      subjectId,
      teacherId,
      title,
      isActive: true,
    });
    if (existingSubject) {
      return next(
        new AppError(
          "Notes with the same name already exist for this subject",
          400,
        ),
      );
    }

    // upload file to cloudinary and get the file path
    const cloudinaryResult = await uploadToCloudinary(notesfile.path);

    if (!cloudinaryResult || !cloudinaryResult.secure_url) {
      return next(new AppError("Failed to upload notes to cloud storage", 500));
    }

    const newNotes = new Notes({
      subjectId,
      teacherId,
      title,
      description,
      isActive: true,
      fileUrl: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
    });
    await newNotes.save();

    return res.status(200).json({
      success: true,
      message: "Notes uploaded successfully",
      fileUrl: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
    });
  } catch (error) {
    console.log(error);
  }
});
const uploadAssignments = asyncErrorHandler(async (req, res, next) => {
  try {
    const { subjectId, title, description, deadline, totalMarks } = req.body;
    const teacherId = req.user.id;
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
    // check if subject is assigned to this teacher or not 
    const existingSubject = await Subject.findOne({
      _id: subjectId,
      teacherId,
    });
    if (!existingSubject) {
      return next(new AppError("You are not assigned to this subject", 403));
    }
    // subjectId and teacherId  fileName and filePath
    const existingAssignment = await Assignments.findOne({
      subjectId,
      teacherId,
      title,
      description,
      deadline,
      totalMarks,
      isActive: true,
    });
    if (existingAssignment) {
      return next(
        new AppError(
          "Assignment with the same name already exist for this subject",
          400,
        ),
      );
    }

    // upload file to cloudinary and get the file path
    const cloudinaryResult = await uploadToCloudinary(assignmentFile.path);

    if (!cloudinaryResult || !cloudinaryResult.secure_url) {
      return next(new AppError("Failed to upload notes to cloud storage", 500));
    }

    const newAssignment = new Assignments({
      subjectId,
      teacherId,
      title,
      totalMarks,
      description,
      deadline,
      isActive: true,
      fileUrl: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
    });
      await newAssignment.save();
   

    return res.status(200).json({
      success: true,
      message: "Assignment uploaded successfully",
      fileUrl: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
    });
  } catch (error) {
    console.log(error);
  }
});

// see assignment submission and evaluate it
const submittedAssignments = asyncErrorHandler(async (req, res, next) => {
  const teacherId = req.user.id;
  const assignmentId = req.params.assignmentId;
  const assignments = await AssignmentSubmission.findById({
    assignmentId,
    status: "Submitted",
  });
  if (!assignments) {
    return next(new AppError("Assignment not found", 404));
  }
  res.status(200).json({
    status: true,
    assignments,
    message: "Assignment submission details fetched successfully",
  });
});

const verifyAssignments = asyncErrorHandler(async (req, res, next) => {
  const { assignmentId, marksAwarded, feedback } = req.body;
  if (!assignmentId || !marksAwarded) {
    return next(
      new AppError("Assignment ID and marks awarded are required", 400),
    );
  }
  const submission = await AssignmentSubmission.findByIdAndUpdate(
    assignmentId,
    {
      marksAwarded,
      feedback: feedback || "",
      status: "Evaluated",
    },
  );

  res.status(200).json({
    status: true,
    submission,
    message: "Assignment verified successfully",
  });
});

export {
  markAttendance,
  uploadNotes,
  viewStudentAttendanceDetails,
  viewClassSubjectStats,
  uploadAssignments,
  submittedAssignments,
  verifyAssignments,
};
