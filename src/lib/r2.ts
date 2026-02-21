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

function getCacheKey(type: "video" | "audio", folder: string): string {
  return `${type}:${folder}`;
}

async function listFilesInFolder(
  folder: string,
  extensions: string[],
  type: "video" | "audio",
): Promise<string[]> {
  const cacheKey = getCacheKey(type, folder);
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.files;
  }

  const prefix = folder.endsWith("/") ? folder : `${folder}/`;
  const normalizedExtensions = new Set(extensions.map((ext) => ext.toLowerCase()));
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME!,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });

    const response = await s3.send(command);
    const pageKeys = (response.Contents ?? [])
      .map((obj) => obj.Key ?? "")
      .filter((key) => {
        if (!key || key.endsWith("/")) return false;
        const lowerKey = key.toLowerCase();
        for (const ext of normalizedExtensions) {
          if (lowerKey.endsWith(ext)) return true;
        }
        return false;
      })
      .map((key) => key.replace(prefix, ""))
      .filter((key) => key.length > 0);

    keys.push(...pageKeys);
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  const files = keys.sort((a, b) => a.localeCompare(b));
  cache.set(cacheKey, { files, timestamp: Date.now() });

  return files;
}

export async function listVideosInFolder(folder: string): Promise<string[]> {
  return listFilesInFolder(folder, [".mp4"], "video");
}

export async function listAudioInFolder(folder: string): Promise<string[]> {
  return listFilesInFolder(folder, [".mp3", ".wav", ".ogg", ".m4a"], "audio");
}
