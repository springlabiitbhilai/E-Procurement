export async function readPem(file) {
  const text = await file.text();

  return text
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
}

export async function importPrivateKey(pem) {
  const binary = Uint8Array.from(atob(pem), (c) =>
    c.charCodeAt(0)
  );

  return await window.crypto.subtle.importKey(
    "pkcs8",
    binary.buffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );
}

export async function signData(privateKey, data) {
  const enc = new TextEncoder().encode(
    JSON.stringify(data)
  );

  const signature = await window.crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    enc
  );

  return btoa(
    String.fromCharCode(...new Uint8Array(signature))
  );
}

export function canonicalPayload(obj) {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(canonicalPayload);
  }

  const sortedKeys = Object.keys(obj).sort();

  const result = {};

  sortedKeys.forEach((key) => {
    result[key] = canonicalPayload(obj[key]);
  });

  return result;
}

export async function hashPdf(file) {
  const buffer = await file.arrayBuffer();

  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    buffer
  );

  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const sha256Hex = async (text) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
};