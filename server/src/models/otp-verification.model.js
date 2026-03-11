import mongoose from "mongoose";

const otpVerificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:"User",
        required: true,
    },
    otp: {
        type: String,
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    }
})

const OtpVerification = mongoose.model("OtpVerification", otpVerificationSchema);

export {OtpVerification};