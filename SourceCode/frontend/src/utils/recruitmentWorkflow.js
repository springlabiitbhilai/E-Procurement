import {
  readPem,
  importPrivateKey,
  signData,
  canonicalPayload,
  sha256Hex,
} from "./digitalSignature";

// Recruitment workflow:
// PI -> DRRD (verify) -> R&D (fund check) -> DRRD (review)
//    -> DORD (approve / reject) -> DRRD (dispatch) -> PI

export const WORKFLOW_STEPS = [
  { stage: "PI_SUBMISSION", label: "PI Submitted" },
  { stage: "DRRD_VERIFICATION", label: "DRRD Verification" },
  { stage: "RND_FUND_CHECK", label: "R&D Fund Check" },
  { stage: "DRRD_REVIEW", label: "DRRD Review" },
  { stage: "DORD_APPROVAL", label: "DORD Approval" },
  { stage: "DRRD_DISPATCH", label: "DRRD Dispatch" },
  { stage: "SENT_TO_PI", label: "Sent to PI" },
];

export const STAGE_LABELS = {
  DRRD_VERIFICATION: "With DRRD for verification",
  RND_FUND_CHECK: "With R&D for fund check",
  DRRD_REVIEW: "With DRRD for review",
  DORD_APPROVAL: "With DORD for approval",
  DRRD_DISPATCH: "With DRRD for dispatch",
  SENT_TO_PI: "Sent to PI",
};

export const ACTION_LABELS = {
  SUBMITTED: "Submitted",
  FORWARD: "Forwarded",
  REJECT: "Rejected",
  FUND_AVAILABLE: "Fund available",
  FUND_NOT_AVAILABLE: "Fund not available",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SEND_TO_PI: "Sent to PI",
};

// Every desk relies on all signatures before it: forward / approve actions
// need every earlier signed step verified. Rejections stay allowed, so a
// tampered request can still be sent back (same rule as the backend).
export const REJECT_ACTIONS = ["REJECT", "FUND_NOT_AVAILABLE", "REJECTED"];

// Sums up /verify-history results into one status for the whole chain
export const summarizeChain = (results = []) => {
  const failed = results.find((result) => result.status !== "valid");

  if (failed) {
    return {
      status: failed.status,
      message: `${failed.role} ${
        ACTION_LABELS[failed.action] || failed.action
      }: ${failed.message}`,
    };
  }

  const unbound = results.filter((result) => result.formBound === false);

  return {
    status: "valid",
    formBound: unbound.length === 0,
    message: unbound.length
      ? `All ${results.length} signatures verified; ${unbound
          .map((result) => result.role)
          .join(", ")} signed before form binding`
      : `All ${results.length} signatures verified`,
  };
};

// The PI's signed form. Records that were never migrated keep it in the
// first history entry (same fallback as the backend).
export const getSignedPayload = (recruitment) =>
  recruitment?.signedPayload ||
  recruitment?.history?.find((h) => h.stage === "PI_SUBMISSION")?.payload ||
  {};

// SHA-256 of the PI's signed form (sorted keys), included in every
// workflow signature so the signer is bound to the exact form contents.
// Must match computeFormHash in backend/utils/recruitmentWorkflow.js.
export const computeFormHash = (recruitment) =>
  sha256Hex(JSON.stringify(canonicalPayload(getSignedPayload(recruitment))));

// Signs a workflow action with the user's private key
export const signWorkflowAction = async ({
  privateKeyFile,
  recruitment,
  action,
  remarks = "",
}) => {
  const payload = canonicalPayload({
    recruitmentId: recruitment._id,
    action,
    remarks,
    formHash: await computeFormHash(recruitment),
    timestamp: new Date().toISOString(),
  });

  const pem = await readPem(privateKeyFile);

  const privateKey = await importPrivateKey(pem);

  const signature = await signData(privateKey, payload);

  return { payload, signature };
};
