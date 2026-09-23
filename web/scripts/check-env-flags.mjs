import { readFileSync } from "fs";

const t = readFileSync(".env.local", "utf8");
const blob = /^BLOB_READ_WRITE_TOKEN=(.*)$/m.exec(t)?.[1]?.trim() ?? "";
const clean = blob.replace(/^["']|["']$/g, "");
console.log(
  JSON.stringify({
    hasBlob: clean.length > 0,
    blobLen: clean.length,
    hasDb: /^DATABASE_URL=/m.test(t),
    hasAuth: /^AUTH_SECRET=/m.test(t),
  }),
);
