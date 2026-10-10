import express from "express";
import { auth } from "../middleware/auth.js";
import ProjectRegistration from "../models/projectRegistrationModel.js";
import crypto from "crypto";
const router = express.Router();

// Download project file with tamper check
router.get("/:id", auth(["PI","RND"]), async (req, res) => {
  try {
    const project = await ProjectRegistration.findById(req.params.id);
    if (!project) return res.status(404).json({ msg: "Not found" });

    // 🔐 ownership check
    // if (project.piSubmission?.piEmpId !== req.user.employeeId) {
    //   return res.status(403).json({ msg: "Unauthorized access" });
    // }
    if (
  req.user.role === "PI" &&
  project.piSubmission?.signedPayload?.piEmpId !== req.user.employeeId
) {
  return res.status(403).json({
    message: "Unauthorized access",
  });
}

    const attachmentUrl = project.piSubmission?.attachmentUrl;

    if (!attachmentUrl) {
      return res.status(404).json({
        message: "No attachment found",
      });
    }

    let fileBuffer;

    const response = await fetch(attachmentUrl);

    if (!response.ok) {
      return res.status(404).json({
        tampered: true,
        message: "Unable to retrieve file from cloud storage",
      });
    }

    fileBuffer = Buffer.from(await response.arrayBuffer());

    if (!fileBuffer) {
      return res.status(404).json({
        tampered: true,
        message: "File missing",
      });
    }

    const newHash = crypto
      .createHash("sha256")
      .update(fileBuffer)
      .digest("hex");

    if (newHash !== project.piSubmission?.signedPayload.pdfHash) {
      return res.status(400).json({
        tampered: true,
        message: "File content tampered",
      });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.send(fileBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error reading file" });
  }
});

export default router;
