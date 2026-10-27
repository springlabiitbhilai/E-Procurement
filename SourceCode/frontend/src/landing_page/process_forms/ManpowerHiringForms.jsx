import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  readPem,
  importPrivateKey,
  signData,
  canonicalPayload,
} from "../../utils/digitalSignature";
import { axiosInstance } from "../../config/api";

const emptyPosition = () => ({
  positionName: "intern",
  numberOfPosts: "1",
  ageLimit: "25",
  salaryStart: "10",
  salaryEnd: "20",
  duration: "6 months",
  essentialQualifications: ["ththj"],
  desirableQualifications: ["vghjy"],
});

const AGENCIES = [
  "MeitY",
  "IBITF",
  "C3iHub (IIT Kanpur)",
  "DST",
  "SERB",
  "CSIR",
  "DRDO",
  "Education Ministry",
  "ICMR",
  "MoE",
];

const POSITION_SUGGESTIONS = [
  "Junior Research Fellow (JRF)",
  "Senior Research Fellow (SRF)",
  "Project Associate",
  "Project Assistant",
  "Project Manager",
  "Project Engineer",
  "Intern",
];

const DURATION_SUGGESTIONS = [
  "89 Days (Extendable)",
  "6 Months",
  "12 Months",
  "18 Months",
  "24 Months",
];

// "89 Days (Extendable)" -> 2.97, "12 Months" -> 12, "2 Years" -> 24
const getDurationInMonths = (durationValue) => {
  if (!durationValue) return 0;

  const text = String(durationValue).toLowerCase();
  const value = parseInt(text, 10) || 0;

  if (text.includes("day")) return value / 30;
  if (text.includes("month")) return value;
  if (text.includes("year")) return value * 12;

  return 0;
};

const fmt = (n) =>
  Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });

const inputClass =
  "w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500";
const readOnlyClass = inputClass + " bg-gray-100 cursor-not-allowed";
const chipClass =
  "px-3 py-1 text-sm bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-full transition";

const Label = ({ children }) => (
  <p className="text-sm font-medium mb-1 text-gray-700">{children}</p>
);

export default function ManpowerHiringForms({
  projectData,
  process,
  selectedHead,
  selectedHeadAmount,
  refreshProject,
}) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const subjectEdited = useRef(false);

  const [formData, setFormData] = useState({
    projectTitle: "",
    projectCode: "",
    sponsoringAgency: "DST",
    piName: "",
    piDesignation: "professor",
    piDepartment: "",
    officeAddress: "bhilai",
    piEmail: "ghgfh",
    piWebsite: "ghj",

    positions: [emptyPosition()],

    process: "",
    fundHead: "",
    fundHeadAmount: "",

    submissionEmail: "",
    emailSubject: "",
    submissionDeadline: "",
    interviewDate: "",
    interviewMode: "",
    venue: "bhilai",
    reportingTime: "",
    committeeMembers: ["tyty"],
    attachment: null,
    privateKeyFile: null,
  });

  // ---------- Derived values ----------
  const headAmount = Number(selectedHeadAmount) || 0;

  const requestedAmount = useMemo(() => {
    let total = 0;

    formData.positions.forEach((p) => {
      const posts = Math.abs(Number(p.numberOfPosts) || 0);
      const salary = Math.abs(Number(p.salaryEnd) || 0);
      const months = Math.abs(getDurationInMonths(p.duration));
      total += posts * salary * months;
    });

    return Math.round(total);
  }, [formData.positions]);

  const remainingBalance = headAmount - requestedAmount;
  const isBudgetExceeded = requestedAmount > headAmount;

  // ---------- Prefill from the approved project ----------
  useEffect(() => {
    if (!projectData) return;

    const sp = projectData.piSubmission?.signedPayload || {};
    const storedUser = (() => {
      try {
        return JSON.parse(localStorage.getItem("user"));
      } catch {
        return null;
      }
    })();

    const email = projectData.piSubmission?.submittedBy || "";

    setFormData((prev) => ({
      ...prev,
      projectTitle: sp.title || "",
      projectCode: projectData.rndDecision?.signedPayload?.projectCode || "",
      piName: sp.piName || storedUser?.fullName || "",
      piDepartment: sp.department || "",
      piEmail: email,
      submissionEmail: prev.submissionEmail || email,
      process,
      fundHead: selectedHead,
      fundHeadAmount: headAmount,
    }));
  }, [projectData, process, selectedHead, headAmount]);

  // ---------- Auto email subject (stops once the PI edits it) ----------
  useEffect(() => {
    if (subjectEdited.current) return;

    const agency = formData.sponsoringAgency?.replace(/\s+/g, "");
    const position = formData.positions[0]?.positionName?.replace(/\s+/g, "");

    if (agency && position) {
      setFormData((prev) => ({
        ...prev,
        emailSubject: `${agency}-${position}`,
      }));
    }
  }, [formData.sponsoringAgency, formData.positions]);

  // ---------- Handlers ----------
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "emailSubject") subjectEdited.current = true;

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const updatePosition = (index, patch) => {
    setFormData((prev) => ({
      ...prev,
      positions: prev.positions.map((p, i) =>
        i === index ? { ...p, ...patch } : p,
      ),
    }));
  };

  const handlePositionChange = (index, e) => {
    updatePosition(index, { [e.target.name]: e.target.value });
  };

  const handleArrayChange = (positionIndex, field, valueIndex, value) => {
    setFormData((prev) => ({
      ...prev,
      positions: prev.positions.map((p, i) =>
        i === positionIndex
          ? {
              ...p,
              [field]: p[field].map((v, j) => (j === valueIndex ? value : v)),
            }
          : p,
      ),
    }));
  };

  const addArrayField = (positionIndex, field) => {
    setFormData((prev) => ({
      ...prev,
      positions: prev.positions.map((p, i) =>
        i === positionIndex ? { ...p, [field]: [...p[field], ""] } : p,
      ),
    }));
  };

  const removeArrayField = (positionIndex, field, valueIndex) => {
    setFormData((prev) => ({
      ...prev,
      positions: prev.positions.map((p, i) =>
        i === positionIndex && p[field].length > 1
          ? { ...p, [field]: p[field].filter((_, j) => j !== valueIndex) }
          : p,
      ),
    }));
  };

  const addPosition = () => {
    setFormData((prev) => ({
      ...prev,
      positions: [...prev.positions, emptyPosition()],
    }));
  };

  const removePosition = (index) => {
    setFormData((prev) =>
      prev.positions.length > 1
        ? { ...prev, positions: prev.positions.filter((_, i) => i !== index) }
        : prev,
    );
  };

  const handleCommitteeChange = (index, value) => {
    setFormData((prev) => ({
      ...prev,
      committeeMembers: prev.committeeMembers.map((m, i) =>
        i === index ? value : m,
      ),
    }));
  };

  const addCommitteeMember = () => {
    setFormData((prev) => ({
      ...prev,
      committeeMembers: [...prev.committeeMembers, ""],
    }));
  };

  const removeCommitteeMember = (index) => {
    setFormData((prev) =>
      prev.committeeMembers.length > 1
        ? {
            ...prev,
            committeeMembers: prev.committeeMembers.filter(
              (_, i) => i !== index,
            ),
          }
        : prev,
    );
  };

  const handleKeyFileChange = (e) => {
    setFormData((prev) => ({ ...prev, privateKeyFile: e.target.files[0] }));
  };

  const handleAttachmentChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Only PDF files are allowed");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size should be less than 5MB");
      e.target.value = "";
      return;
    }

    setFormData((prev) => ({ ...prev, attachment: file }));
  };

  // ---------- Validation ----------
  const validate = () => {
    if (projectData?.piSubmission?.status !== "APPROVED") {
      return "This project is not approved by R&D yet";
    }

    if (!formData.projectCode) {
      return "Project code is missing. Please contact R&D";
    }

    for (const [i, p] of formData.positions.entries()) {
      if (
        p.salaryStart &&
        p.salaryEnd &&
        Number(p.salaryStart) > Number(p.salaryEnd)
      ) {
        return `Position ${i + 1}: minimum salary cannot be greater than maximum salary`;
      }

      if (getDurationInMonths(p.duration) <= 0) {
        return `Position ${i + 1}: duration must include days, months or years (e.g. "12 Months")`;
      }
    }

    if (formData.interviewDate && formData.submissionDeadline) {
      const interview = new Date(formData.interviewDate);
      const submission = new Date(formData.submissionDeadline);
      submission.setHours(0, 0, 0, 0);

      if (interview < submission) {
        return "Interview date cannot be before submission deadline";
      }
    }

    if (!formData.attachment) return "Please upload application form PDF";

    const validCommittee = formData.committeeMembers.filter(
      (m) => m.trim() !== "",
    );
    if (validCommittee.length === 0) {
      return "At least one committee member is required";
    }

    if (isBudgetExceeded) {
      return "Requested manpower cost exceeds available budget";
    }

    if (!formData.privateKeyFile) return "Please upload private key";

    return null;
  };

  // ---------- Submit ----------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return;

    const error = validate();
    if (error) {
      alert(error);
      return;
    }

    setSubmitting(true);

    try {
      // Data that gets signed (no file objects)
      const { attachment, privateKeyFile, ...rest } = formData;

      const signedData = {
        ...rest,
        committeeMembers: rest.committeeMembers.filter((m) => m.trim() !== ""),
        projectId: projectData._id,
        requestedAmount,
      };

      // =========================
      // CREATE DIGITAL SIGNATURE
      // =========================
      const payload = canonicalPayload(signedData);

      const pem = await readPem(privateKeyFile);
      const privateKey = await importPrivateKey(pem);
      const signature = await signData(privateKey, payload);

      // =========================
      // CREATE FORMDATA
      // =========================
      const sendData = new FormData();

      sendData.append("data", JSON.stringify(signedData));
      sendData.append("payload", JSON.stringify(payload));
      sendData.append("signature", signature);
      sendData.append("attachment", attachment);

      // =========================
      // RECRUITMENT ADVERTISEMENT
      // =========================
      const res = await axiosInstance.post(
        `/api/recruitment/create-advertisement`,
        sendData,
      );

      const data = res.data;

      // =========================
      // APPROVAL LETTER
      // =========================
      let approvalData = null;

      try {
        const approvalRes = await axiosInstance.post(
          `/api/recruitment/generate-approval-letter`,
          {
            projects: [
              {
                projectTitle: formData.projectTitle,
                projectCode: formData.projectCode,
              },
            ],
            piName: formData.piName,
            committeeMembers: signedData.committeeMembers,
          },
        );

        approvalData = approvalRes.data;

        await axiosInstance.put(
          `/api/recruitment/${data.recruitment._id}/approval-letter`,
          { approvalLetterPath: approvalData.pdf },
        );
      } catch (letterErr) {
        // The advertisement already exists, so don't let the PI submit twice
        alert(
          "Advertisement was created, but the approval letter failed: " +
            (letterErr.response?.data?.message || "Server Error") +
            "\nPlease check 'My Recruitment Requests' before submitting again.",
        );
        await refreshProject?.();
        navigate("/my-recruitment-requests");
        return;
      }

      alert("✅ PDFs generated & request sent to DRRD for verification");

      // Open generated PDFs
      if (data.pdf?.secure_url) window.open(data.pdf.secure_url, "_blank");
      if (approvalData?.pdf) window.open(approvalData.pdf, "_blank");

      await refreshProject?.();
      navigate("/my-recruitment-requests");
    } catch (err) {
      console.error(err);
      alert(
        err.response?.data?.message ||
          err.response?.data?.msg ||
          err.message ||
          "Server Error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-[#d6e3da] p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto bg-white shadow-xl rounded-2xl p-4 sm:p-6 md:p-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-center">
          Project Staff Recruitment Form
        </h1>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* ========================= */}
          {/* PROJECT DETAILS */}
          {/* ========================= */}
          <div>
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">
              Project Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Date of Request</Label>
                <input
                  type="date"
                  value={today}
                  readOnly
                  className={readOnlyClass}
                />
              </div>

              <div>
                <Label>Project Title</Label>
                <input
                  type="text"
                  value={formData.projectTitle}
                  readOnly
                  className={readOnlyClass}
                />
              </div>

              <div>
                <Label>Project Code</Label>
                <input
                  type="text"
                  value={formData.projectCode}
                  readOnly
                  className={readOnlyClass}
                />
              </div>

              <div>
                <Label>Fund Head</Label>
                <input
                  type="text"
                  value={formData.fundHead}
                  readOnly
                  className={readOnlyClass}
                />
              </div>

              <div className="md:col-span-2">
                <Label>Sponsoring Agency</Label>
                <input
                  type="text"
                  name="sponsoringAgency"
                  value={formData.sponsoringAgency}
                  required
                  onChange={handleChange}
                  placeholder="Enter Sponsoring Agency"
                  className={inputClass}
                />
                <p className="text-xs text-gray-500 mt-2">Suggested Agencies</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {AGENCIES.map((agency) => (
                    <button
                      key={agency}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          sponsoringAgency: agency,
                        }))
                      }
                      className={chipClass}
                    >
                      {agency}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ========================= */}
          {/* PI DETAILS */}
          {/* ========================= */}
          <div>
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">
              PI Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>PI Name</Label>
                <input
                  type="text"
                  name="piName"
                  value={formData.piName}
                  readOnly
                  className={readOnlyClass}
                />
              </div>

              <div>
                <Label>PI Designation</Label>
                <input
                  type="text"
                  name="piDesignation"
                  required
                  placeholder="e.g. Associate Professor"
                  value={formData.piDesignation}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div>
                <Label>Office Address</Label>
                <input
                  type="text"
                  name="officeAddress"
                  required
                  placeholder="Enter office Address"
                  value={formData.officeAddress}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div>
                <Label>PI Department</Label>
                <input
                  type="text"
                  name="piDepartment"
                  value={formData.piDepartment}
                  readOnly
                  className={readOnlyClass}
                />
              </div>

              <div>
                <Label>PI Email</Label>
                <input
                  type="email"
                  name="piEmail"
                  value={formData.piEmail}
                  readOnly
                  className={readOnlyClass}
                />
              </div>

              <div>
                <Label>PI Website</Label>
                <input
                  type="text"
                  name="piWebsite"
                  required
                  placeholder="Enter PI Website url"
                  value={formData.piWebsite}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* ========================= */}
          {/* POSITIONS */}
          {/* ========================= */}
          <div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 border-b pb-2">
              <h2 className="text-lg sm:text-xl font-semibold">Positions</h2>

              <button
                type="button"
                onClick={addPosition}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg w-full sm:w-auto"
              >
                + Add Position
              </button>
            </div>

            {formData.positions.map((position, positionIndex) => (
              <div
                key={positionIndex}
                className="border rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 bg-gray-50"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-700">
                    Position {positionIndex + 1}
                  </h3>

                  {formData.positions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePosition(positionIndex)}
                      className="text-red-600 text-sm hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Position Name</Label>
                    <input
                      type="text"
                      name="positionName"
                      required
                      placeholder="Enter Position Name"
                      value={position.positionName}
                      onChange={(e) => handlePositionChange(positionIndex, e)}
                      className={inputClass}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Suggested Positions
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {POSITION_SUGGESTIONS.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() =>
                            updatePosition(positionIndex, {
                              positionName: item,
                            })
                          }
                          className={chipClass}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Number of Posts</Label>
                    <input
                      type="number"
                      min="1"
                      name="numberOfPosts"
                      required
                      placeholder="Enter Number of Posts"
                      value={position.numberOfPosts}
                      onChange={(e) => handlePositionChange(positionIndex, e)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <Label>Age Limit</Label>
                    <input
                      type="text"
                      name="ageLimit"
                      required
                      placeholder="Enter Age Limit"
                      value={position.ageLimit}
                      onChange={(e) => handlePositionChange(positionIndex, e)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <Label>Salary Range (per month)</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="number"
                        min="0"
                        required
                        name="salaryStart"
                        placeholder="Start Range"
                        value={position.salaryStart || ""}
                        onChange={(e) => handlePositionChange(positionIndex, e)}
                        className={inputClass}
                      />

                      <input
                        type="number"
                        min="0"
                        name="salaryEnd"
                        required
                        placeholder="End Range"
                        value={position.salaryEnd || ""}
                        onChange={(e) => handlePositionChange(positionIndex, e)}
                        className={inputClass}
                      />
                    </div>
                    {position.salaryStart &&
                      position.salaryEnd &&
                      Number(position.salaryStart) >
                        Number(position.salaryEnd) && (
                        <p className="text-red-600 text-sm mt-2">
                          Minimum salary cannot be greater than maximum salary
                        </p>
                      )}
                  </div>

                  <div>
                    <Label>Duration</Label>
                    <input
                      type="text"
                      name="duration"
                      placeholder='e.g. "12 Months"'
                      required
                      value={position.duration}
                      onChange={(e) => handlePositionChange(positionIndex, e)}
                      className={inputClass}
                    />
                    {position.duration &&
                      getDurationInMonths(position.duration) <= 0 && (
                        <p className="text-red-600 text-sm mt-2">
                          Include days, months or years in the duration
                        </p>
                      )}
                    <p className="text-xs text-gray-500 mt-2">
                      Suggested Durations
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {DURATION_SUGGESTIONS.map((duration) => (
                        <button
                          key={duration}
                          type="button"
                          onClick={() =>
                            updatePosition(positionIndex, { duration })
                          }
                          className={chipClass}
                        >
                          {duration}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ESSENTIAL + DESIRABLE QUALIFICATIONS */}
                {[
                  {
                    field: "essentialQualifications",
                    title: "Essential Qualifications",
                    placeholder: "Essential Qualification",
                    addLabel: "+ Add Essential Qualification",
                  },
                  {
                    field: "desirableQualifications",
                    title: "Desirable Qualifications",
                    placeholder: "Desirable Qualification",
                    addLabel: "+ Add Desirable Qualification",
                  },
                ].map(({ field, title, placeholder, addLabel }) => (
                  <div key={field} className="mt-6">
                    <h3 className="font-semibold mb-2">{title}</h3>

                    {position[field].map((item, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={item}
                          required
                          placeholder={placeholder}
                          onChange={(e) =>
                            handleArrayChange(
                              positionIndex,
                              field,
                              index,
                              e.target.value,
                            )
                          }
                          className={inputClass}
                        />

                        {position[field].length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              removeArrayField(positionIndex, field, index)
                            }
                            className="px-3 text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                            aria-label="Remove"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => addArrayField(positionIndex, field)}
                      className="text-blue-600 text-sm"
                    >
                      {addLabel}
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* ========================= */}
          {/* FUND SUMMARY */}
          {/* ========================= */}
          <div className="bg-gray-50 border rounded-2xl p-5">
            <h3 className="text-lg font-semibold mb-1">Fund Summary</h3>
            <p className="text-sm text-gray-500 mb-4">
              Head: {formData.fundHead} · Estimated as posts × maximum salary ×
              duration (months)
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <p className="text-sm text-gray-500">Available Fund</p>
                <p className="text-xl font-bold text-blue-600">
                  ₹{fmt(headAmount)}
                </p>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <p className="text-sm text-gray-500">Requested Amount</p>
                <p className="text-xl font-bold text-orange-500">
                  ₹{fmt(requestedAmount)}
                </p>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <p className="text-sm text-gray-500">Remaining Balance</p>
                <p
                  className={`text-xl font-bold ${
                    remainingBalance < 0 ? "text-red-500" : "text-green-600"
                  }`}
                >
                  ₹{fmt(remainingBalance)}
                </p>
              </div>
            </div>

            {isBudgetExceeded && (
              <p className="mt-4 text-red-500 font-medium">
                Requested amount exceeds available fund balance
              </p>
            )}
          </div>

          {/* ========================= */}
          {/* SUBMISSION DETAILS */}
          {/* ========================= */}
          <div>
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">
              Submission & Interview
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Submission Email</Label>
                <input
                  type="email"
                  name="submissionEmail"
                  required
                  placeholder="Submission Email"
                  value={formData.submissionEmail}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div>
                <Label>Subject-line of the email</Label>
                <input
                  type="text"
                  name="emailSubject"
                  required
                  placeholder="Email Subject"
                  value={formData.emailSubject}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div>
                <Label>Submission Deadline</Label>
                <input
                  type="datetime-local"
                  min={new Date().toISOString().slice(0, 16)}
                  name="submissionDeadline"
                  required
                  onFocus={(e) => e.target.showPicker?.()}
                  value={formData.submissionDeadline}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div>
                <Label>Interview Date</Label>
                <input
                  type="date"
                  name="interviewDate"
                  min={formData.submissionDeadline?.slice(0, 10) || today}
                  required
                  onFocus={(e) => e.target.showPicker?.()}
                  value={formData.interviewDate}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div>
                <Label>Interview Mode</Label>
                <select
                  name="interviewMode"
                  value={formData.interviewMode}
                  required
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="">Select Interview Mode</option>
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>

              <div>
                <Label>Venue</Label>
                <input
                  type="text"
                  name="venue"
                  required
                  placeholder="Venue"
                  value={formData.venue}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div>
                <Label>Reporting Time</Label>
                <input
                  type="time"
                  name="reportingTime"
                  required
                  onFocus={(e) => e.target.showPicker?.()}
                  value={formData.reportingTime}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* ========================= */}
          {/* COMMITTEE MEMBERS */}
          {/* ========================= */}
          <div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 border-b pb-2">
              <h2 className="text-lg sm:text-xl font-semibold">
                Committee Members
              </h2>

              <button
                type="button"
                onClick={addCommitteeMember}
                className="bg-green-600 text-white px-4 py-2 rounded-lg w-full sm:w-auto"
              >
                + Add Member
              </button>
            </div>

            {formData.committeeMembers.map((member, index) => (
              <div key={index} className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={member}
                  required
                  placeholder="Committee Member Name"
                  onChange={(e) => handleCommitteeChange(index, e.target.value)}
                  className={inputClass}
                />

                {formData.committeeMembers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCommitteeMember(index)}
                    className="px-3 text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                    aria-label="Remove member"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* ========================= */}
          {/* ATTACHMENT */}
          {/* ========================= */}
          <div>
            <label className="font-medium">Upload Application Form (PDF)</label>

            <input
              type="file"
              accept=".pdf"
              required
              onChange={handleAttachmentChange}
              className="w-full mt-2 p-2 border rounded"
            />

            <p className="text-xs text-gray-500 mt-1">Maximum size 5MB</p>
          </div>

          {/* ========================= */}
          {/* PRIVATE KEY */}
          {/* ========================= */}
          <div>
            <label className="font-medium">
              Upload Your Signing Key (.pem)
            </label>

            <input
              type="file"
              accept=".pem"
              required
              onChange={handleKeyFileChange}
              className="w-full mt-2 p-2 border rounded"
            />

            <p className="text-xs text-gray-500 mt-1">
              Required for digital signature verification. The key is used in
              your browser only and is never uploaded.
            </p>
          </div>

          {/* SUBMIT */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              type="submit"
              disabled={submitting || isBudgetExceeded}
              className={`btn-primary ${
                submitting || isBudgetExceeded
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-700 hover:bg-blue-800"
              }`}
            >
              {submitting ? "Submitting..." : "Submit to DRRD"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
