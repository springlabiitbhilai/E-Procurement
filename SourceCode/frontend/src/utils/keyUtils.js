// src/utils/keyUtils.js

export async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-PSS",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"]
  );

  const publicKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privateKey = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  return {
    publicKeyPem: convertToPem(publicKey, "PUBLIC KEY"),
    privateKeyPem: convertToPem(privateKey, "PRIVATE KEY"),
  };
}

function convertToPem(buffer, label) {
  const base64 = btoa(
    String.fromCharCode(...new Uint8Array(buffer))
  );

  const chunked = base64.match(/.{1,64}/g).join("\n");

  return `-----BEGIN ${label}-----\n${chunked}\n-----END ${label}-----`;
}

export function downloadFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}
