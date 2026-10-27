import mongoose from "mongoose";

// ======================================
// MAIN RECRUITMENT SCHEMA
// ======================================

const recruitmentSchema = new mongoose.Schema(
  {
    // ======================================
    // PI SUBMISSION
    // All form data (project, PI, positions, fund, interview, committee)
    // is stored once, in signedPayload: the exact object the PI signed.
    // Not `required` at schema level so older records still validate on
    // save(); the create controller enforces it for new requests.
    // ======================================

    signedPayload: {
      type: mongoose.Schema.Types.Mixed,
    },

    signaturePI: {
      type: String,
    },

    // Email of the PI who submitted the request
    requestedBy: {
      type: String,
    },

    // Uploaded application form PDF
    attachment: {
      type: String,
    },

    // ======================================
    // PDF DETAILS
    // ======================================

    recruitmentAdPath: {
      type: String,
    },

    approvalLetterPath: {
      type: String,
    },

    signedApprovalPdf: {
      type: String,
    },

    // ======================================
    // APPROVAL WORKFLOW
    // ======================================

    status: {
      type: String,

      enum: ["Pending", "Approved", "Rejected"],

      default: "Pending",
    },

    // Current desk of the request:
    // PI -> DRRD -> RND -> DRRD -> DORD -> DRRD -> PI + MEDIA_PUBLISH,PUBLISHED
    // No default: older records without a stage are derived in
    // utils/recruitmentWorkflow.js (getStage)
    stage: {
      type: String,

      enum: [
        "DRRD_VERIFICATION",
        "RND_FUND_CHECK",
        "DRRD_REVIEW",
        "DORD_APPROVAL",
        "DRRD_DISPATCH",
        "SENT_TO_PI",
        "MEDIA_PUBLISH",
        "PUBLISHED",
      ],
    },

    // True once R&D has blocked the requested amount on the fund head
    fundBlocked: {
      type: Boolean,
    },

    fundCheck: {
      available: Boolean,
      availableAmount: Number,
      remarks: String,
      checkedBy: String,
      timestamp: Date,
    },

    // Signed audit trail of every action taken on the request
    history: [
      {
        stage: String,
        action: String,
        role: String,
        // Signer's user id, used to re-verify the signature later.
        // Missing on entries recorded before it was stored.
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        by: String,
        remarks: String,
        signature: String,
        payload: Object,
        at: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    deanRemarks: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

const Recruitment = mongoose.model("Recruitment", recruitmentSchema);
export default Recruitment;
