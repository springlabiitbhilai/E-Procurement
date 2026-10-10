import express from "express";
const router = express.Router();
import { upload } from "../middleware/upload.js";
import { auth } from "../middleware/auth.js";
import Recruitment from "../models/recruitmentModel.js";

import {
  generateApprovalLetter,
  createRecruitmentAdvertisement,
  getAllRecruitments,
  approveRecruitment,
  rejectRecruitment,
  drrdAction,
  rndFundCheck,
  getMyRequests,
  verifyRecruitmentPISignature,
  verifyRecruitmentHistory,
} from "../controllers/recruitmentController.js";

// ======================================
// PI ROUTES
// ======================================

router.post("/generate-approval-letter", auth(["PI"]), generateApprovalLetter);

router.post(
  "/create-advertisement",
  auth(["PI"]),
  upload.single("attachment"),
  createRecruitmentAdvertisement,
);
// PI can view own requests

router.get("/my-requests", auth(["PI"]), getMyRequests);

// ======================================
// WORKFLOW ROUTES
// PI -> DRRD -> RND -> DRRD -> DORD -> DRRD -> PI
// ======================================

// Fetch all recruitments

router.get("/", auth(["DRRD", "RND", "DORD"]), getAllRecruitments);

// DRRD: verify / review / send final file to PI

router.put("/:id/drrd-action", auth(["DRRD"]), drrdAction);

// R&D: fund availability check

router.put("/:id/fund-check", auth(["RND"]), rndFundCheck);

// ======================================
// DEAN DASHBOARD ROUTES
// ======================================

// Approve recruitment

router.put(
  "/:id/approve",
  auth(["DORD"]),
  upload.single("signedPdf"),
  approveRecruitment,
);

// Reject recruitment

router.put("/:id/reject", auth(["DORD"]), rejectRecruitment);

// Verify the PI's digital signature on a recruitment request
router.get(
  "/:id/verify-pi",
  auth(["PI", "DRRD", "RND", "DORD"]),
  verifyRecruitmentPISignature,
);

// Re-verify every signed step (PI, DRRD, R&D, Dean) of a request
router.get(
  "/:id/verify-history",
  auth(["PI", "DRRD", "RND", "DORD"]),
  verifyRecruitmentHistory,
);

router.put("/:id/approval-letter", async (req, res) => {
  try {
    const { id } = req.params;

    const { approvalLetterPath } = req.body;

    const recruitment = await Recruitment.findByIdAndUpdate(
      id,
      {
        approvalLetterPath,
      },
      {
        new: true,
      },
    );

    res.status(200).json({
      success: true,
      recruitment,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

export default router;
