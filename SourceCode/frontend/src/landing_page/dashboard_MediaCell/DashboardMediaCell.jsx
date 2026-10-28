import { useEffect, useState } from "react";
import { axiosInstance } from "../../config/api";
import {
  readPem,
  importPrivateKey,
  signData,
  canonicalPayload,
} from "../../utils/digitalSignature";
import { STAGE_LABELS } from "../../utils/recruitmentWorkflow";
import DecisionModal from "../../components/DecisionModel";
import WorkflowTracker from "../../components/WorkflowTracker";
import PreviousSignaturesCheck from "../../components/PreviousSignaturesCheck";
import { usePreviousSignatureChecks } from "../../utils/useHistoryVerification";

// MEDIA CELL - last desk of the recruitment workflow:
// ... -> DRRD (dispatch) -> PI + MEDIA CELL (web upload) -> PUBLISHED

const FILTERS = [
  { key: "Pending", label: "Pending Upload" },
  { key: "Published", label: "Published" },
  { key: "All", label: "All" },
];

const awaitingUpload = (r) => r.stage === "MEDIA_PUBLISH";

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString() : "-";

const getPublishEntry = (r) =>
  r.history?.find(
    (h) => h.stage === "MEDIA_PUBLISH" && h.action === "PUBLISHED",
  );

const getBadge = (r) =>
  awaitingUpload(r)
    ? { label: "Pending upload", color: "bg-yellow-100 text-yellow-700" }
    : { label: "Published", color: "bg-green-100 text-green-700" };

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

export default function DashboardMediaCell() {
  const [recruitments, setRecruitments] = useState([]);
  const [filter, setFilter] = useState("Pending");
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState(null); // request being published
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

      const res = await axiosInstance.get(`/api/recruitment/media/requests`);

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
  // FILTER + SEARCH
  // ======================================

  const query = search.trim().toLowerCase();

  const filteredRecruitments = recruitments.filter((r) => {
    if (filter === "Pending" && !awaitingUpload(r)) return false;
    if (filter === "Published" && r.stage !== "PUBLISHED") return false;

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

  // Every earlier signature (PI, DRRD, R&D, Dean, DRRD) of requests
  // waiting for upload
  const chainChecks = usePreviousSignatureChecks(
    recruitments.filter(awaitingUpload),
  );

  const toggleExpanded = (id) =>
    setExpandedId((current) => (current === id ? null : id));

  // ======================================
  // MARK AS PUBLISHED (signed by the Media Cell)
  // ======================================

  const submitPublish = async ({ privateKeyFile, reason }) => {
    const recruitment = target;

    try {
      setSubmitting(true);

      if (!recruitment.formHash) {
    throw new Error("Please refresh the dashboard and try again.");
  }

      const payload = canonicalPayload({
        recruitmentId: recruitment._id,
        projectCode: recruitment.signedPayload?.projectCode,
        formHash: recruitment.formHash,   // from the server
        action: "PUBLISHED",
        signedBy: "Media Cell",
        timestamp: new Date().toISOString(),
      });

      const pem = await readPem(privateKeyFile);
      const privateKey = await importPrivateKey(pem);
      const signature = await signData(privateKey, payload);

      await axiosInstance.put(
        `/api/recruitment/${recruitment._id}/media-action`,
        {
          action: "PUBLISHED",
          remarks: reason || "",
          payload,
          signature,
        },
      );

      alert("Marked as published");

      setTarget(null);
      fetchData();
    } catch (err) {
      console.error(err);

      alert(
        err.response?.data?.message || err.message || "Failed to mark published",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const targetProject = target?.signedPayload;

  return (
    <div className="min-h-screen bg-[#d6e3da] p-4 sm:p-6">
      {/* Header */}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">
            Media Cell Dashboard
          </h1>

          <p className="text-gray-500">
            Download approved recruitment advertisements for web upload
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

      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard
          label="Pending Upload"
          value={recruitments.filter(awaitingUpload).length}
          color="text-yellow-600"
        />
        <StatCard
          label="Published"
          value={recruitments.filter((r) => r.stage === "PUBLISHED").length}
          color="text-green-600"
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

      {/* Requests */}

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
                const pending = awaitingUpload(recruitment);
                const badge = getBadge(recruitment);
                const publishEntry = getPublishEntry(recruitment);

                // Publishing is only allowed once every earlier
                // signature verifies
                const chainCheck = chainChecks[recruitment._id];
                const publishDisabled = chainCheck?.status !== "valid";

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
                        className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${badge.color}`}
                      >
                        {badge.label}
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
                        <span className="font-semibold">Interview:</span>{" "}
                        {data.interviewDate || "-"}
                        {data.interviewMode && ` (${data.interviewMode})`}
                      </p>

                      <p>
                        <span className="font-semibold">Received:</span>{" "}
                        {formatDate(recruitment.updatedAt)}
                      </p>

                      {publishEntry && (
                        <p className="text-green-700">
                          <span className="font-semibold">Published on:</span>{" "}
                          {formatDate(publishEntry.at)}
                          {publishEntry.by && ` by ${publishEntry.by}`}
                        </p>
                      )}
                    </div>

                    {/* Files to upload on the website */}

                    <div className="flex flex-wrap gap-3 mt-4">
                      {recruitment.recruitmentAdPath && (
                        <a
                          href={recruitment.recruitmentAdPath}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                        >
                          Download Advertisement
                        </a>
                      )}

                      {recruitment.signedApprovalPdf && (
                        <a
                          href={recruitment.signedApprovalPdf}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                        >
                          Download Approval Letter
                        </a>
                      )}
                    </div>

                    {expanded && (
                      <div className="mt-4 border-t pt-4 space-y-2 text-sm">
                        <WorkflowTracker recruitment={recruitment} />

                        <p className="font-semibold pt-2">Positions:</p>

                        <ul className="space-y-1">
                          {(data.positions || []).map((position, index) => (
                            <li
                              key={`${position.positionName}-${index}`}
                              className="text-gray-700"
                            >
                              {position.positionName} × {position.numberOfPosts}{" "}
                              ({position.duration})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {pending && (
                      <>
                        <div className="mt-4">
                          <PreviousSignaturesCheck check={chainCheck} />
                        </div>

                        <button
                          disabled={publishDisabled}
                          title={
                            publishDisabled
                              ? "Previous signatures not verified"
                              : ""
                          }
                          onClick={() => setTarget(recruitment)}
                          className={`w-full mt-4 px-3 py-2 rounded-lg text-sm font-medium text-white transition ${
                            publishDisabled
                              ? "bg-gray-300 cursor-not-allowed"
                              : "bg-green-600 hover:bg-green-700"
                          }`}
                        >
                          Mark as Published
                        </button>
                      </>
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
        open={Boolean(target)}
        type="approve"
        title="Confirm Web Upload"
        description={`${targetProject?.projectTitle || ""} (${
          targetProject?.projectCode || ""
        }). Upload your signing key to digitally sign that the advertisement is published on the website.`}
        confirmLabel="Sign & Mark Published"
        showReason
        requireReason={false}
        reasonLabel="Remarks / live page link (optional)"
        requirePdf={false}
        submitting={submitting}
        onClose={() => setTarget(null)}
        onConfirm={submitPublish}
      />
    </div>
  );
}