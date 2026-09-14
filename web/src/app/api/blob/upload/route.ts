import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { isBlobConfigured } from "@/lib/vercel-blob";
import { getServerSession } from "@/lib/session-server";
import {
  assertSameOrigin,
  isJsonRequest,
  safeErrorMessage,
} from "@/lib/security";

export const runtime = "nodejs";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export async function POST(request: Request): Promise<NextResponse> {
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 });
  }
  if (!isJsonRequest(request)) {
    return NextResponse.json(
      { error: "Content-Type application/json requis." },
      { status: 415 },
    );
  }

  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  if (!isBlobConfigured()) {
    return NextResponse.json(
      {
        error:
          "Vercel Blob non configuré. Ajoutez BLOB_READ_WRITE_TOKEN dans .env.local / Vercel.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("necs/")) {
          throw new Error("Chemin Blob non autorisé");
        }
        if (pathname.includes("..") || pathname.includes("//")) {
          throw new Error("Chemin Blob invalide");
        }
        return {
          allowedContentTypes: [...ALLOWED_TYPES],
          maximumSizeInBytes: 8 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            app: "necs",
            userId: session.userId,
            at: Date.now(),
          }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.info("[necs-blob] upload ok", blob.pathname, blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("[blob/upload]", error);
    return NextResponse.json(
      { error: safeErrorMessage(error, "Upload Blob échoué.") },
      { status: 400 },
    );
  }
}
