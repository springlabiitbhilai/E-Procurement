import express from "express";
const router = express.Router();
import { auth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import {
  getNextSequenceForProject,
  createProject,
  getPIList,
  getProjectsById,
  getApprovedRegistrationProjects,
  // updateProjectStatus,
  getRegistrationStatus,
  getProjectRegistrations,
  rejectProjectRegistration,
  approveProjectRegistration,
  verifyPISignature,
  verifyRNDSignature
} from "../controllers/projectRoutesController.js";

// Generate Empld - PI List for rnd form
router.get("/pi-list", getPIList);

// Generate Poject code by RND
// router.post("/project-code", generateProjectCode);
router.get("/:id/next-sequence", auth(["RND"]), getNextSequenceForProject);

// PROJECT FORM CREATED BY PI
router.post("/", auth(["PI"]), upload.single("attachment"), createProject); // changed

// GET FILTER BASED PROJECT REGISTRATION - ALL,PENDING,APPROVED,REJECTED
router.get("/", auth(["PI", "RND", "DRRD"]), getProjectRegistrations);

// UPDATE STATUS BY RND
// router.patch("/:id/status", auth(["RND"]), updateProjectStatus);

// PI: GET ALL APPROVED PROJECTS REGISTRATION
router.get("/approved", auth(["PI"]), getApprovedRegistrationProjects);

// PI: GET ALL PENDING AND REJECT PROJECTS REGISTRATION
router.get("/registration-status", auth(["PI"]), getRegistrationStatus);
router.patch("/:id/approve", auth(["RND"]), approveProjectRegistration);

router.patch("/:id/reject", auth(["RND"]), rejectProjectRegistration);

// PI: GET SINGLE PROJECT BY ID (FOR SUMMARY)
router.get("/:id", auth(["PI", "RND"]), getProjectsById);

router.get("/:id/verify-pi", auth(["PI", "RND", "DRRD"]), verifyPISignature);
router.get("/:id/verify-rnd", auth(["PI", "RND", "DRRD"]), verifyRNDSignature);
export default router;
