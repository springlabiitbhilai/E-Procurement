import Recruitment from "../models/recruitmentModel.js";
import ejs from "ejs";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { isDispatched } from "../utils/recruitmentWorkflow.js";
import puppeteer from "puppeteer";
import chromium from "@sparticuz/chromium";
import { fileURLToPath } from "url";
import ProjectRegistration from "../models/projectRegistrationModel.js";
import User from "../models/user.js";
import uploadPdfToCloudinary from "../utils/uploadPdfToCloudinary.js";
import {
  STAGES,
  getStage,
  getSignedPayload,
  getDeanDecision,
  verifyActionSignature,
  computeFormHash,
  verifyHistory,
  checkPreviousSignatures,
  findProjectByCode,
  getAvailableFund,
  blockFund,
  releaseFund,
} from "../utils/recruitmentWorkflow.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const generateApprovalLetter = async (req, res) => {
  try {
    if (req.user.role !== "PI") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }
    const data = req.body;
    const currentDate = new Date().toLocaleDateString("en-GB");
    // Load Template

    const templatePath = path.join(
      __dirname,
      "../templates/approvalLetter.ejs",
    );

    // Render HTML

    const logoBase64 = fs.readFileSync(
      path.join(__dirname, "../assets/iit-logo.png"),
      "base64",
    );

    const g20Base64 = fs.readFileSync(
      path.join(__dirname, "../assets/g20-logo.png"),
      "base64",
    );

    const azadiBase64 = fs.readFileSync(
      path.join(__dirname, "../assets/azadi-logo.png"),
      "base64",
    );

    const html = await ejs.renderFile(templatePath, {
      ...data,
      currentDate,

      logoBase64,
      g20Base64,
      azadiBase64,
    });

    const headerTemplate = `
        <div style="
            width:100%;
            padding:0 25px;
            box-sizing:border-box;
            font-family:'Times New Roman';
        ">

            <div style="
                display:flex;
                justify-content:space-between;
                align-items:flex-start;
                width:100%;
            ">

                <div>
                    <img
                        src="data:image/png;base64,${logoBase64}"
                        style="
                            width:90px;
                            height:auto;
                        "
                    />
                </div>

                <div style="
                    text-align:right;
                    color:#4b3f8f;
                    line-height:1.15;
                    flex:1;
                    margin-top:4px;
                ">

                    <div style="
                        font-size:22px;
                        font-weight:bold;
                    ">
                        भारतीय प्रौद्योगिकी संस्थान भिलाई
                    </div>

                    <div style="
                        font-size:13px;
                        margin-top:2px;
                    ">
                        जिला-दुर्ग, छत्तीसगढ़-491001
                    </div>

                    <div style="
                        font-size:21px;
                        font-weight:bold;
                        margin-top:4px;
                    ">
                        Indian Institute of Technology, Bhilai
                    </div>

                    <div style="
                        font-size:13px;
                        margin-top:2px;
                    ">
                        Dist.- Durg, Chhattisgarh - 491001
                    </div>

                    <div style="
                        font-size:13px;
                        color:#1a4ea1;
                        margin-top:2px;
                    ">
                        Website: www.iitbhilai.ac.in
                    </div>

                </div>

            </div>

        </div>
    `;

    const footerTemplate = `
        <div style="
            width:100%;
            padding:0 25px;
            box-sizing:border-box;
            font-size:10px;
            font-family:'Times New Roman';
        ">

            <div style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                width:100%;
            ">

                <!-- LEFT LOGO -->

                <div style="width:70px;">
                    <img
                        src="data:image/png;base64,${g20Base64}"
                        style="
                            width:65px;
                            height:auto;
                        "
                    />
                </div>

                <!-- CENTER TEXT -->

                <div style="
                    flex:1;
                    text-align:center;
                    line-height:1.4;
                ">

                    Indian Institute of Technology, Bhilai – 491001, Durg district

                    <br>

                    rndoffice@iitbhilai.ac.in

                    <br>

                    Page
                    <span class="pageNumber"></span>
                    of
                    <span class="totalPages"></span>

                </div>

                <!-- RIGHT LOGO -->

                <div style="
                    width:70px;
                    text-align:right;
                ">

                    <img
                        src="data:image/png;base64,${azadiBase64}"
                        style="
                            width:55px;
                            height:auto;
                        "
                    />

                </div>

            </div>

        </div>
    `;

    // Launch Browser

    // for local
    // const browser = await puppeteer.launch({
    //   executablePath: puppeteer.executablePath(),
    //   headless: true,
    // });

    // for Production
    const isProduction = process.env.NODE_ENV === "production";

    const browser = await puppeteer.launch({
      executablePath: isProduction
        ? await chromium.executablePath()
        : puppeteer.executablePath(),
      args: isProduction ? chromium.args : [],
      headless: true,
    });

    const page = await browser.newPage();

    await page.setContent(html);

    // Generate PDF

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: headerTemplate,
      footerTemplate: footerTemplate,
    });
    const pdfUrl = await uploadPdfToCloudinary(
      pdfBuffer,
      "e-procura-generated-pdfs",
      `approval-letter-${Date.now()}.pdf`,
    );

    await browser.close();

    res.status(200).json({
      success: true,
      message: "Approval Letter Generated",
      pdf: pdfUrl.secure_url,
    });
  } catch (error) {
    console.error("Generate approval letter error:", error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const createRecruitmentAdvertisement = async (req, res) => {
  console.log("CREATE ADVERTISEMENT API HIT");
  try {
    if (req.user.role !== "PI") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }
    // =========================
    // SAVE DATA IN DATABASE
    // =========================
    // =========================
    // DIGITAL SIGNATURE VERIFY
    // =========================

    if (!req.body.payload) {
      return res.status(400).json({
        success: false,
        message: "Payload missing",
      });
    }

    if (!req.body.signature) {
      return res.status(400).json({
        success: false,
        message: "Signature missing",
      });
    }

    // Parse payload
    const parsedPayload = JSON.parse(req.body.payload);

    // The saved fields are taken from the payload that is signature-verified
    // below (it carries the same form data the frontend used to send
    // separately as `data`), so what is stored is exactly what was signed.
    const bodyData = parsedPayload;

    // Find PI user
    const user = await User.findOne({
      email: req.user.email,
    });

    if (!user || !user.publicKey) {
      return res.status(404).json({
        success: false,
        message: "Public key not found",
      });
    }

    // Verify signature
    const verify = crypto.createVerify("RSA-SHA256");

    verify.update(req.body.payload);

    verify.end();

    const isValid = verify.verify(
      user.publicKey,
      Buffer.from(req.body.signature, "base64"),
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid private key uploaded. Signature verification failed",
      });
    }
    // All form data is stored once, inside signedPayload (exactly what the
    // PI signed). Only server-side / workflow fields stay outside it.
    const formattedData = {
      requestedBy: req.user.email,
      attachment: req.file?.path,
      signedPayload: parsedPayload,
      signaturePI: req.body.signature,
    };

    // ======================================
    // FIND PROJECT
    // ======================================

    const project = await findProjectByCode(bodyData.projectCode);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // ======================================
    // INSUFFICIENT FUND CHECK
    // Fund is only blocked later, at the R&D fund check
    // ======================================

    const requestedAmount = Number(bodyData.requestedAmount) || 0;
    const currentFund = getAvailableFund(project, bodyData.fundHead);

    if (requestedAmount > currentFund) {
      return res.status(400).json({
        success: false,
        message: "Insufficient available fund",
      });
    }

    // ======================================
    // START WORKFLOW AT DRRD VERIFICATION
    // ======================================

    const recruitment = await Recruitment.create({
      ...formattedData,
      stage: STAGES.DRRD_VERIFICATION,
      fundBlocked: false,
      history: [
        {
          stage: "PI_SUBMISSION",
          action: "SUBMITTED",
          role: "PI",
          userId: user._id,
          by: user.fullName,
          // signature and signed payload are stored once, in
          // recruitment.signaturePI / recruitment.signedPayload
        },
      ],
    });

    // =========================
    // LOAD TEMPLATE
    // =========================

    const templatePath = path.join(
      __dirname,
      "../templates/recruitmentAdvertisement.ejs",
    );

    // =========================
    // LOAD LOGOS
    // =========================

    const logoBase64 = fs.readFileSync(
      path.join(__dirname, "../assets/iit-logo.png"),
      "base64",
    );

    const g20Base64 = fs.readFileSync(
      path.join(__dirname, "../assets/g20-logo.png"),
      "base64",
    );

    const azadiBase64 = fs.readFileSync(
      path.join(__dirname, "../assets/azadi-logo.png"),
      "base64",
    );

    // =========================
    // RENDER HTML
    // =========================

    const html = await ejs.renderFile(templatePath, {
      ...recruitment.toObject(),

      // form data comes from the signed payload
      ...recruitment.signedPayload,
      interviewDate:
        recruitment.signedPayload.interviewDate || "To be announced",
      interviewMode: recruitment.signedPayload.interviewMode || "Offline",

      logoBase64,
      g20Base64,
      azadiBase64,
    });

    const headerTemplate = `
        <div style="
            width:100%;
            padding:0 25px;
            box-sizing:border-box;
            font-family:'Times New Roman';
        ">

            <div style="
                display:flex;
                justify-content:space-between;
                align-items:flex-start;
                width:100%;
            ">

                <div>
                    <img
                        src="data:image/png;base64,${logoBase64}"
                        style="
                            width:90px;
                            height:auto;
                        "
                    />
                </div>

                <div style="
                    text-align:right;
                    color:#4b3f8f;
                    line-height:1.15;
                    flex:1;
                    margin-top:4px;
                ">

                    <div style="
                        font-size:22px;
                        font-weight:bold;
                    ">
                        भारतीय प्रौद्योगिकी संस्थान भिलाई
                    </div>

                    <div style="
                        font-size:13px;
                        margin-top:2px;
                    ">
                        जिला-दुर्ग, छत्तीसगढ़-491001
                    </div>

                    <div style="
                        font-size:21px;
                        font-weight:bold;
                        margin-top:4px;
                    ">
                        Indian Institute of Technology, Bhilai
                    </div>

                    <div style="
                        font-size:13px;
                        margin-top:2px;
                    ">
                        Dist.- Durg, Chhattisgarh - 491001
                    </div>

                    <div style="
                        font-size:13px;
                        color:#1a4ea1;
                        margin-top:2px;
                    ">
                        Website: www.iitbhilai.ac.in
                    </div>

                </div>

            </div>

        </div>
    `;

    const footerTemplate = `
        <div style="
            width:100%;
            padding:0 25px;
            box-sizing:border-box;
            font-size:10px;
            font-family:'Times New Roman';
        ">

            <div style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                width:100%;
            ">

                <!-- LEFT LOGO -->

                <div style="width:70px;">
                    <img
                        src="data:image/png;base64,${g20Base64}"
                        style="
                            width:65px;
                            height:auto;
                        "
                    />
                </div>

                <!-- CENTER TEXT -->

                <div style="
                    flex:1;
                    text-align:center;
                    line-height:1.4;
                ">

                    Indian Institute of Technology, Bhilai – 491001, Durg district

                    <br>

                    rndoffice@iitbhilai.ac.in

                    <br>

                    Page
                    <span class="pageNumber"></span>
                    of
                    <span class="totalPages"></span>

                </div>

                <!-- RIGHT LOGO -->

                <div style="
                    width:70px;
                    text-align:right;
                ">

                    <img
                        src="data:image/png;base64,${azadiBase64}"
                        style="
                            width:55px;
                            height:auto;
                        "
                    />

                </div>

            </div>

        </div>
    `;

    // =========================
    // LAUNCH BROWSER
    // =========================

    // for local
    const browser = await puppeteer.launch({
      executablePath: puppeteer.executablePath(),
      headless: true,
    });

    // for production
    // const isProduction = process.env.NODE_ENV === "production";

    // const browser = await puppeteer.launch({
    //   executablePath: isProduction
    //     ? await chromium.executablePath()
    //     : puppeteer.executablePath(),
    //   args: isProduction ? chromium.args : [],
    //   headless: true,
    // });
    const page = await browser.newPage();

    await page.setContent(html);
    console.log("EJS rendered successfully");

    // =========================
    // GENERATE PDF
    // =========================
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: headerTemplate,
      footerTemplate: footerTemplate,
    });

    await browser.close();
    const uploadResult = await uploadPdfToCloudinary(
      pdfBuffer,
      "e-procura-generated-pdfs",
      `recruitment-${Date.now()}.pdf`,
    );
    // =========================
    // SAVE PDF PATH
    // =========================
    console.log("PDF generated successfully");
    recruitment.recruitmentAdPath = uploadResult.secure_url;

    await recruitment.save();
    console.log("Cloudinary upload successful");
    // =========================
    // RESPONSE
    // =========================

    res.status(201).json({
      success: true,
      message: "Recruitment Advertisement Generated",
      pdf: uploadResult,
      recruitment,
    });
  } catch (error) {
    console.error("Recruitment advertisement error:", error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const getAllRecruitments = async (req, res) => {
  try {
    // ======================================
    // FETCH ALL RECRUITMENTS
    // ======================================

    const recruitments = await Recruitment.find().sort({
      createdAt: -1,
    });

    // ======================================
    // ENRICH WITH LIVE FUND DATA
    // ======================================

    const updatedRecruitments = await Promise.all(
      recruitments.map(async (recruitment) => {
        const form = getSignedPayload(recruitment);

        // Find actual project

        const project = await findProjectByCode(form.projectCode);

        // Live fund balance of the head

        const liveFundAmount = getAvailableFund(project, form.fundHead);

        return {
          ...recruitment.toObject(),

          stage: getStage(recruitment),

          // current balance of the fund head (computed, not stored).
          // signedPayload.fundHeadAmount is only the value at submission.

          liveFundAmount,

          // once blocked, the live balance already excludes the request

          remainingFund: recruitment.fundBlocked
            ? liveFundAmount
            : liveFundAmount - (form.requestedAmount || 0),
        };
      }),
    );

    // ======================================
    // RESPONSE
    // ======================================

    res.status(200).json({
      success: true,
      recruitments: updatedRecruitments,
    });
  } catch (error) {
    console.error("Get recruitments error:", error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const approveRecruitment = async (req, res) => {
  try {
    if (req.user.role !== "DORD") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }
    const { id } = req.params;

    // Same body shape as reject: the signed payload and the Dean's signature
    const { payload, signatureDean } = req.body;

    // ======================================
    // FIND RECRUITMENT
    // ======================================

    const recruitment = await Recruitment.findById(id);

    if (!recruitment) {
      return res.status(404).json({
        success: false,
        message: "Recruitment not found",
      });
    }

    // ======================================
    // ONLY WHEN FORWARDED BY DRRD
    // ======================================

    if (getStage(recruitment) !== STAGES.DORD_APPROVAL) {
      return res.status(400).json({
        success: false,
        message: "Recruitment is not awaiting Dean approval",
      });
    }

    // ======================================
    // VERIFY PREVIOUS SIGNATURES
    // ======================================

    const chainError = await checkPreviousSignatures(recruitment, "APPROVED");

    if (chainError) {
      return res.status(400).json({
        success: false,
        message: chainError,
      });
    }

    // ======================================
    // VERIFY SIGNATURE
    // Against the logged-in Dean's own public key
    // ======================================

    const check = await verifyActionSignature({
      userId: req.user.id,
      payload,
      signature: signatureDean,
      recruitmentId: id,
      action: "APPROVED",
      formHash: computeFormHash(recruitment),
    });

    if (!check.ok) {
      return res.status(check.status).json({
        success: false,
        message: check.message,
      });
    }

    const deanUser = check.user;

    // ======================================
    // UPDATE STATUS
    // Final status is set when DRRD sends the file to the PI
    // ======================================

    recruitment.stage = STAGES.DRRD_DISPATCH;

    recruitment.history.push({
      stage: STAGES.DORD_APPROVAL,
      action: "APPROVED",
      role: "DORD",
      userId: deanUser._id,
      by: deanUser.fullName,
      signature: signatureDean,
      payload,
    });

    await recruitment.save();

    // ======================================
    // RESPONSE
    // ======================================

    res.status(200).json({
      success: true,
      message: "Recruitment Approved",
      recruitment,
    });
  } catch (error) {
    console.error("Approve recruitment error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

const rejectRecruitment = async (req, res) => {
  try {
    if (req.user.role !== "DORD") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { id } = req.params;

    const { payload, signatureDean } = req.body;

    // FIND RECRUITMENT

    const recruitment = await Recruitment.findById(id);

    if (!recruitment) {
      return res.status(404).json({
        success: false,
        message: "Recruitment not found",
      });
    }

    // ======================================
    // ONLY WHEN FORWARDED BY DRRD
    // ======================================

    if (getStage(recruitment) !== STAGES.DORD_APPROVAL) {
      return res.status(400).json({
        success: false,
        message: "Recruitment is not awaiting Dean approval",
      });
    }

    // ======================================
    // VERIFY PREVIOUS SIGNATURES
    // ======================================

    const chainError = await checkPreviousSignatures(recruitment, "REJECTED");

    if (chainError) {
      return res.status(400).json({
        success: false,
        message: chainError,
      });
    }

    // ======================================
    // VERIFY SIGNATURE
    // Against the logged-in Dean's own public key
    // ======================================

    const check = await verifyActionSignature({
      userId: req.user.id,
      payload,
      signature: signatureDean,
      recruitmentId: id,
      action: "REJECTED",
      formHash: computeFormHash(recruitment),
    });

    if (!check.ok) {
      return res.status(check.status).json({
        success: false,
        message: check.message,
      });
    }

    const deanUser = check.user;

    // ======================================
    // REFUND BLOCKED FUND
    // ======================================

    if (recruitment.fundBlocked) {
      const form = getSignedPayload(recruitment);

      await releaseFund(
        form.projectCode,
        form.fundHead,
        Number(form.requestedAmount) || 0,
      );

      recruitment.fundBlocked = false;
    }

    // ======================================
    // UPDATE STATUS
    // Final status is set when DRRD sends the file to the PI
    // ======================================

    recruitment.stage = STAGES.DRRD_DISPATCH;

    recruitment.history.push({
      stage: STAGES.DORD_APPROVAL,
      action: "REJECTED",
      role: "DORD",
      userId: deanUser._id,
      by: deanUser.fullName,
      remarks: payload.reason,
      signature: signatureDean,
      payload,
    });

    await recruitment.save();

    // ======================================
    // RESPONSE
    // ======================================

    res.status(200).json({
      success: true,
      message: "Recruitment Rejected & Fund Released",
      recruitment,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};
// ======================================
// DRRD ACTIONS
// DRRD_VERIFICATION : FORWARD (to R&D)   | REJECT (back to PI)
// DRRD_REVIEW       : FORWARD (to DORD)  | REJECT (back to PI)
// DRRD_DISPATCH     : SEND_TO_PI (final file to PI)
// ======================================

const DRRD_TRANSITIONS = {
  [STAGES.DRRD_VERIFICATION]: {
    FORWARD: STAGES.RND_FUND_CHECK,
    REJECT: STAGES.SENT_TO_PI,
  },
  [STAGES.DRRD_REVIEW]: {
    FORWARD: STAGES.DORD_APPROVAL,
    REJECT: STAGES.SENT_TO_PI,
  },
  [STAGES.DRRD_DISPATCH]: {
    SEND_TO_PI: STAGES.SENT_TO_PI,
  },
};

const drrdAction = async (req, res) => {
  try {
    if (req.user.role !== "DRRD") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { id } = req.params;

    const { action, remarks = "", payload, signature } = req.body;

    const recruitment = await Recruitment.findById(id);

    if (!recruitment) {
      return res.status(404).json({
        success: false,
        message: "Recruitment not found",
      });
    }

    // ======================================
    // VALIDATE TRANSITION
    // ======================================

    const stage = getStage(recruitment);

    const nextStage = DRRD_TRANSITIONS[stage]?.[action];

    if (!nextStage) {
      return res.status(400).json({
        success: false,
        message: `Action ${action} is not allowed at stage ${stage}`,
      });
    }

    if (action === "REJECT" && !remarks.trim()) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    if (
      stage === STAGES.DRRD_REVIEW &&
      action === "FORWARD" &&
      !(recruitment.fundCheck?.available && recruitment.fundBlocked)
    ) {
      return res.status(400).json({
        success: false,
        message: "R&D has not confirmed fund availability",
      });
    }

    // ======================================
    // VERIFY PREVIOUS SIGNATURES
    // ======================================

    const chainError = await checkPreviousSignatures(recruitment, action);

    if (chainError) {
      return res.status(400).json({
        success: false,
        message: chainError,
      });
    }

    // ======================================
    // VERIFY SIGNATURE
    // ======================================

    const check = await verifyActionSignature({
      userId: req.user.id,
      payload,
      signature,
      recruitmentId: id,
      action,
      formHash: computeFormHash(recruitment),
    });

    if (!check.ok) {
      return res.status(check.status).json({
        success: false,
        message: check.message,
      });
    }

    // ======================================
    // APPLY ACTION
    // ======================================

    if (action === "REJECT") {
      if (recruitment.fundBlocked) {
        const form = getSignedPayload(recruitment);

        await releaseFund(
          form.projectCode,
          form.fundHead,
          Number(form.requestedAmount) || 0,
        );

        recruitment.fundBlocked = false;
      }

      recruitment.status = "Rejected";
    }

    let finalStage = nextStage;

    if (action === "SEND_TO_PI") {
      const approved = getDeanDecision(recruitment)?.action === "APPROVED";

      recruitment.status = approved ? "Approved" : "Rejected";

      // approved requests go on to the Media Cell for web upload
      finalStage = approved ? STAGES.MEDIA_PUBLISH : STAGES.SENT_TO_PI;
    }

    recruitment.stage = finalStage;

    recruitment.history.push({
      stage,
      action,
      role: "DRRD",
      userId: check.user._id,
      by: check.user.fullName,
      remarks,
      signature,
      payload,
    });

    await recruitment.save();

    res.status(200).json({
      success: true,
      message: "Action recorded",
      recruitment,
    });
  } catch (error) {
    console.error("DRRD action error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

// ======================================
// R&D FUND CHECK
// FUND_AVAILABLE     : blocks the requested amount, back to DRRD
// FUND_NOT_AVAILABLE : back to DRRD with remarks
// ======================================

const rndFundCheck = async (req, res) => {
  try {
    if (req.user.role !== "RND") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { id } = req.params;

    const { action, remarks = "", payload, signature } = req.body;

    if (!["FUND_AVAILABLE", "FUND_NOT_AVAILABLE"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action",
      });
    }

    if (action === "FUND_NOT_AVAILABLE" && !remarks.trim()) {
      return res.status(400).json({
        success: false,
        message: "Remarks are required",
      });
    }

    const recruitment = await Recruitment.findById(id);

    if (!recruitment) {
      return res.status(404).json({
        success: false,
        message: "Recruitment not found",
      });
    }

    if (getStage(recruitment) !== STAGES.RND_FUND_CHECK) {
      return res.status(400).json({
        success: false,
        message: "Recruitment is not awaiting R&D fund check",
      });
    }

    // ======================================
    // VERIFY PREVIOUS SIGNATURES (PI, DRRD)
    // ======================================

    const chainError = await checkPreviousSignatures(recruitment, action);

    if (chainError) {
      return res.status(400).json({
        success: false,
        message: chainError,
      });
    }

    // ======================================
    // VERIFY SIGNATURE
    // ======================================

    const check = await verifyActionSignature({
      userId: req.user.id,
      payload,
      signature,
      recruitmentId: id,
      action,
      formHash: computeFormHash(recruitment),
    });

    if (!check.ok) {
      return res.status(check.status).json({
        success: false,
        message: check.message,
      });
    }

    // ======================================
    // CHECK AND BLOCK FUND
    // ======================================

    const form = getSignedPayload(recruitment);

    const project = await findProjectByCode(form.projectCode);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const requestedAmount = Number(form.requestedAmount) || 0;

    const availableAmount = getAvailableFund(project, form.fundHead);

    if (action === "FUND_AVAILABLE") {
      const blocked = await blockFund(project, form.fundHead, requestedAmount);

      if (!blocked) {
        return res.status(400).json({
          success: false,
          message: `Insufficient fund. Available: ₹${availableAmount}`,
        });
      }

      recruitment.fundBlocked = true;
    }

    recruitment.fundCheck = {
      available: action === "FUND_AVAILABLE",
      availableAmount,
      remarks,
      checkedBy: check.user.fullName,
      timestamp: new Date(),
    };

    recruitment.stage = STAGES.DRRD_REVIEW;

    recruitment.history.push({
      stage: STAGES.RND_FUND_CHECK,
      action,
      role: "RND",
      userId: check.user._id,
      by: check.user.fullName,
      remarks,
      signature,
      payload,
    });

    await recruitment.save();

    res.status(200).json({
      success: true,
      message: "Fund check recorded",
      recruitment,
    });
  } catch (error) {
    console.error("R&D fund check error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

// get fund request status
const getMyRequests = async (req, res) => {
  try {
    const requests = await Recruitment.find({
      requestedBy: req.user.email,
    }).sort({ createdAt: -1 });

    res.status(200).json(
      requests.map((request) => {
        const stage = getStage(request);
        const data = { ...request.toObject(), stage };

        if (!isDispatched(stage)) {
          delete data.signedApprovalPdf;
          delete data.deanDecision;
          data.history = (data.history || []).filter(
            (entry) => entry.role !== "DORD",
          );
        }

        // tells the PI where publishing stands
        data.publishStatus =
          stage === STAGES.MEDIA_PUBLISH
            ? "SENT_FOR_PUBLISH"
            : stage === STAGES.PUBLISHED
              ? "PUBLISHED"
              : null;

        return data;
      }),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error",
    });
  }
};

// ======================================
// VERIFY PI DIGITAL SIGNATURE FOR A RECRUITMENT REQUEST
// Verifies the stored signedPayload against the PI's public key
// ======================================
const verifyRecruitmentPISignature = async (req, res) => {
  try {
    const recruitment = await Recruitment.findById(req.params.id);

    if (!recruitment) {
      return res.status(404).json({
        success: false,
        message: "Recruitment not found",
      });
    }

    if (
      req.user.role === "MEDIA_CELL" &&
      ![STAGES.MEDIA_PUBLISH, STAGES.PUBLISHED].includes(getStage(recruitment))
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // A PI can only verify their own request
    if (req.user.role === "PI" && recruitment.requestedBy !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Records created before signedPayload existed keep the signed
    // object in the first history entry
    const signedPayload =
      recruitment.signedPayload ||
      recruitment.history?.find((h) => h.stage === "PI_SUBMISSION")?.payload;

    if (!signedPayload || !recruitment.signaturePI) {
      return res.status(404).json({
        success: false,
        message: "No signed payload found for this request",
      });
    }

    const pi = await User.findOne({
      email: recruitment.requestedBy,
      role: "PI",
    });

    if (!pi?.publicKey) {
      return res.status(404).json({
        success: false,
        message: "PI public key not found",
      });
    }

    const verify = crypto.createVerify("RSA-SHA256");

    verify.update(JSON.stringify(signedPayload));

    verify.end();

    const verified = verify.verify(
      pi.publicKey,
      Buffer.from(recruitment.signaturePI, "base64"),
    );

    res.json({ success: true, verified, signedBy: pi.fullName });
  } catch (error) {
    console.error("Verify recruitment PI signature error:", error);

    res.status(500).json({
      success: false,
      message: "Verification failed",
    });
  }
};

// ======================================
// VERIFY EVERY SIGNED STEP OF A RECRUITMENT REQUEST
// Re-checks each history entry against its signer's public key
// ======================================
const verifyRecruitmentHistory = async (req, res) => {
  try {
    const recruitment = await Recruitment.findById(req.params.id);

    if (!recruitment) {
      return res.status(404).json({
        success: false,
        message: "Recruitment not found",
      });
    }

    const stage = getStage(recruitment);

    let entries = recruitment.history || [];

    // Media Cell can only verify requests that have reached it
    if (
      req.user.role === "MEDIA_CELL" &&
      ![STAGES.MEDIA_PUBLISH, STAGES.PUBLISHED].includes(stage)
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (req.user.role === "PI") {
      // A PI can only verify their own request
      if (recruitment.requestedBy !== req.user.email) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Dean's decision stays hidden until DRRD sends the file
      if (!isDispatched(stage)) {
        entries = entries.filter((entry) => entry.role !== "DORD");
      }
    }

    res.json({
      success: true,
      results: await verifyHistory(recruitment, entries),
    });
  } catch (error) {
    console.error("Verify recruitment history error:", error);

    res.status(500).json({
      success: false,
      message: "Verification failed",
    });
  }
};

// ======================================
// MEDIA CELL
// Dashboard: approved requests waiting for / already on the web
// Action PUBLISHED: signed confirmation that the web upload is done
// ======================================

const getMediaCellRequests = async (req, res) => {
  try {
    if (req.user.role !== "MEDIA_CELL") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const recruitments = await Recruitment.find({
      stage: { $in: [STAGES.MEDIA_PUBLISH, STAGES.PUBLISHED] },
    }).sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      recruitments: recruitments.map((r) => {
        const data = { ...r.toObject(), stage: getStage(r) };
        data.formHash = computeFormHash(r)

        // Media Cell has no use for fund details (response only; the
        // stored signedPayload is untouched, so verification is unaffected)
        delete data.fundCheck;
        delete data.fundBlocked;

        if (data.signedPayload) {
          const { requestedAmount, fundHeadAmount, fundHead, ...rest } =
            data.signedPayload;
          data.signedPayload = rest;
        }

        return data;
      }),
    });
  } catch (error) {
    console.error("Media cell requests error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
const mediaCellAction = async (req, res) => {
  try {
    if (req.user.role !== "MEDIA_CELL") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { id } = req.params;

    const { action, remarks = "", payload, signature } = req.body;

    if (action !== "PUBLISHED") {
      return res.status(400).json({
        success: false,
        message: "Invalid action",
      });
    }

    const recruitment = await Recruitment.findById(id);

    if (!recruitment) {
      return res.status(404).json({
        success: false,
        message: "Recruitment not found",
      });
    }

    if (getStage(recruitment) !== STAGES.MEDIA_PUBLISH) {
      return res.status(400).json({
        success: false,
        message: "Recruitment is not awaiting publication",
      });
    }

    // ======================================
    // VERIFY PREVIOUS SIGNATURES (PI, DRRD, R&D, Dean, DRRD)
    // ======================================

    const chainError = await checkPreviousSignatures(recruitment, action);

    if (chainError) {
      return res.status(400).json({
        success: false,
        message: chainError,
      });
    }

    // ======================================
    // VERIFY SIGNATURE
    // ======================================

    const check = await verifyActionSignature({
      userId: req.user.id,
      payload,
      signature,
      recruitmentId: id,
      action,
      formHash: computeFormHash(recruitment),
    });

    if (!check.ok) {
      return res.status(check.status).json({
        success: false,
        message: check.message,
      });
    }

    recruitment.stage = STAGES.PUBLISHED;

    recruitment.history.push({
      stage: STAGES.MEDIA_PUBLISH,
      action,
      role: "MEDIA_CELL",
      userId: check.user._id,
      by: check.user.fullName,
      remarks,
      signature,
      payload,
    });

    await recruitment.save();

    res.status(200).json({
      success: true,
      message: "Marked as published",
      recruitment,
    });
  } catch (error) {
    console.error("Media cell action error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

export {
  verifyRecruitmentHistory,
  verifyRecruitmentPISignature,
  generateApprovalLetter,
  createRecruitmentAdvertisement,
  getAllRecruitments,
  approveRecruitment,
  rejectRecruitment,
  drrdAction,
  rndFundCheck,
  getMyRequests,
  getMediaCellRequests,
  mediaCellAction,
};
