import crypto from "crypto";
import ProjectRegistration from "../models/projectRegistrationModel.js";
import User from "../models/user.js";

// ======================================
// RECRUITMENT WORKFLOW
// PI -> DRRD (verify) -> RND (fund check) -> DRRD (review)
//    -> DORD (approve / reject) -> DRRD (dispatch) -> PI + MEDIA CELL (web upload) -> PUBLISHED
// Rejected requests end at SENT_TO_PI and never reach the Media Cell.

// ======================================

export const STAGES = {
  DRRD_VERIFICATION: "DRRD_VERIFICATION",
  RND_FUND_CHECK: "RND_FUND_CHECK",
  DRRD_REVIEW: "DRRD_REVIEW",
  DORD_APPROVAL: "DORD_APPROVAL",
  DRRD_DISPATCH: "DRRD_DISPATCH",
  SENT_TO_PI: "SENT_TO_PI",
  MEDIA_PUBLISH: "MEDIA_PUBLISH",
  PUBLISHED: "PUBLISHED",
};

// Stages at which the PI may see the Dean's decision and the signed file
export const isDispatched = (stage) =>
  [STAGES.SENT_TO_PI, STAGES.MEDIA_PUBLISH, STAGES.PUBLISHED].includes(stage);

// Records created before the workflow existed have no stage:
// pending ones start at DRRD verification, decided ones are closed
export const getStage = (recruitment) =>
  recruitment.stage ||
  (recruitment.status === "Pending"
    ? STAGES.DRRD_VERIFICATION
    : STAGES.SENT_TO_PI);

// ======================================
// SIGNED PAYLOAD
// All form data of a request lives in signedPayload (exactly what the PI
// signed). Records that were never migrated still carry the same object in
// the first history entry, so fall back to that.
// ======================================

export const getSignedPayload = (recruitment) =>
  recruitment?.signedPayload ||
  recruitment?.history?.find((h) => h.stage === "PI_SUBMISSION")?.payload ||
  {};

// The Dean's decision is not stored a second time: it is the DORD_APPROVAL
// entry of the history (action, remarks, signature and signed payload).
export const getDeanDecision = (recruitment) =>
  recruitment?.history?.find((h) => h.stage === STAGES.DORD_APPROVAL);

// ======================================
// FORM HASH
// Every workflow signature includes the SHA-256 of the PI's signed form,
// so each signer is bound to the exact form contents they acted on.
// Keys are sorted so the hash does not depend on storage key order
// (same as canonicalPayload on the frontend).
// ======================================

const canonicalize = (value) => {
  if (value === null || typeof value !== "object") return value;

  if (Array.isArray(value)) return value.map(canonicalize);

  return Object.keys(value)
    .sort()
    .reduce((result, key) => {
      result[key] = canonicalize(value[key]);
      return result;
    }, {});
};

export const computeFormHash = (recruitment) =>
  crypto
    .createHash("sha256")
    .update(JSON.stringify(canonicalize(getSignedPayload(recruitment))))
    .digest("hex");

// ======================================
// SIGNATURE
// ======================================

const verifyRsa = (publicKey, data, signature) => {
  try {
    const verify = crypto.createVerify("RSA-SHA256");

    verify.update(data);

    verify.end();

    return verify.verify(publicKey, Buffer.from(signature, "base64"));
  } catch {
    return false;
  }
};

// Verifies an action signed with the acting user's private key and
// makes sure the signed payload belongs to this request, action and form
export const verifyActionSignature = async ({
  userId,
  payload,
  signature,
  recruitmentId,
  action,
  formHash,
}) => {
  if (!payload || !signature) {
    return { ok: false, status: 400, message: "Payload or signature missing" };
  }

  if (payload.recruitmentId !== recruitmentId || payload.action !== action) {
    return {
      ok: false,
      status: 400,
      message: "Signed payload does not match request",
    };
  }

  if (formHash && payload.formHash !== formHash) {
    return {
      ok: false,
      status: 400,
      message: "Signed payload does not match the request form",
    };
  }

  const user = await User.findById(userId);

  if (!user || !user.publicKey) {
    return { ok: false, status: 404, message: "Public key not found" };
  }

  if (!verifyRsa(user.publicKey, JSON.stringify(payload), signature)) {
    return {
      ok: false,
      status: 401,
      message: "Invalid private key uploaded. Signature verification failed",
    };
  }

  return { ok: true, user };
};

// ======================================
// HISTORY VERIFICATION
// Re-checks a signed history entry against its signer's public key.
// Result status:
//   valid        signature checks out
//   invalid      signature, payload or form binding is wrong
//   unverifiable signer or key cannot be found / nothing was signed
// ======================================

const findSigner = async (recruitment, entry) => {
  if (entry.stage === "PI_SUBMISSION") {
    return {
      user: await User.findOne({ email: recruitment.requestedBy, role: "PI" }),
      legacy: false,
    };
  }

  if (entry.userId) {
    return { user: await User.findById(entry.userId), legacy: false };
  }

  // Entries recorded before userId was stored: match by name and role
  if (!entry.by) return { user: null, legacy: true };

  const matches = await User.find({ fullName: entry.by, role: entry.role });

  return { user: matches.length === 1 ? matches[0] : null, legacy: true };
};

export const verifyHistoryEntry = async (recruitment, entry) => {
  const result = (status, message, extra = {}) => ({
    entryId: String(entry._id),
    stage: entry.stage,
    action: entry.action,
    role: entry.role,
    by: entry.by,
    status,
    message,
    ...extra,
  });

  const isPI = entry.stage === "PI_SUBMISSION";

  const payload = isPI ? getSignedPayload(recruitment) : entry.payload;

  const signature = isPI
    ? recruitment.signaturePI || entry.signature
    : entry.signature;

  if (!signature || !payload || !Object.keys(payload).length) {
    return result("unverifiable", "No signature recorded");
  }

  const { user, legacy } = await findSigner(recruitment, entry);

  if (!user?.publicKey) {
    return result(
      "unverifiable",
      legacy
        ? "Signer could not be identified (recorded before signer ID was stored)"
        : "Signer public key not found",
      { legacy },
    );
  }

  if (!isPI && user.role !== entry.role) {
    return result("invalid", "Signer role does not match", { legacy });
  }

  if (!verifyRsa(user.publicKey, JSON.stringify(payload), signature)) {
    return result("invalid", "Signature verification failed", { legacy });
  }

  if (isPI) {
    return result("valid", `Signed by ${user.fullName}`, { formBound: true });
  }

  if (
    payload.recruitmentId !== String(recruitment._id) ||
    payload.action !== entry.action
  ) {
    return result("invalid", "Signed payload does not match this step", {
      legacy,
    });
  }

  // Older signatures did not include the form hash
  if (!payload.formHash) {
    return result(
      "valid",
      `Signed by ${user.fullName} (form contents not covered)`,
      { legacy, formBound: false },
    );
  }

  if (payload.formHash !== computeFormHash(recruitment)) {
    return result("invalid", "Form changed after this signature", { legacy });
  }

  return result("valid", `Signed by ${user.fullName}`, {
    legacy,
    formBound: true,
  });
};

export const verifyHistory = (recruitment, entries = recruitment.history) =>
  Promise.all(
    (entries || []).map((entry) => verifyHistoryEntry(recruitment, entry)),
  );

// ======================================
// CHAIN OF SIGNATURES
// Every desk relies on all signatures before it. An action that moves the
// request forward is only allowed when every earlier signed step verifies.
// Rejections stay allowed, so a tampered request can still be sent back.
// ======================================

export const REJECT_ACTIONS = ["REJECT", "FUND_NOT_AVAILABLE", "REJECTED"];

// Returns null when the action may proceed, or the reason it may not
export const checkPreviousSignatures = async (recruitment, action) => {
  if (REJECT_ACTIONS.includes(action)) return null;

  const failed = (await verifyHistory(recruitment)).find(
    (result) => result.status !== "valid",
  );

  return failed
    ? `Previous signature not verified (${failed.role} ${failed.action}): ${failed.message}`
    : null;
};

// ======================================
// PROJECT FUNDS
// ======================================

// Project code is assigned by R&D on approval
export const findProjectByCode = (projectCode) =>
  ProjectRegistration.findOne({
    "rndDecision.signedPayload.projectCode": projectCode,
  }).lean();

// Division heads as the PI signed them. This object is part of the PI's
// signed payload and must NEVER be modified, otherwise the PI digital
// signature stops verifying. (Older registrations keep them on piSubmission.)
const sanctionedHeads = (project) =>
  project?.piSubmission?.signedPayload?.divisionHeads ||
  // project?.piSubmission?.divisionHeads ||
  {};

// Amounts blocked by approved recruitment requests are tracked separately,
// in project.blockedFunds[fundHead], never inside the signed payload.
// Available fund = sanctioned amount - blocked amount.
export const getAvailableFund = (project, fundHead) =>
  (Number(sanctionedHeads(project)[fundHead]) || 0) -
  (Number(project?.blockedFunds?.[fundHead]) || 0);

// Atomically blocks the amount only if the head still has enough.
// Path is written directly because the field is outside the schema keys.
export const blockFund = async (project, fundHead, amount) => {
  const sanctioned = Number(sanctionedHeads(project)[fundHead]) || 0;

  if (!(amount >= 0) || amount > sanctioned) return false;

  const blockedPath = `blockedFunds.${fundHead}`;

  // blocked + amount must stay <= sanctioned  =>  blocked <= sanctioned - amount
  const result = await ProjectRegistration.collection.updateOne(
    {
      _id: project._id,
      $or: [
        { [blockedPath]: { $exists: false } },
        { [blockedPath]: { $lte: sanctioned - amount } },
      ],
    },
    { $inc: { [blockedPath]: amount } },
  );

  return result.modifiedCount === 1;
};

export const releaseFund = async (projectCode, fundHead, amount) => {
  const project = await findProjectByCode(projectCode);

  if (!project) return false;

  const result = await ProjectRegistration.collection.updateOne(
    { _id: project._id },
    { $inc: { [`blockedFunds.${fundHead}`]: -amount } },
  );

  return result.modifiedCount === 1;
};
