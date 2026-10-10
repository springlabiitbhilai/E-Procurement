import { useEffect, useState } from "react";
import { axiosInstance } from "../../config/api";
import { Link } from "react-router-dom";
import BackButton from "../../components/BackButton";

const STEPS = ["1. PI Submitted", "2. R&D Review", "3. Decision"];

const formatDateTime = (d) => (d ? new Date(d).toLocaleString() : null);

// Which step is "current" and how the last step should look
const getProgress = (status) => {
  switch (status) {
    case "APPROVED":
      return {
        current: 3,
        finalLabel: "3. Approved",
        badge: "Approved",
        badgeStyle: "bg-green-100 text-green-700",
        subText: "Registered with R&D",
        subStyle: "text-green-700",
      };
    case "REJECTED":
      return {
        current: 3,
        finalLabel: "3. Rejected",
        badge: "Rejected",
        badgeStyle: "bg-red-100 text-red-700",
        subText: "Not approved by R&D",
        subStyle: "text-red-600",
      };
    default:
      return {
        current: 2,
        finalLabel: "3. Decision",
        badge: "In Progress",
        badgeStyle: "bg-yellow-100 text-yellow-700",
        subText: "With R&D for review",
        subStyle: "text-blue-600",
      };
  }
};

const stepClass = (index, current, status) => {
  const stepNo = index + 1;
  const base = "px-4 py-1.5 rounded-full text-sm font-semibold";

  if (stepNo < current) return `${base} bg-green-100 text-green-700`;

  if (stepNo === current) {
    if (stepNo === 3 && status === "APPROVED")
      return `${base} bg-green-600 text-white`;
    if (stepNo === 3 && status === "REJECTED")
      return `${base} bg-red-600 text-white`;
    return `${base} bg-blue-600 text-white`;
  }

  return `${base} bg-gray-100 text-gray-500`;
};

export default function ProjectRegistrationStatus() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await axiosInstance.get("/api/projects/registration-status");
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#d6e3da] p-6">
      <BackButton/>
      <h2 className="text-4xl font-bold text-gray-900 mb-8">
        My Project Registrations
      </h2>

      {loading && <p className="text-gray-600">Loading...</p>}

      {!loading && projects.length === 0 && (
        <div className="bg-white rounded-2xl p-10 text-center shadow">
          <p className="text-gray-500">No project registrations yet.</p>
        </div>
      )}

      <div className="grid gap-6">
        {projects.map((project) => {
          const payload = project.piSubmission?.signedPayload || {};
          const status = (project.piSubmission?.status || "PENDING").toUpperCase();
          const decision = project.rndDecision || {};
          const progress = getProgress(status);

          const subtitle = [
            decision.signedPayload?.projectCode,
            payload.department,
            payload.totalFundReceived
              ? `₹${Number(payload.totalFundReceived).toLocaleString()}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <div
              key={project._id}
              className="bg-white rounded-3xl shadow p-8"
            >
              {/* Top row: title + status */}
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {payload.title || "Untitled Project"}
                  </h3>
                  <p className="mt-1 text-gray-500">
                    {subtitle || "Project code pending"}
                  </p>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold ${progress.badgeStyle}`}
                  >
                    {progress.badge}
                  </span>
                  <p className={`mt-2 ${progress.subStyle}`}>
                    {progress.subText}
                  </p>
                </div>
              </div>

              {/* Step tracker */}
              <div className="flex flex-wrap gap-3 mt-6">
                {STEPS.map((label, i) => (
                  <span
                    key={label}
                    className={stepClass(i, progress.current, status)}
                  >
                    {i === 2 ? progress.finalLabel : label}
                  </span>
                ))}
              </div>

              {/* Timeline / remarks */}
              <div className="mt-6 space-y-3">
                <div className="border-l-4 border-blue-200 pl-4">
                  <p className="text-gray-900">
                    <span className="font-semibold">PI</span>: Submitted
                    <span className="text-gray-400 text-sm">
                      {" "}
                      · {formatDateTime(project.piSubmission?.timestamp) || "N/A"}
                    </span>
                  </p>
                </div>

                {status === "APPROVED" && (
                  <div className="border-l-4 border-green-300 pl-4">
                    <p className="text-gray-900">
                      <span className="font-semibold">R&amp;D</span>: Approved
                      <span className="text-gray-400 text-sm">
                        {" "}
                        · {formatDateTime(decision.actionAt) || "N/A"}
                      </span>
                    </p>
                    {decision.signedPayload?.projectCode ? (
                      <p className="text-gray-700 pt-1">
                        Project Code:{" "}
                        <span className="font-bold">{decision.signedPayload?.projectCode}</span>
                      </p>
                    ) : (
                      <p className="text-gray-500">
                        Project code will appear here once assigned.
                      </p>
                    )}
                     <p className="text-green-700 text-sm mt-1">
      <Link
        to="/pi-dashboard"
        className="font-semibold text-blue-600 underline hover:text-blue-800"
      >
        Go to Dashboard
      </Link>{" "}
      for fund booking.
    </p>
                  </div>
                )}

                {status === "REJECTED" && (
                  <div className="border-l-4 border-red-300 pl-4">
                    <p className="text-gray-900">
                      <span className="font-semibold">R&amp;D</span>: Rejected
                      <span className="text-gray-400 text-sm">
                        {" "}
                        · {formatDateTime(decision.actionAt) || "N/A"}
                      </span>
                    </p>
                    <p className="text-gray-700">
                      Remarks: {decision.rejectionReason || "No reason provided"}
                    </p>
                  </div>
                )}

                {status === "PENDING" && (
                  <div className="border-l-4 border-yellow-300 pl-4">
                    <p className="text-gray-700">
                      Waiting for R&amp;D decision. Your project code will appear
                      here once approved.
                    </p>
                  </div>
                )}
              </div>

              {/* Links */}
              <div className="flex gap-5 mt-6">
                {project.piSubmission?.attachmentUrl && (
                  <a
                    href={project.piSubmission.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Submitted PDF
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