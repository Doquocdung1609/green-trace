import { createReadStream } from "node:fs";
import { mkdir, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { env } from "../config.js";

const publicDir = path.resolve("storage/public");
const privateDir = path.resolve("storage/private");
export const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/json",
  "text/plain",
]);

export async function ensureStorage() {
  await Promise.all([
    mkdir(publicDir, { recursive: true }),
    mkdir(privateDir, { recursive: true }),
  ]);
}

export async function storeEvidence(
  file: Express.Multer.File,
  visibility: string,
  contentHash: string,
) {
  await ensureStorage();
  const extension = path
    .extname(file.originalname)
    .toLowerCase()
    .replace(/[^.a-z0-9]/g, "");
  const safeName = `${contentHash}${extension}`;
  if (visibility === "PUBLIC" && env.PINATA_JWT) {
    const body = new FormData();
    body.append(
      "file",
      new Blob([
        await import("node:fs/promises").then((fs) => fs.readFile(file.path)),
      ]),
      safeName,
    );
    body.append("pinataMetadata", JSON.stringify({ name: safeName }));
    const response = await fetch(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${env.PINATA_JWT}` },
        body,
      },
    );
    if (response.ok) {
      const result = (await response.json()) as { IpfsHash: string };
      await unlink(file.path);
      return `ipfs://${result.IpfsHash}`;
    }
  }
  const targetDir = visibility === "PUBLIC" ? publicDir : privateDir;
  const target = path.join(targetDir, safeName);
  await rename(file.path, target);
  return visibility === "PUBLIC"
    ? `${env.PUBLIC_BASE_URL}/storage/public/${safeName}`
    : `private://${safeName}`;
}

export function openPrivateEvidence(uri: string) {
  return createReadStream(path.join(privateDir, uri.replace("private://", "")));
}
