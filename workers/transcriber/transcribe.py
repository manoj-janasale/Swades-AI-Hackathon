import argparse
import sys
from pathlib import Path

from faster_whisper import WhisperModel


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Transcribe an audio file with Faster Whisper")
    parser.add_argument("audio_file", help="Path to the audio file to transcribe")
    parser.add_argument("output_file", help="Path to write the transcript")
    parser.add_argument("--model", default="small", help="Whisper model size")
    parser.add_argument("--device", default="cpu", help="Device to run the model on")
    parser.add_argument("--compute_type", default="int8", help="Compute type for the model")
    parser.add_argument("--language", default="en", help="Language to transcribe")
    parser.add_argument("--no_vad", dest="vad_filter", action="store_false", help="Disable VAD filtering")
    parser.set_defaults(vad_filter=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    audio_file = Path(args.audio_file)
    output_file = Path(args.output_file)

    if not audio_file.exists():
        print(f"Audio file not found: {audio_file}", file=sys.stderr)
        return 1

    model = WhisperModel(args.model, device=args.device, compute_type=args.compute_type)
    segments, _ = model.transcribe(
        str(audio_file),
        language=args.language,
        task="transcribe",
        vad_filter=args.vad_filter,
    )

    text = " ".join(segment.text.strip() for segment in segments).strip()
    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(text, encoding="utf-8")

    print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
