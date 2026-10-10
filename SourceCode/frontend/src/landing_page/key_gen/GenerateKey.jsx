import { useState } from "react";
import { generateKeyPair, downloadFile } from "../../utils/keyUtils";
import { API_URL, axiosInstance } from "../../config/api";

export default function GenerateKey() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleGenerate = async () => {
    try {
      setLoading(true);

      const { publicKeyPem, privateKeyPem } = await generateKeyPair();
    
      // save public key to backend
      await axiosInstance.post(`/api/save-public-key`, {
        email: localStorage.getItem("signupEmail"),
        publicKey: publicKeyPem,
      });

      downloadFile("signing-key.pem", privateKeyPem);

      setSuccess(true);
    } catch (err) {
      console.error(err);

      alert(err.response?.data?.message || "Failed to save public key");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--primary)] text-white p-4 sm:p-6">
      <div className="bg-[var(--primaryAccent)] p-6 sm:p-8 md:p-10 rounded-xl w-full max-w-[450px] shadow-xl">
        {!success ? (
          <>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4">
              Generate Your Key Pair
            </h1>
            <p className="mb-6 text-[var(--light)]">
              Your account is almost ready. Click the button below to generate
              your secure keys.
            </p>

            <button
              onClick={handleGenerate}
              className="w-full bg-[var(--soft)] p-3 rounded font-bold text-black hover:bg-[var(--light)]"
            >
              {loading ? "Generating..." : "Generate Key Pair"}
            </button>
          </>
        ) : (
          <>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-3">
              Keys Generated Successfully 🎉
            </h1>
            <p className="text-[var(--light)] mb-6">
              Your Verification key is saved, and Signing key has been
              downloaded.
            </p>

            <button
              onClick={() => (window.location.href = "/")}
              className="w-full bg-[var(--soft)] p-3 rounded text-black font-bold hover:bg-[var(--light)]"
            >
              Login with your Credential.
            </button>
          </>
        )}
      </div>
    </div>
  );
}
