import { useEffect, useState } from "react";
import { axiosInstance } from "../../config/api";
import {
  STAGE_LABELS,
  REJECT_ACTIONS,
  signWorkflowAction,
} from "../../utils/recruitmentWorkflow";
import DecisionModal from "../../components/DecisionModel";
import WorkflowTracker from "../../components/WorkflowTracker";
import PreviousSignaturesCheck from "../../components/PreviousSignaturesCheck";
import { usePreviousSignatureChecks } from "../../utils/useHistoryVerification";

// DRRD (Deputy Registrar of R&D) - recruitment requests and the DRRD desk of
// the recruitment workflow:
// PI -> DRRD -> R&D -> DRRD -> DORD -> DRRD -> PI

const RECRUITMENT_STATUSES = [
  "Action Required",
  "All",
  "Approved",
  "Rejected",
];

// What DRRD can do at each stage of the recruitment workflow
const DRRD_ACTIONS = {
  DRRD_VERIFICATION: [
    { action: "FORWARD", label: "Forward to R&D", type: "approve" },
    { action: "REJECT", label: "Reject to PI", type: "reject" },
  ],
  DRRD_REVIEW: [
    { action: "FORWARD", label: "Forward to DORD", type: "approve" },
    { action: "REJECT", label: "Reject to PI", type: "reject" },
  ],
  DRRD_DISPATCH: [
    { action: "SEND_TO_PI", label: "Send File to PI", type: "approve" },
  ],
};

const needsDrrdAction = (recruitment) =>
  Boolean(DRRD_ACTIONS[recruitment.stage]);

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

export default function DashboardDRRD() {
  const [recruitments, setRecruitments] = useState([]);
  const [recruitmentStatus, setRecruitmentStatus] = useState("Action Required");
  const [decision, setDecision] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
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

  const countRecruitments = (status) =>
    recruitments.filter((r) => r.status === status).length;

  // ======================================
  // FILTERS
  // ======================================

  const query = search.trim().toLowerCase();

  const filteredRecruitments = recruitments.filter((r) => {
    if (recruitmentStatus === "Action Required") {
      if (!needsDrrdAction(r)) return false;
    } else if (recruitmentStatus !== "All" && r.status !== recruitmentStatus) {
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

  // Every earlier signature must verify before DRRD forwards / dispatches
  const chainChecks = usePreviousSignatureChecks(
    recruitments.filter(needsDrrdAction),
  );

  const toggleExpanded = (id) =>
    setExpandedId((current) => (current === id ? null : id));

  // ======================================
  // DRRD WORKFLOW ACTION
  // ======================================

  const submitDecision = async ({ privateKeyFile, reason }) => {
    const { recruitment, action } = decision;

    try {
      setSubmitting(true);

      const { payload, signature } = await signWorkflowAction({
        privateKeyFile,
        recruitment,
        action: action.action,
        remarks: reason,
      });

      await axiosInstance.put(
        `/api/recruitment/${recruitment._id}/drrd-action`,
        {
          action: action.action,
          remarks: reason,
          payload,
          signature,
        },
      );

      alert(`${action.label}: done`);

      setDecision(null);

      fetchData();
    } catch (err) {
      console.error(err);

      alert(err.response?.data?.message || "Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#d6e3da] p-4 sm:p-6">
      {/* Header */}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">
            DRRD Dashboard
          </h1>

          <p className="text-gray-500">
            Verify and forward recruitment requests
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

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Recruitment Requests" value={recruitments.length} />
        <StatCard
          label="Awaiting DRRD Action"
          value={recruitments.filter(needsDrrdAction).length}
          color="text-blue-700"
        />
        <StatCard
          label="Approved"
          value={countRecruitments("Approved")}
          color="text-green-600"
        />
        <StatCard
          label="Rejected"
          value={countRecruitments("Rejected")}
          color="text-red-600"
        />
      </div>

      {/* Filters */}

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          {RECRUITMENT_STATUSES.map((item) => (
            <button
              key={item}
              onClick={() => setRecruitmentStatus(item)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                recruitmentStatus === item
                  ? "bg-gray-800 text-white"
                  : "bg-white border"
              }`}
            >
              {item}
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
                const expanded = expandedId === recruitment._id;

                return (
                  <div
                    key={recruitment._id}
                    className="bg-white rounded-2xl shadow p-6 hover:shadow-lg transition"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <h2 className="text-xl font-bold text-gray-800">
                        {recruitment.signedPayload?.projectTitle ||
                          "Untitled project"}
                      </h2>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getBadgeColor(
                          recruitment.status,
                        )}`}
                      >
                        {recruitment.status}
                      </span>
                    </div>

                    <p className="text-sm text-gray-500 mt-1">
                      {recruitment.signedPayload?.projectCode}
                    </p>

                    <p className="text-sm font-medium text-blue-700 mt-2">
                      {STAGE_LABELS[recruitment.stage] || recruitment.stage}
                    </p>

                    <div className="mt-4 space-y-2 text-sm">
                      <p>
                        <span className="font-semibold">PI Name:</span>{" "}
                        {recruitment.signedPayload?.piName || "-"}
                      </p>

                      <p>
                        <span className="font-semibold">Department:</span>{" "}
                        {recruitment.signedPayload?.piDepartment || "-"}
                      </p>

                      <p>
                        <span className="font-semibold">Fund Head:</span>{" "}
                        {recruitment.signedPayload?.fundHead || "-"}
                      </p>

                      <p>
                        <span className="font-semibold">Requested:</span>{" "}
                        {formatAmount(
                          recruitment.signedPayload?.requestedAmount,
                        )}
                      </p>

                      <p>
                        <span className="font-semibold">Remaining Fund:</span>{" "}
                        <span
                          className={
                            recruitment.remainingFund < 0 ? "text-red-600" : ""
                          }
                        >
                          {formatAmount(recruitment.remainingFund)}
                        </span>
                      </p>

                      <p>
                        <span className="font-semibold">Submitted:</span>{" "}
                        {formatDate(recruitment.createdAt)}
                      </p>

                      {recruitment.fundCheck && (
                        <p
                          className={
                            recruitment.fundCheck.available
                              ? "text-green-700"
                              : "text-red-600"
                          }
                        >
                          <span className="font-semibold">R&D Fund Check:</span>{" "}
                          {recruitment.fundCheck.available
                            ? "Fund available (blocked)"
                            : "Fund not available"}
                          {recruitment.fundCheck.remarks &&
                            ` - ${recruitment.fundCheck.remarks}`}
                        </p>
                      )}
                    </div>

                    {expanded && (
                      <div className="mt-4 border-t pt-4 space-y-2 text-sm">
                        <WorkflowTracker recruitment={recruitment} />

                        <p className="pt-2">
                          <span className="font-semibold">
                            Sponsoring Agency:
                          </span>{" "}
                          {recruitment.signedPayload?.sponsoringAgency || "-"}
                        </p>

                        <p>
                          <span className="font-semibold">Process:</span>{" "}
                          {recruitment.process || "-"}
                        </p>

                        <p>
                          <span className="font-semibold">Interview:</span>{" "}
                          {recruitment.signedPayload?.interviewDate || "-"}
                          {recruitment.signedPayload?.interviewMode &&
                            ` (${recruitment.signedPayload?.interviewMode})`}
                        </p>

                        <p className="font-semibold">Positions:</p>

                        <ul className="space-y-1">
                          {(recruitment.signedPayload?.positions || []).map(
                            (position, index) => (
                              <li
                                key={`${position.positionName}-${index}`}
                                className="text-gray-700"
                              >
                                {position.positionName} ×{" "}
                                {position.numberOfPosts} ({position.salaryStart}{" "}
                                - {position.salaryEnd}, {position.duration})
                              </li>
                            ),
                          )}
                        </ul>

                        {recruitment.history?.find(
                          (h) =>
                            h.stage === "DORD_APPROVAL" &&
                            h.action === "REJECTED",
                        )?.remarks && (
                          <p className="text-red-600">
                            <span className="font-semibold">Dean Remarks:</span>{" "}
                            {
                              recruitment.history.find(
                                (h) =>
                                  h.stage === "DORD_APPROVAL" &&
                                  h.action === "REJECTED",
                              ).remarks
                            }
                          </p>
                        )}

                        <div className="flex flex-wrap gap-4 mt-2">
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
                      </div>
                    )}

                    {needsDrrdAction(recruitment) && (
                      <div className="mt-4">
                        <PreviousSignaturesCheck
                          check={chainChecks[recruitment._id]}
                        />
                      </div>
                    )}

                    {needsDrrdAction(recruitment) && (
                      <div className="flex gap-3 mt-6">
                        {DRRD_ACTIONS[recruitment.stage].map((action) => {
                          // DORD only gets requests with the fund blocked
                          const noFund =
                            recruitment.stage === "DRRD_REVIEW" &&
                            action.action === "FORWARD" &&
                            !recruitment.fundCheck?.available;

                          // Rejections stay allowed for tampered requests
                          const unverified =
                            !REJECT_ACTIONS.includes(action.action) &&
                            chainChecks[recruitment._id]?.status !== "valid";

                          const disabled = noFund || unverified;

                          return (
                            <button
                              key={action.action}
                              disabled={disabled}
                              title={
                                noFund
                                  ? "R&D reported fund not available"
                                  : unverified
                                    ? "Previous signatures not verified"
                                    : ""
                              }
                              onClick={() =>
                                setDecision({ recruitment, action })
                              }
                              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium text-white transition ${
                                disabled
                                  ? "bg-gray-300 cursor-not-allowed"
                                  : action.type === "approve"
                                    ? "bg-green-600 hover:bg-green-700"
                                    : "bg-red-600 hover:bg-red-700"
                              }`}
                            >
                              {action.label}
                            </button>
                          );
                        })}
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
        type={decision?.action.type}
        title={decision?.action.label}
        description={`${decision?.recruitment.signedPayload?.projectTitle || ""} (${
          decision?.recruitment.signedPayload?.projectCode || ""
        }). Upload your signing key to digitally sign this action.`}
        confirmLabel={decision?.action.label}
        showReason
        reasonLabel={
          decision?.action.type === "reject" ? "Rejection Reason" : "Remarks"
        }
        requireReason={decision?.action.type === "reject"}
        submitting={submitting}
        onClose={() => setDecision(null)}
        onConfirm={submitDecision}
      />
    </div>
  );
}
