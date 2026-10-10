import {
  WORKFLOW_STEPS,
  ACTION_LABELS,
} from "../utils/recruitmentWorkflow";
import useHistoryVerification from "../utils/useHistoryVerification";
import SignatureBadge from "./SignatureBadge";

// Step-by-step progress of a recruitment request, with its signed history
export default function WorkflowTracker({ recruitment, showHistory = true }) {
  const stage = recruitment.stage;
  const closed = stage === "SENT_TO_PI";
  const rejected = recruitment.status === "Rejected";

  const verification = useHistoryVerification(recruitment, showHistory);

  const currentIndex = WORKFLOW_STEPS.findIndex((step) => step.stage === stage);

  return (
    <div>
      <ol className="flex flex-wrap gap-2">
        {WORKFLOW_STEPS.map((step, index) => {
          const done = index < currentIndex || closed;
          const current = index === currentIndex && !closed;

          let style = "bg-gray-100 text-gray-400";

          if (done) style = "bg-green-100 text-green-700";
          if (current) style = "bg-blue-600 text-white";
          if (closed && index === WORKFLOW_STEPS.length - 1 && rejected) {
            style = "bg-red-100 text-red-700";
          }

          return (
            <li
              key={step.stage}
              className={`px-3 py-1 rounded-full text-xs font-medium ${style}`}
            >
              {index + 1}. {step.label}
            </li>
          );
        })}
      </ol>

      {showHistory && recruitment.history?.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm">
          {recruitment.history.map((entry) => (
            <li
              key={entry._id || entry.at}
              className="border-l-4 border-blue-200 pl-3"
            >
              <p>
                <span className="font-semibold">{entry.role}</span>
                {entry.by && ` (${entry.by})`}:{" "}
                {ACTION_LABELS[entry.action] || entry.action}
                <span className="text-gray-400">
                  {" "}
                  · {new Date(entry.at).toLocaleString()}
                </span>
              </p>

              <SignatureBadge
                result={verification.results[entry._id]}
                loading={verification.loading}
              />

              {verification.results[entry._id]?.status !== "valid" &&
                verification.results[entry._id]?.message && (
                  <p className="text-xs text-gray-500">
                    {verification.results[entry._id].message}
                  </p>
                )}

              {entry.remarks && (
                <p className="text-gray-600">Remarks: {entry.remarks}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {showHistory && verification.error && (
        <p className="mt-2 text-xs text-red-600">{verification.error}</p>
      )}
    </div>
  );
}
