import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const TRANSCRIPT_API_BASE_URL =
  import.meta.env.VITE_TRANSCRIPT_API_BASE_URL || "http://127.0.0.1:8000";

const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

export type SignLanguagePromptResponse = {
  explanation: string;
  glossary: string[];
};

export type TranscriptApiResponse = {
  video_id: string;
  transcript: string;
};

const SYSTEM_PROMPT = `You are a sign language preprocessing and explanation system.

The user will provide a transcript from a YouTube video.
Your job is to:
1. Understand the transcript content.
2. Create a simplified version suitable for sign language.
3. Use vocabulary similar to WLASL dataset (simple gloss words).
4. Remove filler words.

Return output in STRICT JSON format:
{
  "explanation": "Detailed explanation in simple English",
  "glossary": [
    "word1 word2 word3",
    "word4 word5"
  ]
}

Rules:
- Keep glossary words simple and matchable to WLASL dataset
- Use lowercase words
- Avoid punctuation in glossary
- Explanation can be detailed but simple`;

const USER_PROMPT = (userPrompt: string, transcript: string) =>
  `User instruction: "${userPrompt}"

Video transcript:
${transcript}`;

function cleanJsonResponse(text: string) {
  const trimmed = text.trim();

  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  return trimmed;
}

function normalizeGlossaryEntry(value: string) {
  return value
    .toLowerCase()
    .replace(/^[a-z]+\s*:\s*/i, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchVideoTranscript(
  videoUrl: string
): Promise<TranscriptApiResponse> {
  const response = await fetch(`${TRANSCRIPT_API_BASE_URL}/api/transcript`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ video_url: videoUrl }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload.detail === "string"
        ? payload.detail
        : "Failed to fetch transcript";
    throw new Error(message);
  }

  if (
    !payload ||
    typeof payload.transcript !== "string" ||
    typeof payload.video_id !== "string"
  ) {
    throw new Error("Transcript server returned an invalid response");
  }

  return payload as TranscriptApiResponse;
}

export async function generateSignLanguagePrompt(
  transcript: string,
  userPrompt = "Summarize this transcript for sign language playback"
): Promise<SignLanguagePromptResponse> {
  if (!ai) {
    throw new Error("Missing VITE_GEMINI_API_KEY");
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${SYSTEM_PROMPT}\n\n${USER_PROMPT(userPrompt, transcript)}`,
          },
        ],
      },
    ],
  });

  const rawText = cleanJsonResponse(response.text ?? "");

  if (!rawText) {
    throw new Error("Gemini returned an empty response");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error("Gemini returned invalid JSON");
  }

  const explanation =
    typeof (parsed as SignLanguagePromptResponse).explanation === "string"
      ? (parsed as SignLanguagePromptResponse).explanation.trim()
      : "";
  const glossary = Array.isArray((parsed as SignLanguagePromptResponse).glossary)
    ? (parsed as SignLanguagePromptResponse).glossary
        .filter((item): item is string => typeof item === "string")
        .map((item) => normalizeGlossaryEntry(item))
        .filter(Boolean)
    : [];

  if (!explanation || glossary.length === 0) {
    throw new Error("Gemini response is missing explanation or glossary");
  }

  return {
    explanation,
    glossary,
  };
}

export { TRANSCRIPT_API_BASE_URL };
