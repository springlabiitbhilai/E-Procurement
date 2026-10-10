import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BackButton from "../../components/BackButton";
import { jwtDecode } from "jwt-decode";
import {
  readPem,
  importPrivateKey,
  signData,
  hashPdf,
  canonicalPayload,
} from "../../utils/digitalSignature";
import { API_URL, axiosInstance } from "../../config/api";

export default function ProjectRegistrationForm() {
  const token = localStorage.getItem("token");
  const user = jwtDecode(token);

  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    piName: "",
    department: "",
    piEmpId: "",
    totalFundReceived: "",
    bankTransactionId: "",
    bifurcationYear: "",
    divisionHeads: {
      "Manpower (including Interns)": "",
      Equipment: "",
      "Consumables/Contingency/Travel": "",
      "Bootcamps/Events": "",
      Overhead: "",
    },
    attachment: null,
    privateKeyFile: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      piName: user.fullName,
      piEmpId: user.employeeId,
      department: user.department,
    }));
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    if (formData.divisionHeads.hasOwnProperty(name)) {
      setFormData({
        ...formData,
        divisionHeads: { ...formData.divisionHeads, [name]: Number(value) },
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  }

  function handleFileChange(e) {
    setFormData({ ...formData, attachment: e.target.files[0] });
  }

  function handleKeyFileChange(e) {
    setFormData({ ...formData, privateKeyFile: e.target.files[0] });
  }

  const totalAllocated = Object.values(formData.divisionHeads).reduce(
    (sum, value) => sum + Number(value || 0),
    0,
  );

  const remainingAmount =
    Number(formData.totalFundReceived || 0) - totalAllocated;

  const isExceeded = remainingAmount < 0;

  // Handle Submit
  async function handleSubmit(e) {
    e.preventDefault();

    if (isSubmitting) return;

    if (!formData.privateKeyFile) {
      alert("Upload private key");
      return;
    }
    if (!formData.attachment) {
      alert("Upload PDF");
      return;
    }
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const pdfHash = await hashPdf(formData.attachment);

      const payload = canonicalPayload({
        title: formData.title,
        piName: user.fullName,
        piEmpId: user.employeeId,
        department: user.department,
        totalFundReceived: formData.totalFundReceived,
        bankTransactionId: formData.bankTransactionId,
        bifurcationYear: formData.bifurcationYear,
        divisionHeads: formData.divisionHeads,
        pdfHash: pdfHash,
        role: "PI",
        timestamp: new Date().toISOString(),
      });

      const pem = await readPem(formData.privateKeyFile);
      const privateKey = await importPrivateKey(pem);
      const signature = await signData(privateKey, payload);

      // sending data to backend
      const sendData = new FormData();
      sendData.append("formData", JSON.stringify(payload));
      sendData.append("signature", signature);
      sendData.append("attachment", formData.attachment);

      const res = await axiosInstance.post(`/api/projects`, sendData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      alert("✅ Submitted");
      navigate("/pi-dashboard");
    } catch (err) {
      console.error(err);
      setSubmitError(
        err.response?.data?.msg ||
          "Submission failed. Please check your files and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-tr from-gray-100 to-gray-50">
      <div className="glass-card w-full max-w-4xl p-4 sm:p-6 md:p-8 shadow-lg fade-in">
        <BackButton/>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary text-center mb-6">
          Project Bifurcation and registration Form
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label>Project Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full p-3 border rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label>PI Name</label>
              <input
                disabled
                type="text"
                name="piName"
                value={formData.piName || ""}
                onChange={handleChange}
                className="w-full p-3 border rounded bg-gray-200"
              />
            </div>
            <div>
              <label>Department</label>
              <input
                disabled
                type="text"
                name="department"
                value={formData.department || ""}
                readOnly
                className="w-full p-3 border bg-gray-200 rounded"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label>Bank Transaction ID</label>
              <input
                type="text"
                name="bankTransactionId"
                value={formData.bankTransactionId}
                onChange={handleChange}
                required
                className="w-full p-3 border rounded"
              />
            </div>
            <div>
              <label>PI Employee ID</label>
              <input
                type="text"
                name="piEmpId"
                value={formData.piEmpId || ""}
                onChange={handleChange}
                disabled
                className="w-full p-3 border rounded bg-gray-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label>Total Fund Received (₹)</label>
              <input
                type="number"
                name="totalFundReceived"
                value={formData.totalFundReceived}
                onChange={handleChange}
                required
                className="w-full p-3 border rounded"
              />
            </div>
            <div>
              <label>Funding Year</label>
              <input
                type="number"
                name="bifurcationYear"
                value={formData.bifurcationYear}
                onChange={handleChange}
                required
                min="2000"
                max="3000"
                step="1"
                placeholder="(e.g. 2026)"
                className="w-full p-3 border rounded"
              />
            </div>
          </div>

          {/* Division Heads */}
          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-5">
              <h3 className="text-xl font-semibold text-gray-700">
                Fund Bifurcation
              </h3>

              <div className="flex gap-4 mt-3 md:mt-0">
                <div className="bg-blue-50 px-4 py-2 rounded-xl border">
                  <p className="text-xs text-gray-500">Allocated</p>
                  <p className="font-bold text-blue-700">
                    ₹ {totalAllocated.toLocaleString()}
                  </p>
                </div>

                <div
                  className={`px-4 py-2 rounded-xl border ${
                    isExceeded
                      ? "bg-red-50 border-red-200"
                      : "bg-green-50 border-green-200"
                  }`}
                >
                  <p className="text-xs text-gray-500">Remaining</p>

                  <p
                    className={`font-bold ${
                      isExceeded ? "text-red-600" : "text-green-700"
                    }`}
                  >
                    ₹ {remainingAmount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {isExceeded && (
              <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-700 border border-red-300">
                ⚠ Total bifurcation exceeds available funds
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {Object.keys(formData.divisionHeads).map((head, i) => (
                <div key={i} className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    {head}
                  </label>

                  <input
                    type="number"
                    name={head}
                    value={formData.divisionHeads[head]}
                    onChange={handleChange}
                    required
                    placeholder="Enter amount"
                    className={`w-full p-3 rounded-xl border outline-none transition-all
            ${
              isExceeded
                ? "border-red-300 focus:ring-2 focus:ring-red-300"
                : "border-gray-300 focus:ring-2 focus:ring-blue-300"
            }`}
                  />
                  {head === "Overhead" && remainingAmount !== 0 && (
                    <p className="text-sm text-blue-600 mt-1">
                      Suggested Overhead Amount: ₹{" "}
                      {remainingAmount.toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Attachment */}
          <div>
            <label>Sanction Order (PDF Only)</label>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              required
              className="w-full mt-2 p-2 border rounded"
            />
          </div>

          {/* Private Key */}
          <div>
            <label>Enter Your Signing Key (.pem)</label>
            <input
              type="file"
              accept=".pem"
              onChange={handleKeyFileChange}
              required
              className="w-full mt-2 p-2 border rounded"
            />
          </div>
          {/* Submit Button Section */}
          {isSubmitting && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800"
            >
              <span className="mt-0.5 inline-block h-5 w-5 animate-spin rounded-full border-2 border-blue-300 border-t-blue-700" />
              <div>
                <p className="font-semibold">Preparing your submission…</p>
                <p className="mt-1 text-blue-700">
                  We’re securing your PDF and sending the signed project
                  details. This can take a few seconds. Please keep this page
                  open.
                </p>
              </div>
            </div>
          )}

          {submitError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Signing & Submitting…" : "Send to RND"}
          </button>
        </form>
      </div>
    </div>
  );
}
