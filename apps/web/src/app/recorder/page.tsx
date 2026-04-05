"use client"

import { useCallback, useRef, useState, type ChangeEvent } from "react"
import { Download, Mic, Pause, Play, Square, Trash2, UploadCloud, ArrowDownCircle } from "lucide-react"

import { Button } from "@my-better-t-app/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@my-better-t-app/ui/components/card"
import { LiveWaveform } from "@/components/ui/live-waveform"
import { useRecorder, type WavChunk } from "@/hooks/use-recorder"

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${ms}`
}

function formatDuration(seconds: number) {
  return `${seconds.toFixed(1)}s`
}

function ChunkRow({ chunk, index }: { chunk: WavChunk; index: number }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)

  const toggle = () => {
    const el = audioRef.current
    if (!el) return
    if (playing) {
      el.pause()
      el.currentTime = 0
      setPlaying(false)
    } else {
      el.play()
      setPlaying(true)
    }
  }

  const download = () => {
    const a = document.createElement("a")
    a.href = chunk.url
    a.download = `chunk-${index + 1}.wav`
    a.click()
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-sm border border-border/50 bg-muted/30 px-3 py-2">
      <audio
        ref={audioRef}
        src={chunk.url}
        onEnded={() => setPlaying(false)}
        preload="none"
      />
      <span className="text-xs font-medium text-muted-foreground tabular-nums">
        #{index + 1}
      </span>
      <span className="text-xs tabular-nums">{formatDuration(chunk.duration)}</span>
      <span className="text-[10px] text-muted-foreground">16kHz PCM</span>
      <div className="ml-auto flex gap-1">
        <Button variant="ghost" size="icon-xs" onClick={toggle}>
          {playing ? <Square className="size-3" /> : <Play className="size-3" />}
        </Button>
        <Button variant="ghost" size="icon-xs" onClick={download}>
          <Download className="size-3" />
        </Button>
      </div>
    </div>
  )
}

export default function RecorderPage() {
  const [deviceId] = useState<string | undefined>()
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [transcribeStatus, setTranscribeStatus] = useState<string | null>(null)
  const [transcriptResults, setTranscriptResults] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const { status, start, stop, pause, resume, chunks, elapsed, stream, clearChunks } =
    useRecorder({ chunkDuration: 5, deviceId })

  const isRecording = status === "recording"
  const isPaused = status === "paused"
  const isActive = isRecording || isPaused

  const handlePrimary = useCallback(() => {
    if (isActive) {
      stop()
    } else {
      start()
    }
  }, [isActive, stop, start])

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleAudioFileSelected = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) {
      return
    }

    setUploadStatus(`Uploading ${files.length} file(s)...`)
    setTranscriptResults([])

    const results: string[] = []
    const errors: string[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setUploadStatus(`Uploading ${i + 1}/${files.length}: ${file.name}...`)

        const formData = new FormData()
        formData.append("audio", file)
        const recordingId = file.name.replace(/\.[^/.]+$/, "")
        formData.append("recordingId", recordingId)

        try {
          const response = await fetch("/upload", {
            method: "POST",
            body: formData,
          })

          if (!response.ok) {
            const text = await response.text()
            throw new Error(text || response.statusText)
          }

          const result = await response.json()
          results.push(`${result.audioFile}: ${result.transcriptText || "(no transcript)"}")`)
        } catch (error) {
          errors.push(`${file.name}: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      setTranscriptResults(results.length > 0 ? results : errors)
      if (errors.length > 0) {
        setUploadStatus(`Uploaded ${results.length}/${files.length} files. Errors: ${errors.length}`)
      } else {
        setUploadStatus(`Successfully uploaded and transcribed ${results.length} file(s)`)
      }
    } catch (error) {
      setUploadStatus(`Upload failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }, [])

  const handleTranscribeAll = useCallback(async () => {
    setTranscribeStatus("Transcribing all audio files...")
    setTranscriptResults([])

    try {
      const response = await fetch("/transcribe-all", {
        method: "POST",
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || response.statusText)
      }

      const result = await response.json()
      const transcripts = result.transcribed?.map((item: any) => `(${item.audioFile}) ${item.transcriptText}`) ?? []
      setTranscriptResults(transcripts)
      setTranscribeStatus(`Transcribed ${transcripts.length} files.`)
    } catch (error) {
      setTranscribeStatus(`Transcribe-all failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }, [])

  return (
    <div className="container mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Recorder</CardTitle>
          <CardDescription>16 kHz / 16-bit PCM WAV — chunked every 5 s</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          {/* Waveform */}
          <div className="overflow-hidden rounded-sm border border-border/50 bg-muted/20 text-foreground">
            <LiveWaveform
              active={isRecording}
              processing={isPaused}
              stream={stream}
              height={80}
              barWidth={3}
              barGap={1}
              barRadius={2}
              sensitivity={1.8}
              smoothingTimeConstant={0.85}
              fadeEdges
              fadeWidth={32}
              mode="static"
            />
          </div>

          {/* Timer */}
          <div className="text-center font-mono text-3xl tabular-nums tracking-tight">
            {formatTime(elapsed)}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            {/* Record / Stop */}
            <Button
              size="lg"
              variant={isActive ? "destructive" : "default"}
              className="gap-2 px-5"
              onClick={handlePrimary}
              disabled={status === "requesting"}
            >
              {isActive ? (
                <>
                  <Square className="size-4" />
                  Stop
                </>
              ) : (
                <>
                  <Mic className="size-4" />
                  {status === "requesting" ? "Requesting..." : "Record"}
                </>
              )}
            </Button>

            {/* Pause / Resume */}
            {isActive && (
              <Button
                size="lg"
                variant="outline"
                className="gap-2"
                onClick={isPaused ? resume : pause}
              >
                {isPaused ? (
                  <>
                    <Play className="size-4" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="size-4" />
                    Pause
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Audio Upload & Transcription</CardTitle>
          <CardDescription>
            Upload a downloaded audio file to the server or transcribe all stored audio files.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            multiple
            className="hidden"
            onChange={handleAudioFileSelected}
          />

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              variant="default"
              className="gap-2"
              onClick={handleUploadClick}
            >
              <UploadCloud className="size-4" />
              Upload audio
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="gap-2"
              onClick={handleTranscribeAll}
            >
              <ArrowDownCircle className="size-4" />
              Transcribe all
            </Button>
          </div>

          {uploadStatus && (
            <div className="rounded-sm border border-border/50 bg-muted/20 px-4 py-3 text-sm text-foreground">
              {uploadStatus}
            </div>
          )}

          {transcribeStatus && (
            <div className="rounded-sm border border-border/50 bg-muted/20 px-4 py-3 text-sm text-foreground">
              {transcribeStatus}
            </div>
          )}

          {transcriptResults.length > 0 && (
            <div className="space-y-2 rounded-sm border border-border/50 bg-muted/20 p-4 text-sm text-foreground">
              <div className="font-medium">Transcript results</div>
              {transcriptResults.map((line, index) => (
                <div key={index} className="whitespace-pre-wrap break-words rounded-sm bg-background/80 p-2">
                  {line}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chunks */}
      {chunks.length > 0 && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Chunks</CardTitle>
            <CardDescription>{chunks.length} recorded</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {chunks.map((chunk, i) => (
              <ChunkRow key={chunk.id} chunk={chunk} index={i} />
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 gap-1.5 self-end text-destructive"
              onClick={clearChunks}
            >
              <Trash2 className="size-3" />
              Clear all
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
