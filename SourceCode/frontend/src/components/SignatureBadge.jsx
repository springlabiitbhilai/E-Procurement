// Server-side verification result of one signed workflow step
const STYLES = {
  valid: "bg-green-100 text-green-700",
  invalid: "bg-red-100 text-red-700",
  unverifiable: "bg-yellow-100 text-yellow-800",
};

const LABELS = {
  valid: "✓ Signature verified",
  invalid: "✗ Signature invalid",
  unverifiable: "? Cannot verify",
};

export default function SignatureBadge({ result, loading }) {
  if (loading && !result) {
    return <span className="text-xs text-gray-400">Verifying...</span>;
  }

  if (!result) return null;

  const warning = result.status === "valid" && result.formBound === false;

  return (
    <span
      title={result.message}
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
        warning ? STYLES.unverifiable : STYLES[result.status]
      }`}
    >
      {LABELS[result.status]}
      {warning && " (form not protected)"}
    </span>
  );
}
