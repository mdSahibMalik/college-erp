import express from "express";
import { getAssignmetns, getAttendance } from "../controllers/student.controllers.js";
import { isAuthenticated } from "../../middleware/isAuthenticate.js";
export const studentRouter = express.Router();

studentRouter.get("/get-attendance",isAuthenticated, getAttendance);
studentRouter.get("/get-assignments",isAuthenticated, getAssignmetns);
