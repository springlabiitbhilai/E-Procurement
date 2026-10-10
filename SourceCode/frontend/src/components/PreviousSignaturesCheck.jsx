import SignatureBadge from "./SignatureBadge";

// Verification of every signature before the current desk
// (check comes from usePreviousSignatureChecks)
export default function PreviousSignaturesCheck({ check }) {
  return (
    <div className="text-sm">
      <span className="font-semibold">Previous Signatures:</span>{" "}
      <SignatureBadge result={check} loading={!check} />
      {check && (
        <p
          className={`text-xs mt-1 ${
            check.status !== "valid"
              ? "text-red-600"
              : check.formBound === false
                ? "text-yellow-700"
                : "text-gray-500"
          }`}
        >
          {check.message}
        </p>
      )}
    </div>
  );
}
