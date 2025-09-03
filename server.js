import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import tenantRoutes from "./routes/tenantRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import cors from "cors";

dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use(cors());
// Routes
app.use("/api/tenants", tenantRoutes);
app.use("/api/payments", paymentRoutes);
app.get("/", (req, res) => {
  res.send("API is running...");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
