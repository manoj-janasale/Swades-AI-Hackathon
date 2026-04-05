import json
import sys
import whisperx

audio_file = sys.argv[1]
device = "cpu"
batch_size = 4
compute_type = "int8"
hf_token = sys.argv[2] if len(sys.argv) > 2 else None

model = whisperx.load_model("small", device, compute_type=compute_type, language="en")
result = model.transcribe(audio_file, batch_size=batch_size)

model_a, metadata = whisperx.load_align_model(language_code=result["language"], device=device)
result = whisperx.align(result["segments"], model_a, metadata, audio_file, device)

if hf_token:
    diarize_model = whisperx.DiarizationPipeline(use_auth_token=hf_token, device=device)
    diarize_segments = diarize_model(audio_file)
    result = whisperx.assign_word_speakers(diarize_segments, result)

lines = []
for seg in result["segments"]:
    speaker = seg.get("speaker", "SPEAKER_UNKNOWN")
    start = seg.get("start", 0)
    end = seg.get("end", 0)
    text = seg.get("text", "").strip()
    lines.append(f"[{start:.2f}-{end:.2f}] {speaker}: {text}")

out_txt = audio_file + ".speaker_transcript.txt"
with open(out_txt, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(out_txt)
