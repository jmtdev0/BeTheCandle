import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const cache = new Map<string, { files: string[]; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function listVideosInFolder(folder: string): Promise<string[]> {
  const cached = cache.get(folder);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.files;
  }

  const prefix = folder.endsWith("/") ? folder : `${folder}/`;

  const command = new ListObjectsV2Command({
    Bucket: process.env.R2_BUCKET_NAME!,
    Prefix: prefix,
  });

  const response = await s3.send(command);

  const files = (response.Contents ?? [])
    .map((obj) => obj.Key ?? "")
    .filter((key) => key.endsWith(".mp4"))
    .map((key) => key.replace(prefix, ""));

  cache.set(folder, { files, timestamp: Date.now() });

  return files;
}
