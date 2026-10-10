import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import ManpowerHiringForm from "./process_forms/ManpowerHiringForms";
import BackButton from "../components/BackButton";
import { axiosInstance } from "../config/api";

// process option
const processOptions = [
  {
    label: "Purchase of Material Procurement > 1 Lakh",
    value: "purchase_gt_1L",
  },
  {
    label: "Purchase of Material Procurement < 1 Lakh",
    value: "purchase_lt_1L",
  },
  {
    label: "Project Staff recruitment (Man power Hiring)",
    value: "manpower_hiring",
  },
  { label: "Chair Person", value: "chair_person" },
  { label: "Event Budget Approval", value: "event_budget" },
  { label: "Participants Accommodation Approval", value: "accommodation" },
  { label: "Internship Approval", value: "internship" },
  { label: "TA/DA Approval", value: "tada" },
  { label: "Travel Booking / Cab Requisition", value: "travel" },
  { label: "NOC issue / Attendance", value: "noc_attendance" },
  { label: "Advance taking", value: "advance_take" },
  { label: "Advance Settlement", value: "advance_settlement" },
  { label: "Tenure Extension", value: "tenure_extension" },
  { label: "Direct Purchase", value: "direct_purchase" },
  { label: "Reimbursement", value: "reimbursement" },
  { label: "Event / Workshop Expenses", value: "event_expense" },
];

const fmt = (n) =>
  Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });

export default function FundBookingPage() {
  const { id } = useParams(); // id from route
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [process, setProcess] = useState("");
  const [selectedHead, setSelectedHead] = useState("");

  // R&D signature check: checking | valid | invalid
  const [rndCheck, setRndCheck] = useState("checking");

  const fetchProject = async () => {
    try {
      const res = await axiosInstance.get(`/api/projects/${id}`);
      setProjectData(res.data);
    } catch (err) {
      console.error(err);
      alert("Unable to fetch project");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchProject();
  }, [id]);

  // Verify that R&D really approved this project before allowing fund booking
  useEffect(() => {
    if (!projectData) return;

    if (
      projectData.piSubmission?.status !== "APPROVED" ||
      !projectData.rndDecision?.signatureRND
    ) {
      return;
    }

    const verify = async () => {
      setRndCheck("checking");
      try {
        const r = await axiosInstance.get(`/api/projects/${id}/verify-rnd`);
        setRndCheck(r.data.verified ? "valid" : "invalid");
      } catch (err) {
        console.error(err);
        setRndCheck("invalid");
      }
    };

    verify();
  }, [projectData, id]);

  if (loading) return <p className="p-10 text-gray-700">Loading...</p>;
  if (!projectData)
    return <p className="p-10 text-gray-700">No project found</p>;

  const signedPayload = projectData.piSubmission?.signedPayload || {};
  // Sanctioned amount per head (signed by the PI) minus what is blocked by
  // approved recruitment requests = amount still available
  const blockedFunds = projectData.blockedFunds || {};
  const divisionHeads = Object.fromEntries(
    Object.entries(signedPayload.divisionHeads || {}).map(([head, amount]) => [
      head,
      (Number(amount) || 0) - (Number(blockedFunds[head]) || 0),
    ]),
  );
  const status = projectData.piSubmission?.status;
  const projectCode = projectData.rndDecision?.signedPayload?.projectCode;

  // Fund booking is only possible for approved projects
  if (status !== "APPROVED") {
    return (
      <div className="min-h-screen bg-[#d6e3da] p-4 sm:p-6 md:p-8">
        <div className="flex justify-end mb-4">
          <BackButton />
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Fund booking not available
          </h2>
          <p className="text-gray-600">
            {status === "REJECTED"
              ? "This project registration was rejected by R&D."
              : "This project is still waiting for R&D approval."}
          </p>
        </div>
      </div>
    );
  }

  const rndVerified = rndCheck === "valid";

  return (
    <div className="min-h-screen bg-[#d6e3da] p-4 sm:p-6 md:p-8">
      <BackButton />

      <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl shadow-lg mt-2">
        {/* HEADER */}
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 text-gray-800">
          Complete the Processes
        </h2>

        {/* R&D signature status */}
        <div
          className={`mb-6 p-3 rounded-lg border font-semibold ${
            rndCheck === "valid"
              ? "bg-green-50 border-green-300 text-green-700"
              : rndCheck === "checking"
                ? "bg-gray-100 border-gray-300 text-gray-600"
                : "bg-red-50 border-red-300 text-red-700"
          }`}
        >
          {rndCheck === "valid" &&
            `✔ Approval verified: signed by ${projectData.rndDecision?.signedBy || "R&D"}`}
          {rndCheck === "checking" && "Verifying R&D approval..."}
          {rndCheck === "invalid" &&
            "✖ R&D signature verification FAILED. Fund booking is disabled."}
        </div>

        {/* Project Code */}
        <p className="mb-4 text-gray-600">
          <span className="font-semibold">Project Code:</span>{" "}
          {projectCode || "Not assigned"}
        </p>

        {/* Project title */}
        <p className="mb-6 text-gray-600">
          <span className="font-semibold">Project Title:</span>{" "}
          {signedPayload.title}
        </p>

        {/* Select Head */}
        <div className="mb-6">
          <label className="block text-gray-600 mb-1">Select Fund Head</label>

          <select
            value={selectedHead}
            onChange={(e) => setSelectedHead(e.target.value)}
            disabled={!rndVerified}
            className="w-full border rounded-lg px-4 py-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Select Head</option>

            {Object.entries(divisionHeads).map(([key, value]) => (
              <option key={key} value={key}>
                {key} ( ₹{fmt(value)} )
              </option>
            ))}
          </select>

          {selectedHead && (
            <p className="mt-2 text-sm text-gray-600">
              Available Fund: ₹{fmt(divisionHeads[selectedHead])}
            </p>
          )}
        </div>

        {/* Select Process */}
        <div className="mb-6">
          <label className="block text-gray-600 mb-1">Select Process</label>

          <select
            value={process}
            onChange={(e) => setProcess(e.target.value)}
            disabled={!rndVerified}
            className="w-full border rounded-lg px-4 py-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Select Process</option>
            {processOptions.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* MANPOWER FORM */}
        {rndVerified && process === "manpower_hiring" && selectedHead && (
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">
              Manpower Hiring Details
            </h3>

            <ManpowerHiringForm
              projectData={projectData}
              process={process}
              selectedHead={selectedHead}
              selectedHeadAmount={divisionHeads[selectedHead]}
              refreshProject={fetchProject}
            />
          </div>
        )}

        {rndVerified && process === "manpower_hiring" && !selectedHead && (
          <p className="text-sm text-amber-700">
            Please select a fund head to continue.
          </p>
        )}

        {/* OTHER PROCESSES */}
        {rndVerified && process && process !== "manpower_hiring" && (
          <div className="flex items-center justify-center py-10 px-4">
            <div className="bg-gray-50 border rounded-2xl p-10 text-center max-w-md w-full">
              <h1 className="text-3xl font-bold text-blue-700 mb-4">
                🚧 Coming Soon
              </h1>

              <p className="text-gray-600 text-lg">
                This process module is currently under development.
              </p>

              <p className="text-gray-500 mt-2">Please check back later.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
