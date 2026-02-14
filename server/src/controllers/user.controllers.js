import mongoose from "mongoose";
// import { Attendance } from "../models/attendance.models.js";
// import { OtpVerification } from "../models/otp_verification.models.js";
import AppError from "../utils/appError.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.js";
// import sendToken from "../utils/sendToken.js";
// import crypto from "crypto";
import { User } from "../models/user.model.js";
import { sendMail } from "../utils/sendMail.js";
// import { AssignmentSubmission } from "../models/assignments.submission.models.js";
// import { Assignments } from "../models/assignments.models.js";
// import { uploadToCloudinary } from "../utils/uploadonCloudinary.js";

const userRegister = asyncErrorHandler(async (req, res, next) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return next(new AppError("Identifier is required", 400));
    }
    let existUser = await User.findOne({
      enrollmentNumber: identifier,
    });
  
    if (!existUser) {
      existUser = await User.findOne({
        teacherId: identifier,
      });
    }
    if (!existUser) {
      return next(new AppError("User not found", 404));
    }
    return next(new AppError("OTP already sent to your email, please check your inbox", 400));
    if (existUser.isVerified) {
      return next(new AppError("User already verified, please login", 400));
    }
    const otp = existUser.generateOTP();
  
    await existUser.save({ validateBeforeSave: false });
  
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  
    await OtpVerification.create({
      userId: new mongoose.Types.ObjectId(existUser._id),
      otp,
      expiresAt,
    });
  
    const message = generateOtpEmail(otp, process.env.APP_NAME || "College ERP");
  
    await sendMail({
      email: existUser.email,
      subject: "Your OTP Code",
      message,
    });
    const user = {
      id: existUser._id,
      name: existUser.name,
      email: existUser.email,
      mobile: existUser.mobile,
      enrollmentNumber: existUser.enrollmentNumber,
    };
    return res
      .status(200)
      .json({ success: true, message: "OTP sent successfully", user: user });
  } catch (error) {
    console.log('user register error',error)
    return next(new AppError("Error sending OTP", 500));
  }
});

function generateOtpEmail(otp, appName = "My App") {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${appName} - OTP Verification</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, Helvetica, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8; padding:20px;">
    <tr>
      <td align="center">

        <!-- Main Container -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.05);">

          <!-- Header -->
          <tr>
            <td style="background-color:#4f46e5; padding:20px; text-align:center;">
              <h1 style="color:#ffffff; margin:0; font-size:24px;">${appName}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px; color:#333333;">
              <h2 style="margin-top:0;">Verify your email</h2>
              <p style="font-size:16px; line-height:1.5;">
                Use the OTP below to complete your verification.  
                This OTP is valid for <strong>10 minutes</strong>.
              </p>

              <!-- OTP Box -->
              <div style="margin:30px 0; text-align:center;">
                <span style="
                  display:inline-block;
                  background-color:#f1f5f9;
                  padding:15px 30px;
                  font-size:28px;
                  letter-spacing:6px;
                  font-weight:bold;
                  color:#111827;
                  border-radius:6px;
                ">
                  ${otp}
                </span>
              </div>

              <p style="font-size:14px; color:#6b7280;">
                If you didn’t request this, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb; padding:15px; text-align:center; font-size:12px; color:#9ca3af;">
              © ${new Date().getFullYear()} ${appName}. All rights reserved.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;
}

const verifyOTP = asyncErrorHandler(async (req, res, next) => {
  const { userId, otp } = req.body;

  if (!userId || !otp) {
    return next(new AppError("All fields are required", 400));
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return next(new AppError("Invalid userId", 400));
  }

  const otpRecord = await OtpVerification.findOne({ userId });

  if (!otpRecord) {
    return next(new AppError("OTP not found", 404));
  }

  if (Date.now() > otpRecord.expiresAt) {
    await otpRecord.deleteOne();
    return next(new AppError("OTP expired", 400));
  }

  if (otpRecord.otp !== otp) {
    return next(new AppError("Invalid OTP", 400));
  }

  await User.findByIdAndUpdate(userId, { isVerified: true });
  await otpRecord.deleteOne();

  return res
    .status(200)
    .json({ success: true, message: "OTP verified successfully" });
});

const setPassword = asyncErrorHandler(async (req, res, next) => {
  const { userId, password } = req.body;

  if (!userId || !password) {
    return next(new AppError("All fields are required", 400));
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return next(new AppError("Invalid userId", 400));
  }

  const user = await User.findOne({
    _id: userId,
    isVerified: true,
  }).select("+passwordAlreadySet");

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  if (user.passwordAlreadySet) {
    return next(
      new AppError("Password already set, use forget password option", 400),
    );
  }

  user.password = password;
  user.passwordAlreadySet = true;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json({ success: true, message: "Password reset successfully" });
});

const login = asyncErrorHandler(async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return next(new AppError("All fields are required", 400));
    }

    let user = await User.findOne({ enrollmentNumber:identifier }).select("+password");

    if (!user) {
      user = await User.findOne({ teacherId:identifier }).select("+password");
    }
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    const isPasswordMatched = await user.comparePassword(password);
    if (!isPasswordMatched) {
      return next(new AppError("Invalid credentials", 401));
    }
    user.password = undefined;
    user.passwordAlreadySet = undefined;
    user.isHod = undefined;
    user.classId = undefined;

    return sendToken(user, 200, res);
  } catch (error) {
    console.log(error);
    return next(new AppError("Login failed", 500));
  }
});

const getAttendance = asyncErrorHandler(async (req, res, next) => {
  const loggedInUserId = req.user.id;
  const loggedInUserRole = req.user.role;

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
        new AppError("studentId is required to view attendance", 400)
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
    student: student._id,
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


const forgetPassword = asyncErrorHandler(async (req, res, next) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return next(new AppError("identifier is required", 400));
    }

    let user = await User.findOne({ enrollmentNumber: identifier });
    if (!user) {
     user = await User.findOne({ teacherId: identifier });
    }
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    const resetToken = user.generateResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetPasswordUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    const emailContent = generateResetPasswordEmailContent(
      user.name,
      resetPasswordUrl,
    );
    await sendMail({
      email: user.email,
      subject: "Reset Password",
      message: emailContent,
    });

    return res.status(200).json({
      success: true,
      message: "Reset password email sent successfully check your inbox",
    });
  } catch (error) {
    console.log(error);
    return next(new AppError("Failed to send reset password email", 500));
  }
});
function generateResetPasswordEmailContent(
  name,
  resetUrl,
  appName = "College ERP",
) {
  return `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; display: block; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f9fafb;">
    <h2>Password Reset Request</h2>
    <p>Hello <strong>${name}</strong>,</p>
    <p>We received a request to reset your password for your <b>${appName}</b> account.</p>

    <p>
      <a
        href="${resetUrl}"
        style="
          display: inline-block;
          padding: 12px 20px;
          background-color: #2563eb;
          color: #ffffff;
          text-decoration: none;
          border-radius: 4px;
        "
      >
        Reset Password
      </a>
    </p>

    <p>This link is valid for <b>15 minutes</b>.</p>
    <p>If you did not request this, please ignore this email.</p>

    <p>Regards,<br>${appName} Support Team</p>
  </div>
  `;
}

const resetPassword = asyncErrorHandler(async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    const { token } = req.params;

    if (!token) {
      return next(new AppError("Token is required", 400));
    }

    if (!newPassword) {
      return next(new AppError("Password is required", 400));
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordTokenExpire: { $gt: Date.now() },
    });

    if (!user) {
      return next(new AppError("Invalid or expired token", 400));
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordTokenExpire = undefined;
    await user.save();

    return res
      .status(200)
      .json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.log(error);
    return next(new AppError("Failed to reset password", 500));
  }
});

//! user assignment submission using cloudinary..........

const assignments = asyncErrorHandler(async (req, res, next) => {
  const assignmentId = req.params.assignmentId;
  const assignment = await Assignments.findById(assignmentId);
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
    const {assignmentId} = req.body;
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
      assignmentId
    });
    if (existingAssignment) {
      return next(
        new AppError(
          "Assignment already submitted by you",
          400,
        ),
      );
    }

    // upload file to cloudinary and get the file path
    const cloudinaryResult = await uploadToCloudinary(assignmentFile.path);

    if (!cloudinaryResult || !cloudinaryResult.secure_url) {
      return next(new AppError("Failed to upload notes to cloud storage", 500));
    }
    let assignmentStatus = "Submitted";
    const submissionDeadLine = await Assignments.findById(assignmentId).select("deadline");
    if(!submissionDeadLine){
      return next(new AppError("Assignment not found", 404));
    }
    if (new Date() > submissionDeadLine.deadline){
     assignmentStatus = "Late"
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
      message: "Assignment uploaded successfully"
    });
  } catch (error) {
    console.log(error);
    return next(error);
  }
});
export {
  userRegister,
  verifyOTP,
  setPassword,
  login,
  getAttendance,
  forgetPassword,
  resetPassword,
  submitAssignments,
};
