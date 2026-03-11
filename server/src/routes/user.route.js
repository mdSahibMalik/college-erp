import express from "express";
import dotenv from "dotenv";
import {
  forgetPassword,
  login,
  resetPassword,
  setPassword,
  userRegister,
  verifyOTP,
} from "../controllers/user.controllers.js";
dotenv.config();

const userRouter = express.Router();
userRouter.post("/verify-account", userRegister);
userRouter.post("/verify-otp", verifyOTP);
userRouter.post("/set-password", setPassword);
userRouter.post("/login", login);
userRouter.post("/forget-password", forgetPassword);
userRouter.post("/reset-password/:token", resetPassword);

export default userRouter;
