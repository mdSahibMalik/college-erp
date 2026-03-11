import AppError from "../src/utils/appError.js";
import asyncErrorHandler from "../src/utils/asyncErrorHandler.js";
import jwt from "jsonwebtoken";

export const isAuthenticated = asyncErrorHandler(async (req, res, next) => {
  let token;

  // Get token from cookie or header
  if (req.cookies?.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization) {
    token = req.headers.authorization.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : req.headers.authorization;
  }
  if (!token) {
    return next(new AppError("Unauthorized access", 401));
  }
    try {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      req.user ={
        id: decodedToken.id,
        role: decodedToken.role,
      };
      next();
    } catch (error) {
      return next(new AppError("Invalid or expired token", 401));
    }

});
