import { useEffect, useState } from "react";
import { axiosInstance } from "../../config/api";
import BackButton from "../../components/BackButton";
import { STAGE_LABELS } from "../../utils/recruitmentWorkflow";
import PreviousSignaturesCheck from "../../components/PreviousSignaturesCheck";
import { usePreviousSignatureChecks } from "../../utils/useHistoryVerification";

// PI view of recruitment requests:
// PI -> DRRD -> R&D -> DRRD -> DORD -> DRRD -> (PI + MEDIA CELL) -> PUBLISHED

const formatAmount = (value) => `₹${Number(value || 0).toLocaleString()}`;

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString() : "";

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString() : "";

// What each signed action is called in the timeline
const ACTION_LABEL = {
  SUBMITTED: "Submitted",
  FORWARD: "Forwarded",
  REJECT: "Rejected",
  FUND_AVAILABLE: "Fund available",
  FUND_NOT_AVAILABLE: "Fund not available",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SEND_TO_PI: "Sent to PI",
  PUBLISHED: "Uploaded to website",
};

// Only allow normal web links to be shown as clickable links
const isWebUrl = (url) => /^https?:\/\//i.test((url || "").trim());

// ---------------------------------------------------------------------------
// Progress steps
// ---------------------------------------------------------------------------

const STEPS = [
  "PI Submitted",
  "DRRD Verification",
  "R&D Fund Check",
  "DRRD Review",
  "DORD Approval",
  "DRRD Dispatch",
  "Sent to PI & Media Cell",
  "Website Upload",
];

// Which step is current for each stage (1-based).
// PUBLISHED is 9: every step is complete.
const STAGE_STEP = {
  DRRD_VERIFICATION: 2,
  RND_FUND_CHECK: 3,
  DRRD_REVIEW: 4,
  DORD_APPROVAL: 5,
  DRRD_DISPATCH: 6,
  MEDIA_PUBLISH: 8,
  PUBLISHED: 9,
};

// Step at which a rejection can happen, by the stage stored in the history
const REJECT_STEP = {
  DRRD_VERIFICATION: 2,
  DRRD_REVIEW: 4,
  DORD_APPROVAL: 5,
};

// Stages from which the PI may see the final decision and files
const DISPATCHED = ["SENT_TO_PI", "MEDIA_PUBLISH", "PUBLISHED"];

const STAGE_TEXT = {
  MEDIA_PUBLISH: "Waiting for the media cell to upload it to the website",
  PUBLISHED: "Live on the website",
};

const buildSteps = (request, rejection) => {
  const { stage, status } = request;

  // Rejected: show the steps up to where it stopped
  if (stage === "SENT_TO_PI" && status === "Rejected") {
    const at = REJECT_STEP[rejection?.stage] || 6;

    return STEPS.slice(0, at).map((label, i) =>
      i + 1 < at
        ? { label, state: "done" }
        : { label: `Rejected at ${label}`, state: "rejected" },
    );
  }

  // Approved before the media cell step existed
  if (stage === "SENT_TO_PI") {
    return STEPS.slice(0, 7).map((label) => ({ label, state: "done" }));
  }

  const current = STAGE_STEP[stage] || 2;

  return STEPS.map((label, i) => ({
    label,
    state:
      i + 1 < current ? "done" : i + 1 === current ? "current" : "pending",
  }));
};

const STEP_STYLE = {
  done: "bg-green-100 text-green-700",
  current: "bg-blue-600 text-white",
  pending: "bg-gray-100 text-gray-500",
  rejected: "bg-red-600 text-white",
};

function ProgressSteps({ steps }) {
  return (
    <ol aria-label="Request progress" className="flex flex-wrap gap-2">
      {steps.map((step, index) => (
        <li
          key={step.label}
          aria-current={step.state === "current" ? "step" : undefined}
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            STEP_STYLE[step.state]
          }`}
        >
          {step.state === "done" && "✓ "}
          {index + 1}. {step.label}
        </li>
      ))}
    </ol>
  );
}

const getBadgeColor = (label) => {
  switch (label) {
    case "Live on Website":
      return "bg-blue-100 text-blue-700";

    case "Approved":
      return "bg-green-100 text-green-700";

    case "Rejected":
      return "bg-red-100 text-red-700";

    default:
      return "bg-yellow-100 text-yellow-700";
  }
};

export default function MyRecruitmentRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await axiosInstance.get(`/api/recruitment/my-requests`);

        setRequests(res.data);
      } catch (err) {
        console.error(err);

        alert(err.response?.data?.message || "Failed to fetch requests");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  // Re-verifies every signed step of each request (same check the other
  // dashboards use). Must stay above the early return below.
  const signatureChecks = usePreviousSignatureChecks(requests) || {};

  if (loading) {
    return <p className="p-10">Loading...</p>;
  }

  return (
    <div className="min-h-screen bg-[#d6e3da] p-4 sm:p-6 md:p-8">
      <BackButton />

      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">
        My Recruitment Requests
      </h1>

      {requests.length === 0 && (
        <div className="bg-white rounded-xl p-10 text-center shadow">
          <p className="text-gray-500">No recruitment requests yet.</p>
        </div>
      )}

      <div className="grid gap-6">
        {requests.map((request) => {
          const stage = request.stage;

          const dispatched = DISPATCHED.includes(stage);
          const rejected = stage === "SENT_TO_PI" && request.status === "Rejected";
          const awaitingUpload = stage === "MEDIA_PUBLISH";
          const published = stage === "PUBLISHED";
          const approved = awaitingUpload || published || (dispatched && !rejected);

          // Latest rejection remark from DRRD, R&D or DORD
          const rejection = [...(request.history || [])]
            .reverse()
            .find((entry) =>
              ["REJECT", "REJECTED", "FUND_NOT_AVAILABLE"].includes(
                entry.action,
              ),
            );

          // Media cell's signed "published" entry
          const publishEntry = (request.history || []).find(
            (entry) =>
              entry.stage === "MEDIA_PUBLISH" && entry.action === "PUBLISHED",
          );
          const publishNote = (publishEntry?.remarks || "").trim();

          const badgeText = published
            ? "Live on Website"
            : rejected
              ? "Rejected"
              : approved
                ? "Approved"
                : "In Progress";

          const steps = buildSteps(request, rejection);

          return (
            <div key={request._id} className="bg-white rounded-2xl shadow p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {request.signedPayload?.projectTitle}
                  </h2>

                  <p className="text-sm text-gray-500">
                    {request.signedPayload?.projectCode} ·{" "}
                    {request.signedPayload?.fundHead} ·{" "}
                    {formatAmount(request.signedPayload?.requestedAmount)}
                  </p>
                </div>

                <div className="text-right">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getBadgeColor(
                      badgeText,
                    )}`}
                  >
                    {badgeText}
                  </span>

                  <p className="text-sm text-blue-700 mt-2">
                    {STAGE_TEXT[stage] || STAGE_LABELS[stage] || stage}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <ProgressSteps steps={steps} />
              </div>

              {/* Who signed each step, and when */}
              {(request.history || []).length > 0 && (
                <ul aria-label="Signed steps" className="mt-4 space-y-2 text-sm">
                  {request.history.map((entry, index) => (
                    <li
                      key={`${entry.stage}-${entry.action}-${index}`}
                      className="border-l-4 border-blue-200 pl-3"
                    >
                      <p className="text-gray-900">
                        <span className="font-semibold">{entry.role}</span> (
                        {entry.by}):{" "}
                        {ACTION_LABEL[entry.action] || entry.action}
                        <span className="text-gray-400">
                          {" "}
                          · {formatDateTime(entry.at)}
                        </span>
                      </p>

                      {entry.remarks && (
                        <p className="text-gray-600">
                          Remarks: {entry.remarks}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {/* Signature verification result for every step above */}
              {(request.history || []).length > 0 && (
                <div className="mt-3">
                  <PreviousSignaturesCheck check={signatureChecks[request._id]} />
                </div>
              )}

              {rejected && rejection?.remarks && (
                <p className="mt-4 bg-red-50 text-red-700 rounded-lg p-3 text-sm">
                  <span className="font-semibold">Reason:</span>{" "}
                  {rejection.remarks}
                </p>
              )}

              {/* Approved: files are with the PI and the media cell */}
              {awaitingUpload && (
                <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                  <p className="font-semibold">All approvals are complete.</p>
                  <p className="mt-1">
                    The approved files are with you and with the media cell. You
                    do not need to send them. The media cell uploads the
                    advertisement to the website, and this page updates when it
                    is live.
                  </p>
                </div>
              )}

              {/* Published by the media cell */}
              {published && (
                <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                  <p className="font-semibold">Live on the website</p>

                  {(publishEntry?.at || publishEntry?.by) && (
                    <p className="mt-1">
                      Uploaded by the media cell
                      {publishEntry?.by && ` (${publishEntry.by})`}
                      {publishEntry?.at &&
                        ` on ${formatDate(publishEntry.at)}`}
                      .
                    </p>
                  )}

                  {isWebUrl(publishNote) ? (
                    <a
                      href={publishNote}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-blue-700 underline break-all"
                    >
                      View on the website
                    </a>
                  ) : (
                    publishNote && (
                      <p className="mt-1">
                        <span className="font-semibold">Note:</span>{" "}
                        {publishNote}
                      </p>
                    )
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-4 mt-5 text-sm">
                {request.recruitmentAdPath && (
                  <a
                    href={request.recruitmentAdPath}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Advertisement
                  </a>
                )}

                {request.approvalLetterPath && (
                  <a
                    href={request.approvalLetterPath}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Approval Letter
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
