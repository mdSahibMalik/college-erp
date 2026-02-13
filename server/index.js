import dotenv from "dotenv";
dotenv.config();
import connectDB from "./src/database/database.connection.js";
import app from "./app.js";

const PORT = process.env.PORT || 5000;
const connectionDB = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.log("something went wrong while database connection...");
    process.exit(1);
  }
};

connectionDB();
