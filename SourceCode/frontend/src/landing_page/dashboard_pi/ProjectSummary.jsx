import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import BackButton from "../../components/BackButton";
import { axiosInstance } from "../../config/api";
import DecisionModal from "../../components/DecisionModel";
import signedBadge from "../../../assets/signed-badge.png";
import {
  readPem,
  importPrivateKey,
  signData,
  canonicalPayload,
  sha256Hex,
} from "../../utils/digitalSignature";
import { getProjectData } from "../../utils/projectData";

// Banner showing the result of a signature check
const SigBanner = ({ state, label }) => {
  const styles = {
    checking: "bg-gray-100 border-gray-300 text-gray-600",
    valid: "bg-green-50 border-green-300 text-green-700",
    invalid: "bg-red-50 border-red-300 text-red-700",
  };
  const text = {
    checking: `Verifying ${label}...`,
    valid: `✔ ${label} verified`,
    invalid: `✖ ${label} verification FAILED`,
  };
  return (
    <div className={`mb-4 p-3 rounded-lg border font-semibold ${styles[state]}`}>
      {text[state]}
    </div>
  );
};

const sigText = (state) =>
  state === "valid"
    ? "Verified Signature"
    : state === "checking"
      ? "Verifying..."
      : "Signature verification failed";

const sigBoxStyle = (state) =>
  state === "valid"
    ? "bg-green-50 border-green-300 text-green-700"
    : state === "checking"
      ? "bg-gray-50 border-gray-300 text-gray-600"
      : "bg-red-50 border-red-300 text-red-700";

// R&D's signed payload (string or object) -> object
// Project code and rejection reason live ONLY inside this payload
const getRndPayload = (project) => {
  const p = project?.rndDecision?.signedPayload;
  if (!p) return null;
  try {
    return typeof p === "string" ? JSON.parse(p) : p;
  } catch {
    return null;
  }
};

export default function ProjectSummary() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const role = localStorage.getItem("role");

  const [generatingCode, setGeneratingCode] = useState(false);
  // { projectCode, year, department, sequenceNumber } - kept in state, signed on approve
  const [generated, setGenerated] = useState(null);

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const [selectedProject, setSelectedProject] = useState(null);

  // Signature checks: checking | valid | invalid
  const [piCheck, setPiCheck] = useState("checking");
  const [rndCheck, setRndCheck] = useState(null); // null when no R&D decision yet
  const [rndSignedBy, setRndSignedBy] = useState("");

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await axiosInstance.get(`/api/projects/${id}`, {});
        setProject(res.data);
      } catch (err) {
        alert("Unable to fetch project");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProject();
  }, [id]);

  // Run signature verification once the project is loaded
  useEffect(() => {
    if (!project) return;

    const runChecks = async () => {
      // 1) PI signature (public key comes from the users collection on the server)
      setPiCheck("checking");
      try {
        const r = await axiosInstance.get(`/api/projects/${id}/verify-pi`);
        setPiCheck(r.data.verified ? "valid" : "invalid");
      } catch (err) {
        console.error(err);
        setPiCheck("invalid");
      }

      // 2) R&D signature, only if R&D has already decided
      if (project.rndDecision?.signatureRND) {
        setRndCheck("checking");
        try {
          const r = await axiosInstance.get(`/api/projects/${id}/verify-rnd`);
          setRndCheck(r.data.verified ? "valid" : "invalid");
          setRndSignedBy(r.data.signedBy || "");
        } catch (err) {
          console.error(err);
          setRndCheck("invalid");
        }
      } else {
        setRndCheck(null);
      }
    };

    runChecks();
  }, [project?._id, project?.rndDecision?.signatureRND, id]);

  if (loading) return <p className="p-10 text-gray-700">Loading...</p>;
  if (!project) return <p className="p-10 text-gray-700">No project found</p>;

  const projectData = getProjectData(project);
  const rndPayload = getRndPayload(project);

  // Open File with Tamper Detection
  const openFile = async () => {
    try {
      const res = await axiosInstance.get(`/api/files/${project._id}`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], {
        type: "application/pdf",
      });

      const fileURL = window.URL.createObjectURL(blob);

      window.open(fileURL, "_blank");
    } catch (err) {
      if (err.response?.status === 400) {
        alert("⚠ FILE INTEGRITY COMPROMISED!");
      } else {
        alert(err.response?.data?.message || "Something went wrong");
      }
    }
  };

  // Fetch next sequence from the server and build the code here.
  // Nothing is saved to the DB; the code is only signed when R&D approves.
  const handleGenerateCode = async () => {
    try {
      setGeneratingCode(true);
      const res = await axiosInstance.get(
        `/api/projects/${project._id}/next-sequence`,
      );
      const { year, department, sequenceNumber } = res.data;
      const projectCode = `${year}/${department}/${String(sequenceNumber).padStart(4, "0")}`;
      setGenerated({ projectCode, year, department, sequenceNumber });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to generate code");
    } finally {
      setGeneratingCode(false);
    }
  };

  const approveProject = async (project, privateKeyFile) => {
    try {
      if (!generated) {
        alert("Generate the project code first");
        return;
      }

      // Bind R&D's signature to the exact PI signature being approved
      const piSignatureHash = await sha256Hex(project.piSubmission.signaturePI);

      const payload = canonicalPayload({
        projectId: project._id,
        action: "APPROVED",
        projectCode: generated.projectCode,
        year: generated.year,
        department: generated.department,
        sequenceNumber: generated.sequenceNumber,
        piSignatureHash,
        signedBy: "RND",
        timestamp: new Date().toISOString(),
      });

      const pem = await readPem(privateKeyFile);

      const privateKey = await importPrivateKey(pem);

      const signature = await signData(privateKey, payload);

      await axiosInstance.patch(`/api/projects/${project._id}/approve`, {
        payload,
        signature,
      });

      alert("Project Approved");

      setShowApproveModal(false);
      navigate("/rnd-dashboard");
    } catch (err) {
      console.error(err);
      console.log(err.response?.data);
      if (err.response?.status === 409) {
        // Code is outdated (someone else took it), generate again
        setGenerated(null);
        setShowApproveModal(false);
      }
      alert(err.response?.data?.message || "Approval failed");
    }
  };

  const rejectProject = async (project, privateKeyFile, reason) => {
    try {
      const piSignatureHash = await sha256Hex(project.piSubmission.signaturePI);

      const payload = canonicalPayload({
        projectId: project._id,
        action: "REJECTED",
        reason,
        piSignatureHash,
        signedBy: "RND",
        timestamp: new Date().toISOString(),
      });

      const pem = await readPem(privateKeyFile);

      const privateKey = await importPrivateKey(pem);

      const signature = await signData(privateKey, payload);

      await axiosInstance.patch(`/api/projects/${project._id}/reject`, {
        payload,
        signature,
      });

      alert("Project Rejected");

      setShowRejectModal(false);

      navigate("/rnd-dashboard");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Rejection failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#d6e3da] p-4 sm:p-6 md:p-10">
      <BackButton />
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800">
          Project Summary
        </h1>
      </div>

      {/* SIGNATURE STATUS */}
      <SigBanner state={piCheck} label="PI digital signature" />
      {rndCheck && <SigBanner state={rndCheck} label="R&D digital signature" />}

      {/* BASIC INFO */}
      <div className="bg-white rounded-2xl shadow p-4 sm:p-6 md:p-8 mb-6 md:mb-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Basic Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
          <p>
            <span className="font-semibold">Title:</span> {projectData.title}
          </p>
          {project.piSubmission?.status === "APPROVED" &&
            rndPayload?.projectCode && (
              <p>
                <span className="font-semibold">Project Code:</span>{" "}
                {rndPayload.projectCode}
              </p>
            )}
          <p>
            <span className="font-semibold">Bank Transaction ID:</span>{" "}
            {projectData.bankTransactionId}
          </p>
          <p>
            <span className="font-semibold">Department:</span>{" "}
            {projectData.department}
          </p>
          <p>
            <span className="font-semibold">PI Name:</span>{" "}
            {projectData.piName}
          </p>
          <p>
            <span className="font-semibold">Total Fund Received:</span> ₹
            {projectData.totalFundReceived}
          </p>
          <p>
            <span className="font-semibold">Bifurcation Year:</span>{" "}
            {projectData.bifurcationYear ?? projectData.year}
          </p>
        </div>
      </div>

      {/* DIVISION HEADS */}
      <div className="bg-white rounded-2xl shadow p-4 sm:p-6 md:p-8 mb-6 md:mb-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Head-wise Fund Allocation
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {Object.entries(projectData.divisionHeads || {}).map(
            ([key, value]) => (
              <div
                key={key}
                className="border rounded-xl p-4 bg-gray-50 hover:shadow transition"
              >
                <p className="text-gray-600 font-medium">{key}</p>
                <p className="text-xl font-bold text-gray-800">₹{value}</p>
              </div>
            ),
          )}
        </div>
      </div>

      {/* Attachment */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Attached Document
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gray-100 p-4 rounded-lg border">
          <div>
            <p className="text-gray-700 font-medium">
              {project.piSubmission?.attachmentOriginalName}
            </p>
            <p className="text-sm text-gray-500">Uploaded</p>
          </div>

          <div className="flex gap-3">
            {/* View */}
            <a onClick={openFile} className="btn-primary cursor-pointer">
              View Sanction Order
            </a>
          </div>
        </div>
      </div>

      {/* FOOTER: R&D signature badge (shown to PI once R&D has decided) */}
      {role !== "RND" && project.rndDecision?.signatureRND && (
        <div
          className={`flex items-center border mt-6 rounded-lg shadow-sm ${sigBoxStyle(
            rndCheck,
          )}`}
        >
          <img
            src={signedBadge}
            alt="Signed Badge"
            className="h-20 object-contain"
          />
          <div className="text-sm">
            <p className="font-semibold">
              Signed by: <span className="font-medium">{rndSignedBy}</span>
            </p>
            <p className="text-xs">{sigText(rndCheck)}</p>
          </div>
        </div>
      )}

      {/* FOOTER: PI signature badge */}
      <div
        className={`flex items-center border mt-6 rounded-lg shadow-sm ${sigBoxStyle(
          piCheck,
        )}`}
      >
        <img
            src={signedBadge}
          alt="Signed Badge"
          className="h-20 object-contain"
        />
        <div className="text-sm">
          <p className="font-semibold">
            Submitted by:{" "}
            <span className="font-medium">{projectData.piName}</span>
          </p>
          <p className="text-xs">{sigText(piCheck)}</p>
        </div>
      </div>

      {role === "RND" && (
        <div className="mt-8 bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-5">R&D Verification</h2>

          {project.piSubmission?.status === "PENDING" && (
            <>
              {piCheck === "invalid" && (
                <p className="mb-4 text-red-700 font-medium">
                  The PI signature could not be verified, so this project
                  cannot be approved or rejected.
                </p>
              )}

              {/* Code Gen */}
              <div className="mb-4 flex flex-wrap items-center gap-4">
                <button
                  disabled={piCheck !== "valid" || generatingCode}
                  onClick={handleGenerateCode}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {generatingCode
                    ? "Generating..."
                    : generated
                      ? "↻ Regenerate Code"
                      : "⚙ Generate Project Code"}
                </button>

                {generated ? (
                  <p className="text-gray-700">
                    Project Code: <strong>{generated.projectCode}</strong>
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">
                    Generate a project code before approving.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-4 mt-6">
                <button
                  disabled={piCheck !== "valid" || !generated}
                  onClick={() => {
                    setSelectedProject(project);
                    setShowApproveModal(true);
                  }}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ✓ Approve Project
                </button>
                <button
                  disabled={piCheck !== "valid"}
                  onClick={() => {
                    setSelectedProject(project);
                    setShowRejectModal(true);
                  }}
                  className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ✕ Reject Project
                </button>
              </div>

              <DecisionModal
                open={showApproveModal}
                type="approve"
                title="Approve Project Registration"
                description="Upload R&D signing key"
                requirePdf={false}
                onClose={() => setShowApproveModal(false)}
                onConfirm={({ privateKeyFile }) =>
                  approveProject(selectedProject, privateKeyFile)
                }
              />
              <DecisionModal
                open={showRejectModal}
                type="reject"
                title="Reject Project Registration"
                description="Digitally reject this project"
                onClose={() => setShowRejectModal(false)}
                onConfirm={({ privateKeyFile, reason }) =>
                  rejectProject(selectedProject, privateKeyFile, reason)
                }
              />
            </>
          )}

          {project.piSubmission?.status === "APPROVED" && (
            <div className="bg-green-100 p-4 rounded-lg">
              <h3 className="text-green-700 font-bold">✅ Project Approved</h3>

              <p className="mt-2">
                Project Code: <strong>{rndPayload?.projectCode}</strong>
              </p>
            </div>
          )}

          {project.piSubmission?.status === "REJECTED" && (
            <div className="bg-red-100 p-4 rounded-lg">
              <h3 className="text-red-700 font-bold">❌ Project Rejected</h3>

              <p className="mt-2">Reason: {rndPayload?.reason}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
