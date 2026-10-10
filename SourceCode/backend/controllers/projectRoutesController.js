import ProjectRegistration from "../models/projectRegistrationModel.js";
import crypto from "crypto";
import User from "../models/user.js";
import cloudinary from "../config/cloudinary.js";
import uploadPdfToCloudinary from "../utils/uploadPdfToCloudinary.js";

// helper for verify signature
const verifySig = (publicKey, payload, signature) => {
  const v = crypto.createVerify("RSA-SHA256");
  v.update(JSON.stringify(payload));
  v.end();
  return v.verify(publicKey, Buffer.from(signature, "base64"));
};

const sha256 = (str) =>
  crypto.createHash("sha256").update(str).digest("hex");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePayload = (p) => (typeof p === "string" ? JSON.parse(p) : p);

// A sequence number is valid only if it is a whole number >= 1
const isValidSeq = (n) => Number.isInteger(n) && n >= 1;


// CREATE PROJECT BY PI
export const createProject = async (req, res) => {
  try {
    // Role check
    if (req.user.role !== "PI") {
      return res.status(403).json({
        message: "Unauthorized",
      });
    }

    if (!req.body.formData)
      return res.status(400).json({ msg: "formData missing" });

    if (!req.body.signature)
      return res.status(400).json({ msg: "signature missing" });

    if (!req.file) return res.status(400).json({ msg: "attachment missing" });

    const parsedForm = JSON.parse(req.body.formData); //string to object
    const email = req.user.email;
    const user = await User.findOne({ email });

    if (!user || !user.publicKey) {
      return res.status(404).json({ msg: "Public key not found" });
    }

    // 🔐 Verify PI signature
    const verify = crypto.createVerify("RSA-SHA256");
    verify.update(JSON.stringify(parsedForm));
    verify.end();

    const isValid = verify.verify(
      user.publicKey,
      Buffer.from(req.body.signature, "base64"),
    );

    if (!isValid) {
      return res.status(400).json({
        msg: "Invalid private key uploaded. Signature verification failed",
      });
    }

    // 📄 Hash uploaded PDF
    const fileBuffer = req.file.buffer;

    const backendPdfHash = crypto // Verify PDF Hash
      .createHash("sha256")
      .update(fileBuffer)
      .digest("hex");

    if (parsedForm.pdfHash !== backendPdfHash) {
      return res.status(400).json({ msg: "PDF tampered or mismatch" });
    }

    const total =
      parsedForm.divisionHeads["Manpower (including Interns)"] +
      parsedForm.divisionHeads["Equipment"] +
      parsedForm.divisionHeads["Consumables/Contingency/Travel"] +
      parsedForm.divisionHeads["Bootcamps/Events"] +
      parsedForm.divisionHeads["Overhead"];

    if (total > parsedForm.totalFundReceived) {
      return res.status(400).json({ msg: "Exceeds available funds" });
    }

    // ✅ Append PI submission (NO overwrite)
    const uploadResult = await uploadPdfToCloudinary(
      req.file.buffer,
      "e-procura-uploads",
      req.file.originalname,
    );

    // Create document
    const projectRegistration = await ProjectRegistration.create({
      piSubmission: {
        signedPayload: parsedForm,

        signaturePI: req.body.signature,

        attachmentUrl: uploadResult.secure_url,
        attachmentPublicId: uploadResult.public_id,
        attachmentOriginalName: req.file.originalname,

        submittedBy: email,

        status: "PENDING",

        timestamp: new Date(),
      },
    });

    res.status(201).json({
      success: true,
      projectRegistration,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      msg: "Server Error",
    });
  }
};

// Generate Empld - PI List for rnd form
export const getPIList = async (req, res) => {
  const piList = await User.find({ role: "PI" }).select("fullName employeeId");
  res.json(piList);
};

// RND: GENERATE PROJECT CODE (separate step, before approve)
const padSeq = (n) => String(n).padStart(4, "0");

// Next sequence for this year + department (max of approved + 1)
const getNextSequence = async (year, department) => {
  const last = await ProjectRegistration.findOne({
    "rndDecision.year": year,
    "rndDecision.department": department,
    "rndDecision.sequenceNumber": { $type: "number", $gte: 1 },
  })
    .sort({ "rndDecision.sequenceNumber": -1 })
    .select("rndDecision.sequenceNumber")
    .lean();

  const lastSeq = Number(last?.rndDecision?.sequenceNumber);
  return isValidSeq(lastSeq) ? lastSeq + 1 : 1;
};

export const getNextSequenceForProject = async (req, res) => {
  try {
    if (req.user.role !== "RND") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    const project = await ProjectRegistration.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }
    if (project.piSubmission.status !== "PENDING") {
      return res.status(400).json({ success: false, message: "Project already decided" });
    }

    const department = project.piSubmission.signedPayload?.department;
    if (!department) {
      return res.status(400).json({ success: false, message: "Department missing" });
    }

    const year = new Date().getFullYear();
    const sequenceNumber = await getNextSequence(year, department);

    res.json({ success: true, year, department, sequenceNumber });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error fetching sequence" });
  }
};
// PI - Get all Approved Registration Projects
export const getApprovedRegistrationProjects = async (req, res) => {
  try {
    const employeeId = req.user.employeeId; // coming from JWT

    const projects = await ProjectRegistration.find({
      "piSubmission.signedPayload.piEmpId": employeeId, // Must match DB field
      "piSubmission.status": "APPROVED",
    }).sort({ "piSubmission.timestamp": -1 });

    res.status(200).json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// PI - Get all Registration Projects status
export const getRegistrationStatus = async (req, res) => {
  try {
    const employeeId = req.user.employeeId;

    const projects = await ProjectRegistration.find({
      "piSubmission.signedPayload.piEmpId": employeeId,
      "piSubmission.status": {
        $in: ["PENDING", "REJECTED", "APPROVED"],
      },
    }).sort({ "piSubmission.timestamp": -1 });

    res.status(200).json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// PI: GET SINGLE PROJECT BY ID (FOR SUMMARY)
export const getProjectsById = async (req, res) => {
  try {
    const project = await ProjectRegistration.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    if (
      req.user.role === "PI" &&
      project.piSubmission?.signedPayload?.piEmpId !== req.user.employeeId
    ) {
      return res.status(403).json({
        message: "Access denied",
      });
    }
    res.json(project);
  } catch (err) {
    console.error("Error fetching project:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET FILTER BASED PROJECT REGISTRATION - ALL,PENDING,APPROVED,REJECTED
export const getProjectRegistrations = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};

    if (status) {
      filter["piSubmission.status"] = status;
    }

    const projects = await ProjectRegistration.find(filter).sort({
      "piSubmission.timestamp": -1,
    });

    res.status(200).json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const approveProjectRegistration = async (req, res) => {
  try {
    if (req.user.role !== "RND") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { id } = req.params;
    const { payload, signature } = req.body;

    const rndUser = await User.findById(req.user.id);
    if (!rndUser?.publicKey) {
      return res.status(404).json({ success: false, message: "RND user not found" });
    }

    const project = await ProjectRegistration.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }
    if (project.piSubmission.status !== "PENDING") {
      return res.status(400).json({ success: false, message: "Project already decided" });
    }

    // 1) Re-verify the PI signature on the server
    const pi = await User.findOne({ email: project.piSubmission.submittedBy, role: "PI" });
    if (
      !pi?.publicKey ||
      !verifySig(pi.publicKey, project.piSubmission.signedPayload, project.piSubmission.signaturePI)
    ) {
      return res.status(400).json({
        success: false,
        message: "PI signature is invalid. Cannot approve.",
      });
    }

    // 2) Verify R&D's own signature
    if (!verifySig(rndUser.publicKey, payload, signature)) {
      return res.status(401).json({
        success: false,
        message: "Invalid private key uploaded. Signature verification failed",
      });
    }

    // 3) R&D must have signed this exact project, PI submission and project code
    const data = parsePayload(payload);
    const department = project.piSubmission.signedPayload?.department;
    if (!department) {
      return res.status(400).json({ success: false, message: "Department missing" });
    }

    if (
      data.projectId !== String(project._id) ||
      data.action !== "APPROVED" ||
      data.piSignatureHash !== sha256(project.piSubmission.signaturePI)
    ) {
      return res.status(400).json({
        success: false,
        message: "Signed data does not match the PI submission",
      });
    }

    // 4) generate it in the server too and compare
    const year = new Date().getFullYear();
    const expectedSeq = await getNextSequence(year, department);
    const expectedCode = `${year}/${department}/${padSeq(expectedSeq)}`;

    if (
      Number(data.year) !== year ||
      data.department !== department ||
      Number(data.sequenceNumber) !== expectedSeq ||
      data.projectCode !== expectedCode
    ) {
      return res.status(409).json({
        success: false,
        message: "Project code is outdated. Generate the code again.",
      });
    }
const actionAt = new Date();
    // 5) save to db
    project.piSubmission.status = "APPROVED";
    project.rndDecision = {
      signedPayload: payload,
      signatureRND: signature,
      signedById: rndUser._id,
      year,
      department,
      sequenceNumber: expectedSeq,
      actionAt
    };

    try {
      await project.save();
    } catch (e) {
      if (e.code === 11000) {
        
        return res.status(409).json({
          success: false,
          message: "Project code was just taken. Generate the code again.",
        });
      }
      throw e;
    }

    res.json({ success: true, message: "Project Approved Successfully", project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};


// REJECTED BY RND
export const rejectProjectRegistration = async (req, res) => {
  try {
    if (req.user.role !== "RND") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { id } = req.params;
    const { payload, signature } = req.body;

    const rndUser = await User.findById(req.user.id);
    if (!rndUser?.publicKey) {
      return res.status(404).json({ success: false, message: "RND user not found" });
    }

    const project = await ProjectRegistration.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }
    if (project.piSubmission.status !== "PENDING") {
      return res.status(400).json({ success: false, message: "Project already decided" });
    }

    // 1) Re-verify the PI signature on the server
    const pi = await User.findOne({ email: project.piSubmission.submittedBy, role: "PI" });
    if (
      !pi?.publicKey ||
      !verifySig(pi.publicKey, project.piSubmission.signedPayload, project.piSubmission.signaturePI)
    ) {
      return res.status(400).json({
        success: false,
        message: "PI signature is invalid. Cannot reject.",
      });
    }

    // 2) Verify R&D's own signature
    if (!verifySig(rndUser.publicKey, payload, signature)) {
      return res.status(401).json({
        success: false,
        message: "Invalid private key uploaded. Signature verification failed",
      });
    }

    // 3) R&D must have signed this exact project and PI submission
    const data = parsePayload(payload);
    if (
      data.projectId !== String(project._id) ||
      data.action !== "REJECTED" ||
      data.piSignatureHash !== sha256(project.piSubmission.signaturePI)
    ) {
      return res.status(400).json({
        success: false,
        message: "Signed data does not match the PI submission",
      });
    }
    const actionAt = new Date();

    // Overwrites rndDecision, so any pre-generated project code is released
    project.piSubmission.status = "REJECTED";
    project.rndDecision = {
      signedPayload: payload,
      signatureRND: signature,
      signedById: rndUser._id,
      actionAt
    };

    await project.save();

    res.json({ success: true, message: "Project Rejected Successfully", project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// VERIFY PI DIGITAL SIGNATURE FOR PROJECT REGISTRATION
export const verifyPISignature = async (req, res) => {
  try {
    const project = await ProjectRegistration.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const sub = project.piSubmission;

    // A PI can only verify their own project
    if (req.user.role === "PI" && sub.submittedBy !== req.user.email) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const pi = await User.findOne({ email: sub.submittedBy, role: "PI" });
    if (!pi?.publicKey) {
      return res.status(404).json({ success: false, message: "PI public key not found" });
    }

    // Exactly what the PI signed: the stored signedPayload
    const verified = verifySig(pi.publicKey, sub.signedPayload, sub.signaturePI);

    res.json({ success: true, verified, signedBy: pi.fullName });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Verification failed" });
  }
};

// VERIFY RND SIGNATURE FOR PROJECT REGISTRATION
export const verifyRNDSignature = async (req, res) => {
  try {
    const project = await ProjectRegistration.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const piSub = project.piSubmission;
    const rndDecision = project.rndDecision;

    if (req.user.role === "PI" && piSub.submittedBy !== req.user.email) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (!rndDecision?.signatureRND) {
      return res.status(404).json({ success: false, message: "No R&D decision yet" });
    }

    const rnd = await User.findById(rndDecision.signedById);
    if (!rnd?.publicKey) {
      return res.status(404).json({ success: false, message: "R&D public key not found" });
    }

    const data = parsePayload(rndDecision.signedPayload);

    const signatureValid = verifySig(rnd.publicKey, rndDecision.signedPayload, rndDecision.signatureRND);

    // R&D must have signed THIS project, THIS action, THIS PI submission
    const sameProject = data?.projectId === String(project._id);
const sameAction = data?.action === piSub.status; // APPROVED / REJECTED
const samePISubmission = data?.piSignatureHash === sha256(piSub.signaturePI);
const sameSequence =
  piSub.status !== "APPROVED" ||
  (Number(data?.year) === rndDecision.year &&
    data?.department === rndDecision.department &&
    Number(data?.sequenceNumber) === rndDecision.sequenceNumber &&
    data?.projectCode ===
      `${rndDecision.year}/${rndDecision.department}/${padSeq(rndDecision.sequenceNumber)}`);

res.json({
  success: true,
  verified: signatureValid && sameProject && sameAction && samePISubmission && sameSequence,
  details: { signatureValid, sameProject, sameAction, samePISubmission, sameSequence },
  signedBy: rnd.fullName,
});
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Verification failed" });
  }
};
