import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import connectDB from "./db.js";
import User from "./models/user.js";
import Purchase from "./models/PurchaseModel.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { auth } from "./middleware/auth.js";
import fs from "fs";
import puppeteer from "puppeteer";
import projectRoutes from "./routes/projectsRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
// import fundBookingRoutes from "./routes/fundBookingRoutes.js";
import recruitmentRoutes from "./routes/recruitmentRoutes.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
// CORS — allow local dev frontends (Vite on any localhost port).
// Proxied requests in dev are same-origin, so this only blocks unknown external origins.
app.use(
  cors({
    origin:process.env.FRONTEND_URL,
    credentials:true,
  }),
);

// connect to DB
connectDB();
console.log("FRONTEND_URL =", process.env.FRONTEND_URL);
console.log("JWT_SECRET =", process.env.JWT_SECRET ? "Loaded" : "Missing");

// SIGNUP API
app.post("/api/signup", async (req, res) => {
  try {
    const { fullName, email, employeeId, department, role, password } =
      req.body;

    // check existing email
    const userExist = await User.findOne({ email });
    if (userExist) {
      return res.status(400).json({ message: "Email already registered" });
    }
    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create user
    const user = await User.create({
      fullName,
      email,
      employeeId,
      department,
      role,
      password: hashedPassword,
    });

    res.json({ success: true, userId: user._id });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ⬇️ Save Public Key After Key Generation
app.post("/api/save-public-key", async (req, res) => {
  try {
    const { email, publicKey } = req.body;

    if (!email || !publicKey) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const user = await User.findOneAndUpdate(
      { email },
      { publicKey },
      { new: true },
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Verification key saved successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// --- Login Route ---
app.post("/api/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role !== role)
      return res.status(403).json({ message: "Role mismatch" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign(
      {
        id: user._id,
        fullName: user.fullName,
        role: user.role.toUpperCase(),
        email: user.email,
        employeeId: user.employeeId,
        department: user.department,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.json({
      success: true,
      token,
      user: {
        fullName: user.fullName,
        role: user.role,
        email:user.email,
        employeeId:user.employeeId,
        department:user.department,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/purchase/submit", async (req, res) => {
  try {
    const form = req.body;

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    // Generate HTML directly from backend
    const html = generatePurchaseHTML(form);

    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        bottom: "20px",
        left: "20px",
        right: "20px",
      },
    });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=purchase.pdf",
    });

    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).send("Error generating PDF");
  }
});

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "E-Procura backend is running" });
});

app.use("/api/projects", projectRoutes);
app.use("/api/files", fileRoutes);
// app.use("/api/fund-booking", fundBookingRoutes);
app.use("/api/recruitment", recruitmentRoutes);

// SERVER RUN
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
