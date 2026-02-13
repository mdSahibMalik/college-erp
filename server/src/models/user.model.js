import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
  {
    // COMMON FIELDS
    name: {
      type: String,
      required: true,
      trim: true,
    },

    fatherName: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    mobile: {
      type: String,
      required: true,
      trim: true,
    },

    password: {
      type: String,
      default: null, // OTP-based activation
      select: false,
    },

    role: {
      type: String,
      enum: ["student", "teacher", "admin", "hod"],
      required: true,
    },

    // STUDENT FIELDS
    enrollmentNumber: {
      type: String,
      unique: true,
      sparse: true,
    },

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
    },

    batch: {
      type: String,
    },

    passwordAlreadySet: {
      type: Boolean,
      default: false,
      select: false,
    },

    // TEACHER / HOD / ADMIN FIELDS
    teacherId: {
      type: String,
      unique: true,
      sparse: true,
    },

    department: {
      type: String,
    },

    isHod: {
      type: Boolean,
      default: false,
    },

    // SYSTEM
    isVerified: {
      type: Boolean,
      default: false,
    },

    // RESET / FORGOT PASSWORD
    resetPasswordToken: String,
    resetPasswordTokenExpire: Date,
  },
  { timestamps: true },
);

//! Pre-validation hook to enforce role-based field requirements
userSchema.pre("validate", function (next) {
  // STUDENT VALIDATION
  if (this.role === "student") {
    if (!this.enrollmentNumber) {
      return next(new Error("Enrollment number is required for students"));
    }

    // clean teacher fields
    this.teacherId = undefined;
    this.department = undefined;
    this.isHod = false;
  }

  // TEACHER / HOD / ADMIN VALIDATION
  if (this.role === "teacher" || this.role === "hod" || this.role === "admin") {
    if (!this.teacherId) {
      return next(new Error("Teacher ID is required for staff"));
    }

    // clean student fields
    this.enrollmentNumber = undefined;
    this.classId = undefined;
    this.batch = undefined;

    // auto-set isHod for HOD role
    if (this.role === "hod") {
      this.isHod = true;
    }
  }

  next();
});

//! hashed password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

//! compare password before login
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

//! generate OTP
userSchema.methods.generateOTP = function () {
  const firstDigit = Math.floor(Math.random() * 9) + 1;
  const remainingDigits = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");

  return parseInt(firstDigit.toString() + remainingDigits);
};

//! generate JWT token
userSchema.methods.jwtGenerateToken = function () {
  return jwt.sign(
    {
      id: this._id.toString(),
      role: this.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    },
  );
};

//! generate reset password token
userSchema.methods.generateResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordTokenExpire = Date.now() + 15 * 60 * 1000;

  return resetToken;
};

export const User = mongoose.model("User", userSchema);
