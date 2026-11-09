import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Codes à usage unique (RFC 6238), compatibles Google Authenticator, Microsoft Authenticator, 1Password…

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateTotpSecret() {
  const bytes = randomBytes(20);
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  return bits.match(/.{1,5}/g)!.map((c) => B32[parseInt(c.padEnd(5, "0"), 2)]).join("");
}

function base32Decode(s: string) {
  let bits = "";
  for (const c of s.replace(/=+$/, "").toUpperCase()) bits += B32.indexOf(c).toString(2).padStart(5, "0");
  return Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
}

function codeAt(secret: string, counter: number) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", base32Decode(secret)).update(buf).digest();
  const o = h[h.length - 1] & 0xf;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, "0");
}

/** Accepte le code courant et ceux des 30 s précédentes / suivantes (décalage d'horloge). */
export function verifyTotp(secret: string, code: string, now = Date.now()) {
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  const step = Math.floor(now / 30_000);
  return [-1, 0, 1].some((d) => timingSafeEqual(Buffer.from(codeAt(secret, step + d)), Buffer.from(clean)));
}

export const totpUri = (secret: string, account: string) =>
  `otpauth://totp/${encodeURIComponent(`Fieldline:${account}`)}?secret=${secret}&issuer=Fieldline&algorithm=SHA1&digits=6&period=30`;

/** Pour les tests : code courant. */
export const currentTotp = (secret: string, now = Date.now()) => codeAt(secret, Math.floor(now / 30_000));
