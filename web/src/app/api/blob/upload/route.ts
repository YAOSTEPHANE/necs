import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { isBlobConfigured } from "@/lib/vercel-blob";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
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
        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/svg+xml",
          ],
          maximumSizeInBytes: 8 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            app: "necs",
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload Blob échoué" },
      { status: 400 },
    );
  }
}
