import mongoose from "mongoose";

const projectRegistrationSchema = new mongoose.Schema(
  {
    piSubmission: {
      signedPayload: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
      },
      signaturePI: {
        type: String,
        required: true,
      },
      // Uploaded PDF
      attachmentUrl: {
        type: String,
      },

      attachmentPublicId: {
        type: String,
      },

      attachmentOriginalName: {
        type: String,
      },

      submittedBy: {
        type: String,
      },
      status: {
        type: String,
        enum: ["PENDING", "APPROVED", "REJECTED"],
        default: "PENDING",
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
    // R&D DECISION: everything lives inside the signed payload
rndDecision: {
  signedPayload: mongoose.Schema.Types.Mixed, // action, projectCode, sequenceNumber, reason, signedById, ...
  signatureRND: String,
  signedById: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  year:Number,
  department:String,
  sequenceNumber: Number,
   // Amount blocked per fund head by approved recruitment requests, e.g.
   // { "Manpower (including Interns)": 480000 }. Kept outside
   // piSubmission.signedPayload so the PI's signed data never changes.
  blockedFunds: mongoose.Schema.Types.Mixed,
  actionAt: Date,
},
  },
  {
    timestamps: true,
  },
);

// to block duplicate sequence in same year and department
projectRegistrationSchema.index(
  { "rndDecision.year": 1, "rndDecision.department": 1, "rndDecision.sequenceNumber": 1 },
  { unique: true, partialFilterExpression: { "rndDecision.sequenceNumber": { $exists: true } } }
);

const ProjectRegistration = mongoose.model(
  "ProjectRegistration",
  projectRegistrationSchema,
);

export default ProjectRegistration;
