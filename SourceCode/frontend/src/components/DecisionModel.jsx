import { useState, useEffect } from "react";

export default function DecisionModal({
  open,
  type = "approve", // approve | reject
  title,
  description,
  requirePdf = false,
  confirmLabel,
  reasonLabel = "Rejection Reason",
  showReason = type === "reject",
  requireReason = type === "reject",
  submitting = false,
  onClose,
  onConfirm,
}) {
  const [privateKeyFile, setPrivateKeyFile] = useState(null);
  const [signedPdfFile, setSignedPdfFile] = useState(null);
  const [reason, setReason] = useState("");

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setPrivateKeyFile(null);
      setSignedPdfFile(null);
      setReason("");
      setErrors({});
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = () => {
    const newErrors = {};

    if (!privateKeyFile) {
      newErrors.privateKey = "Please upload signing key";
    }

    if (requirePdf && !signedPdfFile) {
      newErrors.pdf = "Please upload signed PDF";
    }

    if (requireReason && !reason.trim()) {
      newErrors.reason = `Please enter ${reasonLabel.toLowerCase()}`;
    }

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    onConfirm({
      privateKeyFile,
      signedPdfFile,
      reason,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl p-6 w-[470px] shadow-2xl">

        <h2 className="text-2xl font-bold mb-2">
          {title}
        </h2>

        <p className="text-sm text-gray-600 mb-5">
          {description}
        </p>

        {/* Reject Reason */}

        {showReason && (
          <div className="mb-5">
            <label className="font-semibold block mb-2">
              {reasonLabel} {requireReason && "*"}
            </label>

            <textarea
              rows={4}
              className="w-full border rounded-xl p-3"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);

                setErrors((prev) => ({
                  ...prev,
                  reason: "",
                }));
              }}
            />

            {errors.reason && (
              <p className="text-red-500 text-sm mt-1">
                {errors.reason}
              </p>
            )}
          </div>
        )}

        {/* Private Key */}

        <div className="mb-5">
          <label className="font-semibold block mb-2">
            Upload Private Key (.pem) *
          </label>

          <input
            type="file"
            accept=".pem"
            onChange={(e) => {
              setPrivateKeyFile(e.target.files[0]);

              setErrors((prev) => ({
                ...prev,
                privateKey: "",
              }));
            }}
            className="w-full border rounded-xl p-3"
          />

          {errors.privateKey && (
            <p className="text-red-500 text-sm mt-1">
              {errors.privateKey}
            </p>
          )}
        </div>

        {/* Signed PDF */}

        {requirePdf && (
          <div className="mb-5">
            <label className="font-semibold block mb-2">
              Upload Signed PDF *
            </label>

            <input
              type="file"
              accept=".pdf"
              onChange={(e) => {
                setSignedPdfFile(e.target.files[0]);

                setErrors((prev) => ({
                  ...prev,
                  pdf: "",
                }));
              }}
              className="w-full border rounded-xl p-3"
            />

            {errors.pdf && (
              <p className="text-red-500 text-sm mt-1">
                {errors.pdf}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3">

          <button
            onClick={onClose}
            className="border px-5 py-2 rounded-xl"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`px-5 py-2 rounded-xl text-white disabled:opacity-60 ${
              type === "approve"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {submitting
              ? "Submitting..."
              : confirmLabel ||
                `Confirm ${type === "approve" ? "Approve" : "Reject"}`}
          </button>

        </div>
      </div>
    </div>
  );
}