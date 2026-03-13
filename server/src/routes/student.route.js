import express from "express";
import { getAssignmetns, getAttendance, submitAssignments } from "../controllers/student.controllers.js";
import { isAuthenticated } from "../../middleware/isAuthenticate.js";
import upload from "../../middleware/multer.js";
export const studentRouter = express.Router();

studentRouter.get("/get-attendance",isAuthenticated, getAttendance);
studentRouter.get("/get-assignments",isAuthenticated, getAssignmetns);
studentRouter.post("/submit-assignment/:assignmentId",isAuthenticated, upload.single("assignmentFile"), submitAssignments);
