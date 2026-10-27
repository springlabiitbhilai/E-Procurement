import { useEffect, useState } from "react";
import { axiosInstance } from "../../config/api";
import BackButton from "../../components/BackButton";
import WorkflowTracker from "../../components/WorkflowTracker";
import { STAGE_LABELS } from "../../utils/recruitmentWorkflow";

// PI view of recruitment requests moving through
// DRRD -> R&D -> DRRD -> DORD -> DRRD -> PI, then published by the media cell

const formatAmount = (value) => `₹${Number(value || 0).toLocaleString()}`;

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString() : "";

// Only allow normal web links to be shown as clickable links
const isWebUrl = (url) => /^https?:\/\//i.test(url || "");

const getBadgeColor = (status) => {
  switch (status) {
    case "Published":
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
          const sent = request.stage === "SENT_TO_PI";
          const approved = sent && request.status === "Approved";

          // Set by the media cell once the advertisement is live on the website
          const published = approved && Boolean(request.publication?.publishedAt);

          // Latest rejection remark from DRRD, R&D or DORD
          const rejection = [...(request.history || [])]
            .reverse()
            .find((entry) =>
              ["REJECT", "REJECTED", "FUND_NOT_AVAILABLE"].includes(
                entry.action,
              ),
            );

          // What the badge shows
          const badgeText = published
            ? "Published"
            : sent
              ? request.status
              : "In Progress";

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
                      published
                        ? "Published"
                        : sent
                          ? request.status
                          : "Pending",
                    )}`}
                  >
                    {badgeText}
                  </span>

                  <p className="text-sm text-blue-700 mt-2">
                    {published
                      ? "Live on the website"
                      : approved
                        ? "Awaiting publication by media cell"
                        : STAGE_LABELS[request.stage] || request.stage}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <WorkflowTracker recruitment={request} />
              </div>

              {sent && request.status === "Rejected" && rejection?.remarks && (
                <p className="mt-4 bg-red-50 text-red-700 rounded-lg p-3 text-sm">
                  <span className="font-semibold">Reason:</span>{" "}
                  {rejection.remarks}
                </p>
              )}

              {/* Approved, waiting for the media cell */}
              {approved && !published && (
                <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                  <p className="font-semibold">
                    All approvals are complete.
                  </p>
                  <p className="mt-1">
                    The media cell receives the approved advertisement from the
                    system and will publish it on the website. The link will
                    appear here once it is live.
                  </p>
                </div>
              )}

              {/* Published by the media cell */}
              {published && (
                <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                  <p className="font-semibold">
                    Published on {formatDate(request.publication.publishedAt)}
                  </p>

                  {isWebUrl(request.publication.websiteUrl) ? (
                    <a
                      href={request.publication.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-blue-700 underline break-all"
                    >
                      View on the website
                    </a>
                  ) : (
                    <p className="mt-1">
                      The media cell has published this advertisement.
                    </p>
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

                {sent && request.signedApprovalPdf && (
                  <a
                    href={request.signedApprovalPdf}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary"
                  >
                    Download Signed Approval
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
