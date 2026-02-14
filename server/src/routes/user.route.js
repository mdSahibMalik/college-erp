import express from 'express';
import dotenv from 'dotenv';
import { userRegister } from '../controllers/user.controllers.js';
dotenv.config();

const userRouter = express.Router();

userRouter.post('/verify-account',userRegister);


export default userRouter;