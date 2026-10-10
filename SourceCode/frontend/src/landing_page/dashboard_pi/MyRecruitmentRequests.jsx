import { useEffect, useState } from "react";
import { axiosInstance } from "../../config/api";
import BackButton from "../../components/BackButton";
import WorkflowTracker from "../../components/WorkflowTracker";
import { STAGE_LABELS } from "../../utils/recruitmentWorkflow";

// PI view of recruitment requests moving through
// DRRD -> R&D -> DRRD -> DORD -> DRRD -> PI

const formatAmount = (value) => `₹${Number(value || 0).toLocaleString()}`;

const getBadgeColor = (status) => {
  switch (status) {
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

          // Latest rejection remark from DRRD, R&D or DORD
          const rejection = [...(request.history || [])]
            .reverse()
            .find((entry) =>
              ["REJECT", "REJECTED", "FUND_NOT_AVAILABLE"].includes(
                entry.action,
              ),
            );

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
                      sent ? request.status : "Pending",
                    )}`}
                  >
                    {sent ? request.status : "In Progress"}
                  </span>

                  <p className="text-sm text-blue-700 mt-2">
                    {STAGE_LABELS[request.stage] || request.stage}
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
