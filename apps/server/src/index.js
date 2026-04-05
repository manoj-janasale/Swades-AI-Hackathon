"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var hono_1 = require("hono");
var cors_1 = require("hono/cors");
var logger_1 = require("hono/logger");
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
var node_child_process_1 = require("node:child_process");
var __dirname = node_path_1.default.dirname(new URL(import.meta.url).pathname);
var SERVER_ROOT = node_path_1.default.resolve(__dirname, "..", "..", "..");
var AUDIO_DIR = node_path_1.default.join(SERVER_ROOT, "apps", "server", "storage", "audio");
var TRANSCRIPT_DIR = node_path_1.default.join(SERVER_ROOT, "apps", "server", "storage", "transcripts");
var PYTHON_PATH = node_path_1.default.join(SERVER_ROOT, "workers", "transcriber", ".venv", "bin", "python");
var TRANSCRIBE_SCRIPT = node_path_1.default.join(SERVER_ROOT, "workers", "transcriber", "transcribe.py");
var AUDIO_EXTENSIONS = ["wav", "mp3", "m4a", "ogg", "webm", "flac"];
var app = new hono_1.Hono();
function isUploadedFileLike(value) {
    return (typeof value === "object" &&
        value !== null &&
        "arrayBuffer" in value &&
        typeof value.arrayBuffer === "function");
}
function ensureStorageDirs() {
    node_fs_1.default.mkdirSync(AUDIO_DIR, { recursive: true });
    node_fs_1.default.mkdirSync(TRANSCRIPT_DIR, { recursive: true });
}
function transcriptPath(recordingId) {
    return node_path_1.default.join(TRANSCRIPT_DIR, "".concat(recordingId, ".txt"));
}
function audioPath(recordingId, ext) {
    return node_path_1.default.join(AUDIO_DIR, "".concat(recordingId, ".").concat(ext));
}
function findAudioFile(recordingId) {
    var requestedPath = node_path_1.default.join(AUDIO_DIR, recordingId);
    if (node_fs_1.default.existsSync(requestedPath)) {
        return requestedPath;
    }
    var files = node_fs_1.default.readdirSync(AUDIO_DIR);
    var match = files.find(function (file) { return file === recordingId || file.startsWith("".concat(recordingId, ".")); });
    return match ? node_path_1.default.join(AUDIO_DIR, match) : null;
}
function isAudioExtension(ext) {
    return AUDIO_EXTENSIONS.includes(ext.toLowerCase());
}
function runTranscription(audioFilePath, outFilePath) {
    return new Promise(function (resolve, reject) {
        (0, node_child_process_1.execFile)(PYTHON_PATH, [TRANSCRIBE_SCRIPT, audioFilePath, outFilePath], { env: process.env }, function (error, stdout, stderr) {
            if (error) {
                reject(new Error(stderr.trim() || stdout.trim() || error.message));
                return;
            }
            resolve(stdout.trim());
        });
    });
}
ensureStorageDirs();
app.use("*", (0, cors_1.cors)());
app.use("*", (0, logger_1.logger)());
app.get("/health", function (c) { return c.text("ok"); });
app.get("/audio/list", function (c) {
    ensureStorageDirs();
    var files = node_fs_1.default.readdirSync(AUDIO_DIR).filter(function (file) {
        var ext = node_path_1.default.extname(file).slice(1);
        return isAudioExtension(ext);
    });
    return c.json({ audio: files });
});
app.post("/upload", function (c) { return __awaiter(void 0, void 0, void 0, function () {
    var form, file, rawRecordingId, recordingId, originalName, ext, audioFilePath, buffer, _a, _b, transcriptFile, transcriptText;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                ensureStorageDirs();
                return [4 /*yield*/, c.req.formData()];
            case 1:
                form = _c.sent();
                file = form.get("audio");
                rawRecordingId = String(form.get("recordingId") || "audio-".concat(Date.now()));
                recordingId = node_path_1.default.basename(rawRecordingId);
                if (!isUploadedFileLike(file)) {
                    return [2 /*return*/, c.text("Missing audio file attachment", 400)];
                }
                originalName = file.name || "".concat(recordingId, ".wav");
                ext = node_path_1.default.extname(originalName).slice(1) || "wav";
                if (!isAudioExtension(ext)) {
                    return [2 /*return*/, c.text("Unsupported audio extension: ".concat(ext), 400)];
                }
                audioFilePath = audioPath(recordingId, ext);
                _b = (_a = Buffer).from;
                return [4 /*yield*/, file.arrayBuffer()];
            case 2:
                buffer = _b.apply(_a, [_c.sent()]);
                node_fs_1.default.writeFileSync(audioFilePath, buffer);
                transcriptFile = transcriptPath(recordingId);
                return [4 /*yield*/, runTranscription(audioFilePath, transcriptFile)];
            case 3:
                transcriptText = _c.sent();
                return [2 /*return*/, c.json({
                        recordingId: recordingId,
                        audioFile: node_path_1.default.basename(audioFilePath),
                        transcriptFile: node_path_1.default.basename(transcriptFile),
                        transcriptText: transcriptText,
                    })];
        }
    });
}); });
app.post("/transcribe/:recordingId", function (c) { return __awaiter(void 0, void 0, void 0, function () {
    var recordingId, audioFilePath, transcriptFile, transcriptText;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                recordingId = c.req.param("recordingId");
                audioFilePath = findAudioFile(recordingId);
                if (!audioFilePath) {
                    return [2 /*return*/, c.text("Audio file for '".concat(recordingId, "' not found. Place it in storage/audio and retry."), 404)];
                }
                transcriptFile = transcriptPath(recordingId);
                return [4 /*yield*/, runTranscription(audioFilePath, transcriptFile)];
            case 1:
                transcriptText = _a.sent();
                return [2 /*return*/, c.json({
                        recordingId: recordingId,
                        audioFile: node_path_1.default.basename(audioFilePath),
                        transcriptFile: node_path_1.default.basename(transcriptFile),
                        transcriptText: transcriptText,
                    })];
        }
    });
}); });
app.post("/transcribe-all", function (c) { return __awaiter(void 0, void 0, void 0, function () {
    var audioFiles, results, _i, audioFiles_1, file, recordingId, audioFilePath, transcriptFile, transcriptText;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                ensureStorageDirs();
                audioFiles = node_fs_1.default.readdirSync(AUDIO_DIR).filter(function (file) {
                    var ext = node_path_1.default.extname(file).slice(1);
                    return isAudioExtension(ext);
                });
                if (!audioFiles.length) {
                    return [2 /*return*/, c.text("No audio files found in storage/audio", 404)];
                }
                results = [];
                _i = 0, audioFiles_1 = audioFiles;
                _a.label = 1;
            case 1:
                if (!(_i < audioFiles_1.length)) return [3 /*break*/, 4];
                file = audioFiles_1[_i];
                recordingId = node_path_1.default.basename(file, node_path_1.default.extname(file));
                audioFilePath = node_path_1.default.join(AUDIO_DIR, file);
                transcriptFile = transcriptPath(recordingId);
                return [4 /*yield*/, runTranscription(audioFilePath, transcriptFile)];
            case 2:
                transcriptText = _a.sent();
                results.push({
                    recordingId: recordingId,
                    audioFile: file,
                    transcriptFile: node_path_1.default.basename(transcriptFile),
                    transcriptText: transcriptText,
                });
                _a.label = 3;
            case 3:
                _i++;
                return [3 /*break*/, 1];
            case 4: return [2 /*return*/, c.json({ transcribed: results })];
        }
    });
}); });
app.get("/transcript/:recordingId", function (c) {
    var recordingId = c.req.param("recordingId");
    var transcriptFile = transcriptPath(recordingId);
    if (!node_fs_1.default.existsSync(transcriptFile)) {
        return c.text("Transcript for '".concat(recordingId, "' not found"), 404);
    }
    var text = node_fs_1.default.readFileSync(transcriptFile, "utf-8");
    return c.text(text, 200, { "Content-Type": "text/plain; charset=utf-8" });
});
exports.default = app;
