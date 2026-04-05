import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const SERVER_ROOT = path.resolve(__dirname, "..", "..", "..");
const AUDIO_DIR = path.join(SERVER_ROOT, "apps", "server", "storage", "audio");
const TRANSCRIPT_DIR = path.join(SERVER_ROOT, "apps", "server", "storage", "transcripts");
const PYTHON_PATH = path.join(SERVER_ROOT, "workers", "transcriber", ".venv", "bin", "python");
const TRANSCRIBE_SCRIPT = path.join(SERVER_ROOT, "workers", "transcriber", "transcribe.py");

const AUDIO_EXTENSIONS = ["wav", "mp3", "m4a", "ogg", "webm", "flac"];

const app = new Hono();

interface UploadedFileLike {
  name?: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

function isUploadedFileLike(value: unknown): value is UploadedFileLike {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function"
  );
}

function ensureStorageDirs() {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  fs.mkdirSync(TRANSCRIPT_DIR, { recursive: true });
}

function transcriptPath(recordingId: string) {
  return path.join(TRANSCRIPT_DIR, `${recordingId}.txt`);
}

function audioPath(recordingId: string, ext: string) {
  return path.join(AUDIO_DIR, `${recordingId}.${ext}`);
}

function findAudioFile(recordingId: string) {
  const requestedPath = path.join(AUDIO_DIR, recordingId);
  if (fs.existsSync(requestedPath)) {
    return requestedPath;
  }

  const files = fs.readdirSync(AUDIO_DIR);
  const match = files.find((file) => file === recordingId || file.startsWith(`${recordingId}.`));
  return match ? path.join(AUDIO_DIR, match) : null;
}

function isAudioExtension(ext: string) {
  return AUDIO_EXTENSIONS.includes(ext.toLowerCase());
}

function runTranscription(audioFilePath: string, outFilePath: string) {
  return new Promise<string>((resolve, reject) => {
    execFile(
      PYTHON_PATH,
      [TRANSCRIBE_SCRIPT, audioFilePath, outFilePath],
      { env: process.env },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr.trim() || stdout.trim() || error.message));
          return;
        }
        resolve(stdout.trim());
      }
    );
  });
}

ensureStorageDirs();

app.use("*", cors());
app.use("*", logger());

app.get("/health", (c) => c.text("ok"));

app.get("/audio/list", (c) => {
  ensureStorageDirs();
  const files = fs.readdirSync(AUDIO_DIR).filter((file) => {
    const ext = path.extname(file).slice(1);
    return isAudioExtension(ext);
  });
  return c.json({ audio: files });
});

app.post("/upload", async (c) => {
  ensureStorageDirs();
  const form = await c.req.formData();
  const file = form.get("audio");
  const rawRecordingId = String(form.get("recordingId") || `audio-${Date.now()}`);
  const recordingId = path.basename(rawRecordingId);

  if (!isUploadedFileLike(file)) {
    return c.text("Missing audio file attachment", 400);
  }

  const originalName = file.name || `${recordingId}.wav`;
  const ext = path.extname(originalName).slice(1) || "wav";
  if (!isAudioExtension(ext)) {
    return c.text(`Unsupported audio extension: ${ext}`, 400);
  }

  const audioFilePath = audioPath(recordingId, ext);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(audioFilePath, buffer);

  const transcriptFile = transcriptPath(recordingId);
  const transcriptText = await runTranscription(audioFilePath, transcriptFile);

  return c.json({
    recordingId,
    audioFile: path.basename(audioFilePath),
    transcriptFile: path.basename(transcriptFile),
    transcriptText,
  });
});

app.post("/transcribe/:recordingId", async (c) => {
  const recordingId = c.req.param("recordingId");
  const audioFilePath = findAudioFile(recordingId);

  if (!audioFilePath) {
    return c.text(`Audio file for '${recordingId}' not found. Place it in storage/audio and retry.`, 404);
  }

  const transcriptFile = transcriptPath(recordingId);
  const transcriptText = await runTranscription(audioFilePath, transcriptFile);

  return c.json({
    recordingId,
    audioFile: path.basename(audioFilePath),
    transcriptFile: path.basename(transcriptFile),
    transcriptText,
  });
});

app.post("/transcribe-all", async (c) => {
  ensureStorageDirs();
  const audioFiles = fs.readdirSync(AUDIO_DIR).filter((file) => {
    const ext = path.extname(file).slice(1);
    return isAudioExtension(ext);
  });

  if (!audioFiles.length) {
    return c.text("No audio files found in storage/audio", 404);
  }

  const results = [] as Array<{ recordingId: string; audioFile: string; transcriptFile: string; transcriptText: string }>;

  for (const file of audioFiles) {
    const recordingId = path.basename(file, path.extname(file));
    const audioFilePath = path.join(AUDIO_DIR, file);
    const transcriptFile = transcriptPath(recordingId);
    const transcriptText = await runTranscription(audioFilePath, transcriptFile);
    results.push({
      recordingId,
      audioFile: file,
      transcriptFile: path.basename(transcriptFile),
      transcriptText,
    });
  }

  return c.json({ transcribed: results });
});

app.get("/transcript/:recordingId", (c) => {
  const recordingId = c.req.param("recordingId");
  const transcriptFile = transcriptPath(recordingId);

  if (!fs.existsSync(transcriptFile)) {
    return c.text(`Transcript for '${recordingId}' not found`, 404);
  }

  const text = fs.readFileSync(transcriptFile, "utf-8");
  return c.text(text, 200, { "Content-Type": "text/plain; charset=utf-8" });
});

export default app;
