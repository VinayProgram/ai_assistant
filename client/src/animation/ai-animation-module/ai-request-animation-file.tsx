
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT, USER_PROMPT } from "./prompt";
const LIZA_API_BASE_URL = import.meta.env.VITE_LIZA_API_BASE_URL || 'http://localhost:8000'

const ai = new GoogleGenAI({apiKey:LIZA_API_BASE_URL});




const LIZA_PROMPT_API_URL = `${LIZA_API_BASE_URL}/prompt`

type LizaPromptApiResponse = {
  response?: string
  detail?: string
  model?: string
  provider_base_url?: string
}

export type PromptAnimationImageReference = {
  entityId: string
  characterId: string
  previewUrl: string
}

export type PromptAnimationResponse = {
  frames: Record<
    string,
    Record<
      string,
      {
        activeCharacter: string
        position: [number, number]
        rotation: number
        scale: [number, number]
        opacity: number
        visible: boolean
      }
    >
  >
}

function cleanJsonResponse(text: string) {
  const trimmed = text.trim()

  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
  }

  return trimmed
}

function parsePreviewDataUrl(previewUrl: string) {
  const match = previewUrl.match(/^data:(.+?);base64,(.+)$/)

  if (!match) {
    return null
  }

  return {
    mimeType: 'image/jpeg',
    data: match[2],
  }
}

export async function promptAnimation(
  entities: string,
  userPrompt: string = "create a dance move",
  imageReferences: PromptAnimationImageReference[] = []
): Promise<PromptAnimationResponse> {
  const parts: Array<Record<string, unknown>> = [
    {
      text: JSON.stringify({
        system_prompt: SYSTEM_PROMPT,
        prompt: USER_PROMPT(userPrompt, entities),
        temperature: 0.2,
        max_tokens: 6000,
      }),
    },
  ]

  for (const imageReference of imageReferences) {
    const parsedPreview = parsePreviewDataUrl(imageReference.previewUrl)
    if (!parsedPreview) {
      continue
    }
    console.log(parsedPreview)


    parts.push({
      text: `Reference image for entity "${imageReference.entityId}" character "${imageReference.characterId}". Use this visual appearance while generating animation frames.`,
    })
    parts.push({
      inlineData: {
        mimeType: parsedPreview.mimeType,
        data: parsedPreview.data,
      },
    })
  }
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        role: "user",
        parts,
      },
    ],
  });

  const rawText = response.text ?? ""
  const parsedPayload: LizaPromptApiResponse = {
    detail: rawText,
    response: cleanJsonResponse(rawText),
  }

  if (!parsedPayload.response) {
    throw new Error("Animation prompt returned an empty response")
  }

  try {
    return JSON.parse(parsedPayload.response) as PromptAnimationResponse
  } catch {
    throw new Error("Animation prompt returned invalid frame JSON")
  }
}

export { LIZA_API_BASE_URL, LIZA_PROMPT_API_URL }
