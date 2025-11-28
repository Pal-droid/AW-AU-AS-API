import { type NextRequest, NextResponse } from "next/server"
import { spawn } from "child_process"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const m3u8Url = searchParams.get("url")

  if (!m3u8Url) {
    return new NextResponse("Missing m3u8 URL", { status: 400 })
  }

  try {
    console.log("[v0] Converting m3u8 stream:", m3u8Url)

    const ffmpeg = spawn("ffmpeg", [
      "-i",
      m3u8Url,
      "-c",
      "copy",
      "-f",
      "mp4",
      "-movflags",
      "frag_keyframe+empty_moov+default_base_moof",
      "-frag_duration",
      "2000000",
      "-",
    ])

    // Set response headers for streaming video
    const headers = new Headers({
      "Content-Type": "video/mp4",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Range, Content-Range, Content-Length",
    })

    // Handle range requests for video seeking
    const range = request.headers.get("range")
    if (range) {
      headers.set("Accept-Ranges", "bytes")
      headers.set("Content-Range", "bytes */*")
    }

    let hasStarted = false
    let errorOccurred = false

    // Create readable stream from ffmpeg output
    const stream = new ReadableStream({
      start(controller) {
        ffmpeg.stdout.on("data", (chunk) => {
          if (!hasStarted) {
            hasStarted = true
            console.log("[v0] FFmpeg started streaming data")
          }
          controller.enqueue(new Uint8Array(chunk))
        })

        ffmpeg.stdout.on("end", () => {
          console.log("[v0] FFmpeg stdout ended")
          controller.close()
        })

        ffmpeg.stderr.on("data", (data) => {
          const errorText = data.toString()
          console.log("[v0] FFmpeg stderr:", errorText)

          // Check for critical errors
          if (
            errorText.includes("No such file or directory") ||
            errorText.includes("Permission denied") ||
            errorText.includes("Invalid data found")
          ) {
            errorOccurred = true
          }
        })

        ffmpeg.on("error", (error) => {
          console.error("[v0] FFmpeg spawn error:", error)
          errorOccurred = true
          controller.error(error)
        })

        ffmpeg.on("close", (code) => {
          console.log("[v0] FFmpeg process closed with code:", code)
          if (code !== 0 && !hasStarted) {
            console.error("[v0] FFmpeg failed to start conversion")
            controller.error(new Error(`FFmpeg process failed with code ${code}`))
          }
        })

        const timeout = setTimeout(() => {
          if (!hasStarted && !errorOccurred) {
            console.error("[v0] FFmpeg timeout - no data received")
            ffmpeg.kill("SIGTERM")
            controller.error(new Error("FFmpeg conversion timeout"))
          }
        }, 10000) // 10 second timeout

        ffmpeg.on("close", () => {
          clearTimeout(timeout)
        })
      },
      cancel() {
        console.log("[v0] Stream cancelled, killing ffmpeg")
        ffmpeg.kill("SIGTERM")
      },
    })

    return new NextResponse(stream, {
      status: range ? 206 : 200,
      headers,
    })
  } catch (error) {
    console.error("[v0] Error converting m3u8:", error)
    return new NextResponse("Error converting stream", { status: 500 })
  }
}

export async function HEAD(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const m3u8Url = searchParams.get("url")

  if (!m3u8Url) {
    return new NextResponse("Missing m3u8 URL", { status: 400 })
  }

  try {
    // Quick test to see if ffmpeg is available
    const testProcess = spawn("ffmpeg", ["-version"])

    return new Promise((resolve) => {
      testProcess.on("close", (code) => {
        if (code === 0) {
          resolve(new NextResponse(null, { status: 200 }))
        } else {
          resolve(new NextResponse("FFmpeg not available", { status: 503 }))
        }
      })

      testProcess.on("error", () => {
        resolve(new NextResponse("FFmpeg not available", { status: 503 }))
      })

      // Timeout after 2 seconds
      setTimeout(() => {
        testProcess.kill()
        resolve(new NextResponse("FFmpeg test timeout", { status: 503 }))
      }, 2000)
    })
  } catch (error) {
    return new NextResponse("FFmpeg not available", { status: 503 })
  }
}
