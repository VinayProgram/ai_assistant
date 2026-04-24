from __future__ import annotations

from urllib.parse import parse_qs, urlparse

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from youtube_transcript_api import (
    NoTranscriptFound,
    TranscriptsDisabled,
    VideoUnavailable,
    YouTubeTranscriptApi,
)


app = FastAPI(title="Transcript Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TranscriptRequest(BaseModel):
    video_url: str


class TranscriptResponse(BaseModel):
    video_id: str
    transcript: str


def extract_video_id(video_url: str) -> str | None:
    try:
        normalized_url = (
            video_url if video_url.startswith(("http://", "https://")) else f"https://{video_url}"
        )
        parsed_url = urlparse(normalized_url)
        host = parsed_url.netloc.replace("www.", "")

        if host == "youtu.be":
            return parsed_url.path.strip("/").split("/")[0] or None

        if host in {"youtube.com", "m.youtube.com"}:
            if parsed_url.path == "/watch":
                return parse_qs(parsed_url.query).get("v", [None])[0]

            if parsed_url.path.startswith("/shorts/"):
                parts = [part for part in parsed_url.path.split("/") if part]
                return parts[1] if len(parts) > 1 else None

            if parsed_url.path.startswith("/embed/"):
                parts = [part for part in parsed_url.path.split("/") if part]
                return parts[1] if len(parts) > 1 else None
    except Exception:
        return None

    return None


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/transcript", response_model=TranscriptResponse)
def fetch_transcript(payload: TranscriptRequest):
    video_id = extract_video_id(payload.video_url)

    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")

    try:
        transcript_items = YouTubeTranscriptApi().fetch(video_id)
    except (NoTranscriptFound, TranscriptsDisabled):
        raise HTTPException(status_code=404, detail="No transcript available for this video")
    except VideoUnavailable:
        raise HTTPException(status_code=404, detail="Video unavailable")
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch transcript: {error}")

    transcript_text = " ".join(item.text.strip() for item in transcript_items if item.text.strip())

    if not transcript_text:
        raise HTTPException(status_code=404, detail="Transcript is empty")

    return TranscriptResponse(video_id=video_id, transcript=transcript_text)
