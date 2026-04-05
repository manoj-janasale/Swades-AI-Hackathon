import { NextResponse } from "next/server";
import * as fs from "node:fs";
import * as path from "node:path";
import { ensureStorageDirs, runTranscription } from "../../lib/transcribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  ensureStorageDirs();
  const root = path.resolve(process.cwd());
  const audioDir = path.join(root, "storage", "audio");

  if (!fs.existsSync(audioDir)) {
    return new NextResponse("No audio files found", { status: 404 });
  }

  const files = fs.readdirSync(audioDir).filter((file) => {
    const ext = path.extname(file).slice(1).toLowerCase();
    return ["wav", "mp3", "m4a", "ogg", "webm", "flac"].includes(ext);
  });

  if (!files.length) {
    return new NextResponse("No audio files found", { status: 404 });
  }

  const results = [] as Array<{ recordingId: string; audioFile: string; transcriptFile: string; transcriptText: string }>;

  for (const file of files) {
    const recordingId = path.basename(file, path.extname(file));
    const audioFilePath = path.join(audioDir, file);
    const transcriptFile = path.join(root, "storage", "transcripts", `${recordingId}.txt`);
    const transcriptText = await runTranscription(audioFilePath, transcriptFile);
    results.push({ recordingId, audioFile: file, transcriptFile: `${recordingId}.txt`, transcriptText });
  }

  return NextResponse.json({ transcribed: results });
}
