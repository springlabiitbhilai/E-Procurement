import { useEffect, useState } from "react";
import { axiosInstance } from "../../config/api";
import {
  STAGE_LABELS,
  signWorkflowAction,
} from "../../utils/recruitmentWorkflow";
import DecisionModal from "../../components/DecisionModel";
import WorkflowTracker from "../../components/WorkflowTracker";
import PreviousSignaturesCheck from "../../components/PreviousSignaturesCheck";
import { usePreviousSignatureChecks } from "../../utils/useHistoryVerification";

// R&D desk of the recruitment workflow: requests forwarded by DRRD wait
// here for a fund availability check, then go back to DRRD

const formatAmount = (value) => `₹${Number(value || 0).toLocaleString()}`;

const FUND_ACTIONS = {
  FUND_AVAILABLE: {
    action: "FUND_AVAILABLE",
    label: "Fund Available",
    type: "approve",
  },
  FUND_NOT_AVAILABLE: {
    action: "FUND_NOT_AVAILABLE",
    label: "Fund Not Available",
    type: "reject",
  },
};

export default function RndFundCheckList({onDecision}) {
  const [recruitments, setRecruitments] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [decision, setDecision] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fetchRecruitments = async () => {
    try {
      setLoading(true);

      const res = await axiosInstance.get(`/api/recruitment`);

      setRecruitments(res.data.recruitments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecruitments();
  }, []);

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
        `/api/recruitment/${recruitment._id}/fund-check`,
        {
          action: action.action,
          remarks: reason,
          payload,
          signature,
        },
      );

      alert("Fund check sent back to DRRD");

      setDecision(null);

      fetchRecruitments();
      onDecision?.();
    } catch (err) {
      console.error(err);

      alert(err.response?.data?.message || "Fund check failed");
    } finally {
      setSubmitting(false);
    }
  };

  const pending = recruitments.filter((r) => r.stage === "RND_FUND_CHECK");

  // PI and DRRD signatures must verify before R&D confirms a fund
  const chainChecks = usePreviousSignatureChecks(pending);

  // Requests R&D has already checked
  const checked = recruitments.filter(
    (r) => r.stage !== "RND_FUND_CHECK" && r.fundCheck,
  );

  const list = showAll ? checked : pending;

  return (
    <div>
      <div className="flex gap-3 mb-8">
        {[
          { key: false, label: `Awaiting Fund Check (${pending.length})` },
          { key: true, label: `Checked (${checked.length})` },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => setShowAll(item.key)}
            className={`px-5 py-2 rounded-lg font-medium transition ${
              showAll === item.key
                ? "bg-blue-600 text-white"
                : "bg-white border"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-gray-600">Loading...</p>}

      {!loading && list.length === 0 && (
        <div className="bg-white rounded-xl p-10 text-center shadow">
          <p className="text-gray-500">
            {showAll
              ? "No checked recruitment requests."
              : "No recruitment requests awaiting fund check."}
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map((recruitment) => {
          const expanded = expandedId === recruitment._id;
          const isPending = recruitment.stage === "RND_FUND_CHECK";
          const chainCheck = chainChecks[recruitment._id];
          const chainVerified = chainCheck?.status === "valid";
          const sufficient =
            recruitment.liveFundAmount >=
            (recruitment.signedPayload?.requestedAmount || 0);

          return (
            <div
              key={recruitment._id}
              className="bg-white rounded-2xl shadow p-6 hover:shadow-lg transition"
            >
              <h2 className="text-xl font-bold text-gray-800">
                {recruitment.signedPayload?.projectTitle}
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                {recruitment.signedPayload?.projectCode}
              </p>

              <p className="text-sm font-medium text-blue-700 mt-2">
                {STAGE_LABELS[recruitment.stage] || recruitment.stage}
              </p>

              <div className="mt-4 space-y-2 text-sm">
                <p>
                  <span className="font-semibold">PI Name:</span>{" "}
                  {recruitment.signedPayload?.piName}
                </p>

                <p>
                  <span className="font-semibold">Fund Head:</span>{" "}
                  {recruitment.signedPayload?.fundHead}
                </p>

                <p>
                  <span className="font-semibold">Requested:</span>{" "}
                  {formatAmount(recruitment.signedPayload?.requestedAmount)}
                </p>

                {isPending && <PreviousSignaturesCheck check={chainCheck} />}

                {isPending ? (
                  <p className={sufficient ? "text-green-700" : "text-red-600"}>
                    <span className="font-semibold">Available in Head:</span>{" "}
                    {formatAmount(recruitment.liveFundAmount)}
                    {!sufficient && " (insufficient)"}
                  </p>
                ) : (
                  <p
                    className={
                      recruitment.fundCheck.available
                        ? "text-green-700"
                        : "text-red-600"
                    }
                  >
                    <span className="font-semibold">Your Check:</span>{" "}
                    {recruitment.fundCheck.available
                      ? "Fund available (blocked)"
                      : "Fund not available"}
                    {recruitment.fundCheck.remarks &&
                      ` - ${recruitment.fundCheck.remarks}`}
                  </p>
                )}
              </div>

              {expanded && (
                <div className="mt-4 border-t pt-4 text-sm">
                  <WorkflowTracker recruitment={recruitment} />
                </div>
              )}

              {isPending && (
                <div className="flex gap-3 mt-6">
                  {Object.values(FUND_ACTIONS).map((action) => {
                    // Cannot confirm a fund before the previous signatures
                    // verify, or a fund that is not there
                    const disabled =
                      action.action === "FUND_AVAILABLE" &&
                      (!chainVerified || !sufficient);

                    return (
                      <button
                        key={action.action}
                        disabled={disabled}
                        onClick={() => setDecision({ recruitment, action })}
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
                onClick={() =>
                  setExpandedId((current) =>
                    current === recruitment._id ? null : recruitment._id,
                  )
                }
                className="btn-primary mt-3 w-full"
              >
                {expanded ? "Hide Workflow" : "View Workflow"}
              </button>
            </div>
          );
        })}
      </div>

      <DecisionModal
        open={Boolean(decision)}
        type={decision?.action.type}
        title={decision?.action.label}
        description={
          decision?.action.action === "FUND_AVAILABLE"
            ? `${formatAmount(
                decision?.recruitment.signedPayload?.requestedAmount,
              )} will be blocked on "${
                decision?.recruitment.signedPayload?.fundHead
              }" and the request sent back to DRRD.`
            : "The request will be sent back to DRRD with your remarks."
        }
        confirmLabel={decision?.action.label}
        showReason
        reasonLabel="Remarks"
        requireReason={decision?.action.action === "FUND_NOT_AVAILABLE"}
        submitting={submitting}
        onClose={() => setDecision(null)}
        onConfirm={submitDecision}
      />
    </div>
  );
}
