import mongoose from "mongoose";

const purchaseSchema = new mongoose.Schema(
  {
    fileNo: {
      type: String,
      unique: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    pdfHash: {
      type: String,
      required: true,
    },
    signaturePI: {
      type: String,
      required: true,
    },
    submittedBy: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "Pending_Technical",
    },
    currentStep: {
      type: Number,
      default: 1,
    },
    approvals: [
      {
        role: String,
        email: String,
        signature: String,
        approvedAt: Date,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Purchase", purchaseSchema);