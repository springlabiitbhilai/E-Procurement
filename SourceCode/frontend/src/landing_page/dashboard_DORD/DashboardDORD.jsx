import { useEffect, useState } from "react";
import { axiosInstance } from "../../config/api";
import {
  readPem,
  importPrivateKey,
  signData,
  canonicalPayload,
} from "../../utils/digitalSignature";
import { STAGE_LABELS, computeFormHash } from "../../utils/recruitmentWorkflow";
import DecisionModal from "../../components/DecisionModel";
import WorkflowTracker from "../../components/WorkflowTracker";
import PreviousSignaturesCheck from "../../components/PreviousSignaturesCheck";
import { usePreviousSignatureChecks } from "../../utils/useHistoryVerification";

// DORD (Dean of R&D) - final approval desk of the recruitment workflow:
// PI -> DRRD -> R&D -> DRRD -> DORD -> DRRD -> PI

const FILTERS = [
  { key: "Awaiting", label: "Awaiting My Approval" },
  { key: "All", label: "All" },
  { key: "Pending", label: "Pending" },
  { key: "Approved", label: "Approved" },
  { key: "Rejected", label: "Rejected" },
];

// DORD acts only on requests forwarded by DRRD
const awaitingDean = (recruitment) => recruitment.stage === "DORD_APPROVAL";

const formatAmount = (value) => `₹${Number(value || 0).toLocaleString()}`;

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString() : "-";

const getBadgeColor = (status = "") => {
  switch (status.toUpperCase()) {
    case "APPROVED":
      return "bg-green-100 text-green-700";

    case "REJECTED":
      return "bg-red-100 text-red-700";

    default:
      return "bg-yellow-100 text-yellow-700";
  }
};

// Once R&D blocks the fund, the live balance excludes it
const getCurrentBalance = (recruitment) =>
  recruitment.fundBlocked
    ? (recruitment.liveFundAmount || 0) +
      (recruitment.signedPayload?.requestedAmount || 0)
    : recruitment.liveFundAmount || 0;

const getDeanDecision = (recruitment) =>
  recruitment.history?.find(
    (h) =>
      h.stage === "DORD_APPROVAL" &&
      (h.action === "APPROVED" || h.action === "REJECTED"),
  );

// The backend copies the Dean's decision to `status` only when DRRD sends the
// file to the PI. Until then the decision is read from the signed history, so
// the Dean sees it straight after signing.
const getDeanStatus = (recruitment) => {
  const decision = getDeanDecision(recruitment);

  if (decision?.action === "APPROVED") return "Approved";
  if (decision?.action === "REJECTED") return "Rejected";

  return recruitment.status;
};

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color || "text-gray-800"}`}>
        {value}
      </p>
    </div>
  );
}

function AmountBox({ label, value, tone }) {
  return (
    <div className={`rounded-xl p-3 ${tone.box}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-sm font-bold mt-1 break-words ${tone.text}`}>
        {value}
      </p>
    </div>
  );
}

export default function DashboardDORD() {
  const [recruitments, setRecruitments] = useState([]);
  const [filter, setFilter] = useState("Awaiting");
  const [search, setSearch] = useState("");
  const [decision, setDecision] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ======================================
  // FETCH DATA
  // ======================================

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await axiosInstance.get(`/api/recruitment`);

      setRecruitments(res.data.recruitments || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ======================================
  // STATS
  // ======================================

  const countStatus = (status) =>
    recruitments.filter((r) => getDeanStatus(r) === status).length;

  // ======================================
  // FILTER + SEARCH
  // ======================================

  const query = search.trim().toLowerCase();

  const filteredRecruitments = recruitments.filter((r) => {
    if (filter === "Awaiting") {
      if (!awaitingDean(r)) return false;
    } else if (filter !== "All" && getDeanStatus(r) !== filter) {
      return false;
    }

    return (
      !query ||
      [
        r.signedPayload?.projectTitle,
        r.signedPayload?.piName,
        r.signedPayload?.projectCode,
        r.signedPayload?.piDepartment,
      ]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(query))
    );
  });

  // PI, DRRD and R&D signatures of requests awaiting the Dean
  const chainChecks = usePreviousSignatureChecks(
    recruitments.filter(awaitingDean),
  );

  const toggleExpanded = (id) =>
    setExpandedId((current) => (current === id ? null : id));

  // ======================================
  // APPROVE / REJECT (signed by the Dean)
  // ======================================

  const submitDecision = async ({ privateKeyFile, reason }) => {
    const { recruitment, type } = decision;
    const approving = type === "approve";

    try {
      setSubmitting(true);

      const payload = canonicalPayload({
        recruitmentId: recruitment._id,
        projectCode: recruitment.signedPayload?.projectCode,
        formHash: await computeFormHash(recruitment),
        action: approving ? "APPROVED" : "REJECTED",
        ...(approving ? {} : { reason }),
        signedBy: "Dean",
        timestamp: new Date().toISOString(),
      });

      const pem = await readPem(privateKeyFile);
      const privateKey = await importPrivateKey(pem);
      const signatureDean = await signData(privateKey, payload);

      // Approve and reject send the same thing: the signed payload and signature
      await axiosInstance.put(
        `/api/recruitment/${recruitment._id}/${approving ? "approve" : "reject"}`,
        { payload, signatureDean },
      );

      alert(approving ? "Recruitment approved" : "Recruitment rejected");

      setDecision(null);
      fetchData();
    } catch (err) {
      console.error(err);

      // No server response means the failure happened while signing, e.g. a
      // signing key in the wrong format, so show that reason.
      alert(
        err.response?.data?.message ||
          err.message ||
          (approving ? "Approval failed" : "Rejection failed"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const decisionProject = decision?.recruitment.signedPayload;

  return (
    <div className="min-h-screen bg-[#d6e3da] p-4 sm:p-6">
      {/* Header */}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">
            Dean Dashboard
          </h1>

          <p className="text-gray-500">
            Review and approve recruitment requests
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="btn-primary w-full sm:w-auto"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-6">{error}</p>
      )}

      {/* Stats */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Recruitment Requests" value={recruitments.length} />
        <StatCard
          label="Awaiting Dean Approval"
          value={recruitments.filter(awaitingDean).length}
          color="text-blue-700"
        />
        <StatCard
          label="Approved"
          value={countStatus("Approved")}
          color="text-green-600"
        />
        <StatCard
          label="Rejected"
          value={countStatus("Rejected")}
          color="text-red-600"
        />
      </div>

      {/* Filters */}

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                filter === item.key
                  ? "bg-gray-800 text-white"
                  : "bg-white border"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, PI, department or project code"
          className="w-full md:w-96 md:ml-auto p-2 rounded-lg bg-white border outline-none"
        />
      </div>

      {loading && <p className="text-gray-600">Loading...</p>}

      {/* Recruitment requests */}

      {!loading && (
        <>
          {filteredRecruitments.length === 0 ? (
            <div className="bg-white rounded-xl p-10 text-center shadow">
              <p className="text-gray-500">No recruitment requests found.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecruitments.map((recruitment) => {
                const data = recruitment.signedPayload || {};
                const expanded = expandedId === recruitment._id;
                const awaiting = awaitingDean(recruitment);
                const deanDecision = getDeanDecision(recruitment);
                const deanStatus = getDeanStatus(recruitment);

                // Every earlier signature must verify before approval;
                // rejection stays allowed for tampered requests
                const chainCheck = chainChecks[recruitment._id];
                const approveDisabled = chainCheck?.status !== "valid";

                const remainingFund = recruitment.remainingFund || 0;

                return (
                  <div
                    key={recruitment._id}
                    className="bg-white rounded-2xl shadow p-6 hover:shadow-lg transition"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <h2 className="text-xl font-bold text-gray-800">
                        {data.projectTitle || "Untitled project"}
                      </h2>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getBadgeColor(
                          deanStatus,
                        )}`}
                      >
                        {deanStatus}
                      </span>
                    </div>

                    <p className="text-sm text-gray-500 mt-1">
                      {data.projectCode}
                    </p>

                    <p className="text-sm font-medium text-blue-700 mt-2">
                      {STAGE_LABELS[recruitment.stage] || recruitment.stage}
                    </p>

                    <div className="mt-4 space-y-2 text-sm">
                      <p>
                        <span className="font-semibold">PI Name:</span>{" "}
                        {data.piName || "-"}
                      </p>

                      <p>
                        <span className="font-semibold">Department:</span>{" "}
                        {data.piDepartment || "-"}
                      </p>

                      <p>
                        <span className="font-semibold">Fund Head:</span>{" "}
                        {data.fundHead || "-"}
                      </p>

                      <p>
                        <span className="font-semibold">Submitted:</span>{" "}
                        {formatDate(recruitment.createdAt)}
                      </p>
                    </div>

                    {/* Fund position the Dean is approving against */}

                    <div className="grid grid-cols-3 gap-2 mt-4">
                      <AmountBox
                        label="Current balance"
                        value={formatAmount(getCurrentBalance(recruitment))}
                        tone={{ box: "bg-blue-50", text: "text-blue-700" }}
                      />
                      <AmountBox
                        label="Requested"
                        value={formatAmount(data.requestedAmount)}
                        tone={{ box: "bg-orange-50", text: "text-orange-600" }}
                      />
                      <AmountBox
                        label="After approval"
                        value={formatAmount(remainingFund)}
                        tone={{
                          box: remainingFund < 0 ? "bg-red-50" : "bg-green-50",
                          text:
                            remainingFund < 0
                              ? "text-red-600"
                              : "text-green-700",
                        }}
                      />
                    </div>

                    {/* Documents to review */}

                    {(recruitment.recruitmentAdPath ||
                      recruitment.approvalLetterPath ||
                      recruitment.signedApprovalPdf) && (
                      <div className="flex flex-wrap gap-4 mt-4 text-sm">
                        {recruitment.recruitmentAdPath && (
                          <a
                            href={recruitment.recruitmentAdPath}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Advertisement
                          </a>
                        )}

                        {recruitment.approvalLetterPath && (
                          <a
                            href={recruitment.approvalLetterPath}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Approval Letter
                          </a>
                        )}

                        {recruitment.signedApprovalPdf && (
                          <a
                            href={recruitment.signedApprovalPdf}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Signed Approval (DORD)
                          </a>
                        )}
                      </div>
                    )}

                    {expanded && (
                      <div className="mt-4 border-t pt-4 space-y-2 text-sm">
                        <WorkflowTracker recruitment={recruitment} />

                        <p className="pt-2">
                          <span className="font-semibold">
                            Sponsoring Agency:
                          </span>{" "}
                          {data.sponsoringAgency || "-"}
                        </p>

                        <p>
                          <span className="font-semibold">Interview:</span>{" "}
                          {data.interviewDate || "-"}
                          {data.interviewMode && ` (${data.interviewMode})`}
                        </p>

                        <p className="font-semibold">Positions:</p>

                        <ul className="space-y-1">
                          {(data.positions || []).map((position, index) => (
                            <li
                              key={`${position.positionName}-${index}`}
                              className="text-gray-700"
                            >
                              {position.positionName} × {position.numberOfPosts}{" "}
                              ({position.salaryStart} - {position.salaryEnd},{" "}
                              {position.duration})
                            </li>
                          ))}
                        </ul>

                        {deanDecision?.action === "REJECTED" &&
                          deanDecision.remarks && (
                            <p className="text-red-600">
                              <span className="font-semibold">
                                Dean Remarks:
                              </span>{" "}
                              {deanDecision.remarks}
                            </p>
                          )}
                      </div>
                    )}

                    {awaiting && (
                      <div className="mt-4">
                        <PreviousSignaturesCheck check={chainCheck} />
                      </div>
                    )}

                    {awaiting && (
                      <div className="flex gap-3 mt-6">
                        <button
                          disabled={approveDisabled}
                          title={
                            approveDisabled
                              ? "Previous signatures not verified"
                              : ""
                          }
                          onClick={() =>
                            setDecision({ recruitment, type: "approve" })
                          }
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium text-white transition ${
                            approveDisabled
                              ? "bg-gray-300 cursor-not-allowed"
                              : "bg-green-600 hover:bg-green-700"
                          }`}
                        >
                          Approve
                        </button>

                        <button
                          onClick={() =>
                            setDecision({ recruitment, type: "reject" })
                          }
                          className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => toggleExpanded(recruitment._id)}
                      className="btn-primary mt-3 w-full"
                    >
                      {expanded ? "Hide Details" : "View Details"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <DecisionModal
        open={Boolean(decision)}
        type={decision?.type}
        title={
          decision?.type === "reject"
            ? "Reject Recruitment"
            : "Approve Recruitment"
        }
        description={`${decisionProject?.projectTitle || ""} (${
          decisionProject?.projectCode || ""
        }). ${
          decision?.type === "reject"
            ? "Give a reason and upload your signing key to digitally sign the rejection."
            : "Upload your signing key to digitally sign the approval."
        }`}
        confirmLabel={
          decision?.type === "reject" ? "Confirm Reject" : "Confirm Approve"
        }
        showReason={decision?.type === "reject"}
        requireReason={decision?.type === "reject"}
        reasonLabel="Rejection Reason"
        submitting={submitting}
        onClose={() => setDecision(null)}
        onConfirm={submitDecision}
      />
    </div>
  );
}
