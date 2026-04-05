import * as fs from "node:fs";
import { NextResponse } from "next/server";
import { ensureStorageDirs, audioPath, transcriptPath, sanitizeId, runTranscription } from "../../lib/transcribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  ensureStorageDirs();

  const formData = await request.formData();
  const audioFile = formData.get("audio");
  const rawRecordingId = String(formData.get("recordingId") || `audio-${Date.now()}`);

  if (!audioFile || typeof (audioFile as File).arrayBuffer !== "function") {
    return new NextResponse("Missing audio file", { status: 400 });
  }

  const file = audioFile as File;
  const fileName = file.name || `${rawRecordingId}.wav`;
  const extension = fileName.split(".").pop()?.toLowerCase() || "wav";
  const recordingId = sanitizeId(rawRecordingId || fileName.replace(/\.[^/.]+$/, ""));
  const destination = audioPath(recordingId, extension);
  const buffer = Buffer.from(await file.arrayBuffer());

  await fs.promises.writeFile(destination, buffer);

  const transcriptFile = transcriptPath(recordingId);
  const transcriptText = await runTranscription(destination, transcriptFile);

  return NextResponse.json({
    recordingId,
    audioFile: fileName,
    transcriptFile: `${recordingId}.txt`,
    transcriptText,
  });
}
