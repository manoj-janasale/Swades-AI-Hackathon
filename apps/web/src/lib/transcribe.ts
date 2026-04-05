import * as fs from "node:fs";
import * as path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(process.cwd());
const AUDIO_DIR = path.join(ROOT, "storage", "audio");
const TRANSCRIPT_DIR = path.join(ROOT, "storage", "transcripts");
const TRANSCRIBE_SCRIPT = path.join(ROOT, "..", "..", "workers", "transcriber", "transcribe.py");
const VENV_PYTHON = path.join(ROOT, "..", "..", "workers", "transcriber", ".venv", "bin", "python");

export function ensureStorageDirs() {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  fs.mkdirSync(TRANSCRIPT_DIR, { recursive: true });
}

export function audioPath(recordingId: string, ext: string) {
  return path.join(AUDIO_DIR, `${recordingId}.${ext}`);
}

export function transcriptPath(recordingId: string) {
  return path.join(TRANSCRIPT_DIR, `${recordingId}.txt`);
}

export function sanitizeId(raw: string) {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/^_+|_+$/g, "_");
}

export async function runTranscription(audioFilePath: string, outFilePath: string) {
  ensureStorageDirs();

  if (!fs.existsSync(TRANSCRIBE_SCRIPT)) {
    throw new Error(`Transcribe script not found at ${TRANSCRIBE_SCRIPT}`);
  }

  const pythonCommand = fs.existsSync(VENV_PYTHON) ? VENV_PYTHON : "python3";
  const { stdout, stderr } = await execFileAsync(pythonCommand, [TRANSCRIBE_SCRIPT, audioFilePath, outFilePath], {
    env: process.env,
    cwd: ROOT,
    maxBuffer: 10 * 1024 * 1024,
  });

  if (stderr && stderr.trim().length > 0) {
    // Some Python packages log warnings to stderr; do not fail on warnings alone.
  }

  return stdout.trim();
}
