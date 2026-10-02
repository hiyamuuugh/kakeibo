export const AUTH_COOKIE_NAME = "kakeibo_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

const encoder = new TextEncoder();

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");

const equalBytes = (left: Uint8Array, right: Uint8Array) => {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;

  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }

  return diff === 0;
};

const digest = async (value: string) => {
  const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return new Uint8Array(buffer);
};

const sign = async (value: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return new Uint8Array(signature);
};

export const isAuthConfigured = () =>
  Boolean(process.env.APP_PASSWORD && process.env.APP_SESSION_SECRET);

export const isValidPassword = async (password: string) => {
  const expected = process.env.APP_PASSWORD;

  if (!expected) {
    return false;
  }

  const [actualDigest, expectedDigest] = await Promise.all([
    digest(password),
    digest(expected),
  ]);

  return equalBytes(actualDigest, expectedDigest);
};

export const createSessionToken = async (now = Date.now()) => {
  const secret = process.env.APP_SESSION_SECRET;

  if (!secret) {
    throw new Error("APP_SESSION_SECRET is not configured");
  }

  const expiresAt = now + SESSION_DURATION_MS;
  const signature = await sign(String(expiresAt), secret);

  return `${expiresAt}.${toHex(signature)}`;
};

export const verifySessionToken = async (
  token?: string | null,
  now = Date.now()
) => {
  if (!token) {
    return false;
  }

  const secret = process.env.APP_SESSION_SECRET;

  if (!secret) {
    return false;
  }

  const [expiresAtRaw, signature] = token.split(".");
  const expiresAt = Number(expiresAtRaw);

  if (!expiresAtRaw || !signature || Number.isNaN(expiresAt) || expiresAt <= now) {
    return false;
  }

  const expectedSignature = await sign(String(expiresAt), secret);
  const actualSignature = Uint8Array.from(
    signature.match(/.{1,2}/g)?.map((part) => Number.parseInt(part, 16)) ?? []
  );

  return equalBytes(actualSignature, expectedSignature);
};

export const getSessionMaxAge = () => SESSION_DURATION_MS / 1000;
