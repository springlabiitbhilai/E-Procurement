import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../../config/api";
import { getProjectData } from "../../utils/projectData";
import RndFundCheckList from "./RndFundCheckList";

// Same endpoint RndFundCheckList uses. Pending = stage "RND_FUND_CHECK"
const RECRUITMENT_URL = "/api/recruitment";

// How often the badges refresh on their own (ms)
const REFRESH_MS = 60000;

// Red count bubble
const CountBadge = ({ count }) =>
  count > 0 ? (
    <span className="ml-2 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-600 text-white text-xs font-bold animate-pulse">
      {count > 99 ? "99+" : count}
    </span>
  ) : null;

// The R&D signed payload (string or object) -> object
const getRndPayload = (project) => {
  const p = project?.rndDecision?.signedPayload;
  if (!p) return null;
  try {
    return typeof p === "string" ? JSON.parse(p) : p;
  } catch {
    return null;
  }
};

// Works whether the API returns an array or { data: [...] }
const countItems = (data) =>
  Array.isArray(data) ? data.length : Array.isArray(data?.data) ? data.data.length : 0;

export default function DashboardRND() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState("PENDING");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("projects");

  // Pending-approval counts shown as alert badges
  const [pending, setPending] = useState({ projects: 0, fundCheck: 0 });

  const fetchProjects = async (selectedStatus = "PENDING") => {
    try {
      setLoading(true);

      const res = await axiosInstance.get(
        `/api/projects?status=${selectedStatus}`
      );

      setProjects(res.data);

      // The list we just loaded is the pending list, so keep the badge in sync
      if (selectedStatus === "PENDING") {
        setPending((prev) => ({ ...prev, projects: res.data.length }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch both pending counts. One failing request does not break the other.
  const fetchPendingCounts = async () => {
    const [proj, fund] = await Promise.allSettled([
      axiosInstance.get("/api/projects?status=PENDING"),
      axiosInstance.get(RECRUITMENT_URL),
    ]);

    setPending((prev) => ({
      projects:
        proj.status === "fulfilled" ? countItems(proj.value.data) : prev.projects,
      fundCheck:
        fund.status === "fulfilled"
          ? (fund.value.data?.recruitments || []).filter(
              (r) => r.stage === "RND_FUND_CHECK",
            ).length
          : prev.fundCheck,
    }));
  };

  useEffect(() => {
    fetchProjects(status);
    fetchPendingCounts();

    // Keep badges fresh while the dashboard stays open
    const timer = setInterval(fetchPendingCounts, REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  // Refresh counts when switching tabs (e.g. after deciding a fund check)
  useEffect(() => {
    fetchPendingCounts();
  }, [view]);

  const getBadgeColor = (status) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-700";

      case "REJECTED":
        return "bg-red-100 text-red-700";

      default:
        return "bg-yellow-100 text-yellow-700";
    }
  };

  const totalPending = pending.projects + pending.fundCheck;

  return (
    <div className="min-h-screen bg-[#d6e3da] p-6">
      {/* Header */}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-800">R&D Dashboard</h1>

          <p className="text-gray-500">
            Verify project registrations and recruitment fund availability
          </p>
        </div>
      </div>

      {/* Pending approvals alert */}

      {totalPending > 0 && (
        <div className="mb-6 p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="font-semibold">
            ⚠ You have {totalPending} pending approval
            {totalPending > 1 ? "s" : ""}:
          </span>

          {pending.projects > 0 && (
            <button
              onClick={() => {
                setView("projects");
                setStatus("PENDING");
                fetchProjects("PENDING");
              }}
              className="underline font-medium hover:text-amber-700"
            >
              {pending.projects} project registration
              {pending.projects > 1 ? "s" : ""}
            </button>
          )}

          {pending.fundCheck > 0 && (
            <button
              onClick={() => setView("fundCheck")}
              className="underline font-medium hover:text-amber-700"
            >
              {pending.fundCheck} recruitment fund check
              {pending.fundCheck > 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}

      {/* View Tabs */}

      <div className="flex gap-3 mb-6 border-b border-gray-300 pb-4">
        {[
          {
            key: "projects",
            label: "Project Registrations",
            count: pending.projects,
          },
          {
            key: "fundCheck",
            label: "Recruitment Fund Check",
            count: pending.fundCheck,
          },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setView(item.key)}
            className={`px-5 py-2 rounded-lg font-semibold transition flex items-center ${
              view === item.key ? "bg-gray-800 text-white" : "bg-white border"
            }`}
          >
            {item.label}
            <CountBadge count={item.count} />
          </button>
        ))}
      </div>

      {view === "fundCheck" && (
        <RndFundCheckList onDecision={fetchPendingCounts} />
      )}

      {view === "projects" && (
        <>
          {/* Filter */}

          <div className="flex gap-3 mb-8">
            {["PENDING", "APPROVED", "REJECTED"].map((item) => (
              <button
                key={item}
                onClick={() => {
                  setStatus(item);
                  fetchProjects(item);
                }}
                className={`px-5 py-2 rounded-lg font-medium transition flex items-center ${
                  status === item ? "bg-blue-600 text-white" : "bg-white border"
                }`}
              >
                {item}
                {item === "PENDING" && <CountBadge count={pending.projects} />}
              </button>
            ))}
          </div>

          {/* Loading */}

          {loading && <p className="text-gray-600">Loading...</p>}

          {/* Empty */}

          {!loading && projects.length === 0 && (
            <div className="bg-white rounded-xl p-10 text-center shadow">
              <p className="text-gray-500">
                No {status.toLowerCase()} projects found.
              </p>
            </div>
          )}

          {/* Cards */}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const data = getProjectData(project);
              const rndPayload = getRndPayload(project);

              return (
                <div
                  key={project._id}
                  className="bg-white rounded-2xl shadow p-6 hover:shadow-lg transition"
                >
                  <h2 className="text-xl font-bold text-gray-800">
                    {data.title}
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">{data.department}</p>

                  <div className="mt-4 space-y-2">
                    <p>
                      <span className="font-semibold">PI Name:</span>{" "}
                      {data.piName}
                    </p>

                    <p>
                      <span className="font-semibold">Employee ID:</span>{" "}
                      {data.piEmpId}
                    </p>

                    <p>
                      <span className="font-semibold">Total Fund:</span> ₹
                      {Number(data.totalFundReceived || 0).toLocaleString()}
                    </p>

                    <p>
                      <span className="font-semibold">Submitted:</span>{" "}
                      {new Date(
                        project.piSubmission?.timestamp
                      ).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="mt-5">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getBadgeColor(
                        project.piSubmission?.status
                      )}`}
                    >
                      {project.piSubmission?.status}
                    </span>
                  </div>

                  {project.piSubmission?.status === "APPROVED" &&
                    rndPayload?.projectCode && (
                      <p className="mt-4 text-sm">
                        <span className="font-semibold">Project Code:</span>{" "}
                        {rndPayload.projectCode}
                      </p>
                    )}

                  <button
                    onClick={() => navigate(`/summary/${project._id}`)}
                    className="btn-primary mt-6 w-full"
                  >
                    View Details
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
