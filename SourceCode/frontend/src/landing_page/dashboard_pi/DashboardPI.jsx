import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { axiosInstance } from "../../config/api";

// A project counts as "newly approved" if the PI hasn't seen it on this
// dashboard before AND it was approved within this many days.
const NEW_WINDOW_DAYS = 7;

const PROCESSES = [
  { name: "No Dues Process", icon: "🧾" },
  { name: "Leave Approval", icon: "🏖️" },
  { name: "NOC", icon: "📄" },
  { name: "Reimbursement", icon: "💳" },
  { name: "Advance", icon: "💰" },
  { name: "Attendance", icon: "🗓️" },
];

const normalize = (str) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const readSeen = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
};

const writeSeen = (key, ids) => {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    /* storage unavailable, ignore */
  }
};

const isRecent = (date) => {
  if (!date) return false;
  const ageMs = Date.now() - new Date(date).getTime();
  return ageMs <= NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
};

const formatMoney = (n) =>
  n || n === 0 ? `₹${Number(n).toLocaleString("en-IN")}` : "—";

const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : null);

export default function DashboardPI() {
  const navigate = useNavigate();

  const fullName = localStorage.getItem("name");
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  })();

  // "Seen" list is stored per PI so two users on one browser don't clash
  const seenKey = `pi-seen-approved:${user?.email || user?.employeeId || fullName}`;

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchCode, setSearchCode] = useState("");
  const [newIds, setNewIds] = useState([]);
  const [bannerOpen, setBannerOpen] = useState(true);

  // Fetch approved projects and work out which ones are new
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await axiosInstance.get(`/api/projects/approved`, {});
        const data = res.data || [];
        setProjects(data);

        const seen = readSeen(seenKey);

        const fresh = data
          .filter(
            (p) => !seen.includes(p._id) && isRecent(p.rndDecision?.actionAt),
          )
          .map((p) => p._id);

        // Guard: only set when there is something new, so a second run of
        // this effect (React StrictMode in dev) can't wipe the result.
        if (fresh.length) setNewIds(fresh);

        // Mark everything as seen, so the badge shows this visit only
        writeSeen(seenKey, [...new Set([...seen, ...data.map((p) => p._id)])]);
      } catch (err) {
        console.error("Error fetching projects:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [seenKey]);

  // Search by project code, newest approvals first
  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) =>
        normalize(p.rndDecision?.signedPayload?.projectCode).includes(normalize(searchCode)),
      )
      .sort((a, b) => {
        const aNew = newIds.includes(a._id) ? 1 : 0;
        const bNew = newIds.includes(b._id) ? 1 : 0;
        if (aNew !== bNew) return bNew - aNew;
        return (
          new Date(b.rndDecision?.actionAt || 0) -
          new Date(a.rndDecision?.actionAt || 0)
        );
      });
  }, [projects, searchCode, newIds]);

  const newProjects = projects.filter((p) => newIds.includes(p._id));

  return (
    <div className="min-h-screen bg-[#d6e3da] p-4 sm:p-6 md:p-8">
      {/* HERO / HEADER */}
      <div className="rounded-3xl bg-[#12455a] text-white shadow-lg p-6 md:p-8 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">
              Welcome, <span className="text-emerald-300">{fullName}</span> 👋
            </h1>
            <p className="text-white/70 mt-2">
              Manage your projects and fund processes efficiently
            </p>
          </div>

          {/* Search */}
          <div className="flex items-center bg-white rounded-full px-4 py-2 w-full lg:w-80 shadow">
            <span className="text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search project by code"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              className="flex-1 outline-none text-sm px-2 text-gray-800 bg-transparent"
            />
            {searchCode && (
              <button
                onClick={() => setSearchCode("")}
                className="text-gray-400 hover:text-gray-600 text-sm"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-3 mt-6">
          <button
            onClick={() => navigate("/projects")}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 font-medium transition"
          >
            + New Project Registration &amp; Fund Bifurcation
          </button>
          <button
            onClick={() => navigate("/project-registration-status")}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 font-medium transition"
          >
            📋 Registration Status
          </button>
          <button
            onClick={() => navigate("/my-recruitment-requests")}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 font-medium transition"
          >
            👥 Recruitment Requests
          </button>
          <button
            onClick={() => navigate("/pi-fund-requests")}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 font-medium transition"
          >
            💸 Fund Booking Status
          </button>
        </div>
      </div>

      {/* NEWLY APPROVED BANNER */}
      {newProjects.length > 0 && bannerOpen && (
        <div className="mb-6 flex items-start gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 md:p-5 shadow-sm">
          <div className="flex-1">
            <p className="font-semibold text-amber-900">
              {newProjects.length === 1
                ? "Your project was approved by R&D"
                : `${newProjects.length} of your projects were approved by R&D`}
            </p>
            <p className="text-sm text-amber-800 mt-1">
              {newProjects
                .map((p) => p.rndDecision?.signedPayload?.projectCode)
                .filter(Boolean)
                .join(", ")}
              {" · "}You can now book funds against{" "}
              {newProjects.length === 1 ? "it" : "them"}.
            </p>
          </div>
          <button
            onClick={() => setBannerOpen(false)}
            className="text-amber-700 hover:text-amber-900 text-lg leading-none"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}


      {/* APPROVED PROJECT LIST */}
      <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-5 text-gray-800">
        Approved Projects for Fund Booking
      </h2>

      {loading ? (
        <p className="text-gray-500">Loading projects...</p>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-10 text-center">
          <p className="text-gray-500">
            {searchCode
              ? "No project matches that code."
              : "No approved projects yet. Register a project and it will appear here once R&D approves it."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((proj) => {
            const payload = proj.piSubmission?.signedPayload || {};
            const decision = proj.rndDecision || {};
            const isNew = newIds.includes(proj._id);

            return (
              <div
                key={proj._id}
                className={`relative bg-white rounded-2xl shadow overflow-hidden hover:shadow-xl transition ${
                  isNew ? "ring-2 ring-amber-400" : ""
                }`}
              >
                {/* Accent bar */}
                <div
                  className={`h-1.5 ${isNew ? "bg-amber-400" : "bg-emerald-500"}`}
                />

                <div className="p-6">
                  {/* NEW badge */}
                  {isNew && (
                    <span className="absolute top-4 right-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                      </span>
                      Newly approved
                    </span>
                  )}

                  <h3 className="text-xl font-bold text-gray-800 pr-28">
                    {payload.title || "Untitled Project"}
                  </h3>

                  {/* Project code pill */}
                  <p className="mt-3 inline-block rounded-lg bg-gray-100 px-3 py-1 text-sm font-mono text-gray-700">
                    {decision.signedPayload.projectCode}
                  </p>

                  {/* Details */}
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-400">Department</p>
                      <p className="font-medium text-gray-700">
                        {payload.department || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Total fund</p>
                      <p className="font-medium text-gray-700">
                        {formatMoney(payload.totalFundReceived)}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-400">Approved on</p>
                      <p className="font-medium text-gray-700">
                        {formatDate(decision.actionAt) || "—"}
                      </p>
                    </div>
                  </div>

                  {/* Status */}
                  <span className="mt-4 inline-block px-3 py-1 text-xs rounded-full bg-green-100 text-green-700 font-medium">
                    Approved ✔
                  </span>

                  {/* Actions */}
                  <div className="mt-5 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => navigate(`/summary/${proj._id}`)}
                      className="border border-[#aec3b0] px-4 py-2 rounded-lg hover:bg-[#aec3b0] hover:text-black transition w-full sm:w-auto"
                    >
                      View Summary
                    </button>

                    <button
                      onClick={() => navigate(`/fund-booking/${proj._id}`)}
                      className="btn-primary w-full sm:w-auto"
                    >
                      Fund Booking
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* GENERAL PROCESSES */}
      <div className="mt-12">
        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 mb-5">
          General Processes
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {PROCESSES.map(({ name, icon }) => (
            <button
              key={name}
              onClick={() => navigate(`/independent-process?process=${name}`)}
              className="bg-white rounded-2xl shadow p-5 text-center hover:shadow-lg hover:-translate-y-0.5 hover:bg-blue-50 transition"
            >
              <div className="text-3xl mb-2">{icon}</div>
              <p className="font-semibold text-gray-700 text-sm">{name}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
