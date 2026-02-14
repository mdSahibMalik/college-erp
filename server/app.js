import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import userRouter from './src/routes/user.route.js';
import globalErrorHandler from './src/utils/globalError.js';
dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

//* All Routes user teacher and admin
app.use('/api/v1/users', userRouter);
app.get('/', async (req, res) => {
  res.send('Welcome to the College ERP System');
});
app.use(globalErrorHandler)
export default app;