import { NextResponse } from "next/server";
import { getBucket } from "@/lib/firebase-admin";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const ext = url.searchParams.get("ext") ?? "webm";
    const contentType = url.searchParams.get("type") ?? "audio/webm";

    const uploadId = crypto.randomBytes(10).toString("hex");
    const storagePath = `uploads/${uploadId}.${ext}`;

    const bucket = getBucket();
    const file = bucket.file(storagePath);

    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType,
    });

    return NextResponse.json({ signedUrl, uploadId, ext, storagePath });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ message }, { status: 500 });
  }
}
