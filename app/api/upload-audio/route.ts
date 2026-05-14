import { NextResponse } from "next/server";
import { saveTempAudio } from "@/lib/local-storage";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

function getExt(filename: string, contentType: string): string {
  const fromName = filename.split(".").pop()?.toLowerCase();
  if (fromName && ["mp3", "wav", "m4a", "webm", "ogg"].includes(fromName)) {
    return fromName;
  }
  const map: Record<string, string> = {
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
  };
  return map[contentType] ?? "webm";
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "audio/webm";
    const filename = request.headers.get("x-audio-filename") ?? "audio";

    const arrayBuffer = await request.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      return NextResponse.json(
        { message: "Archivo de audio vacío." },
        { status: 400 }
      );
    }
    if (arrayBuffer.byteLength > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { message: "El archivo supera el límite de 25 MB." },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(arrayBuffer);
    const ext = getExt(filename, contentType);
    const uploadId = saveTempAudio(buffer, ext);

    return NextResponse.json({ uploadId, ext, fileName: filename });
  } catch (error) {
    console.error("Error guardando audio temporal:", error);
    const message =
      error instanceof Error ? error.message : "Error interno del servidor.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
