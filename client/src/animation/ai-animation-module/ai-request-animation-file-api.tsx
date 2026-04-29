
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

export type AnimationEntitiesDocument = {
  "entityId": string
  "characterId": string
  "description": string
}[]
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

export async function breakPromptIntoScenes(prompt: string): Promise<string[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        text: JSON.stringify({
          system_prompt: "You are a helpful assistant that breaks down a user prompt into a list of distinct scenes for animation generation. Each scene should be a concise description of a single action or moment in the animation.",
          prompt: `Break down the following user prompt into a list of distinct scenes:\n\n"${prompt}"\n\nReturn the scenes as a JSON array of strings.`,
          temperature: 0.2,
          max_tokens: 2000,
        }),
      },
    ],
  });

  const rawText = response.text ?? ""
  const cleanedText = cleanJsonResponse(rawText)
  return JSON.parse(cleanedText) as string[]
}

export async function generateImagesSummarydescribingVisualReferences(imageReferences: PromptAnimationImageReference[]): Promise<AnimationEntitiesDocument> {
  if (imageReferences.length === 0) {
    return [] as AnimationEntitiesDocument
  }

  const parts: Array<Record<string, unknown>> = []

  for (const imageReference of imageReferences) {
    const parsedPreview = parsePreviewDataUrl(imageReference.previewUrl)
    if (!parsedPreview) {
      continue
    }

    parts.push({
      text: `Reference image for entity "${imageReference.entityId}" character "${imageReference.characterId}". Describe the visual appearance of this character based on the provided image. return json array with keys "entityId", "characterId", "description" where description is a concise summary of the character's visual appearance.`,
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

  return cleanJsonResponse(response.text ?? "") as unknown as AnimationEntitiesDocument
}

async function generateSceneWiseFrames(params: { scene: string; entities: AnimationEntitiesDocument,frameRate: number }): Promise<PromptAnimationResponse> {
  const parts: Array<Record<string, unknown>> = [
    {
      text: JSON.stringify({
        system_prompt: SYSTEM_PROMPT,
        prompt: USER_PROMPT(params.scene, params.entities, params.frameRate),
        temperature: 0.2,
        max_tokens: 6000,
      }),
    },
  ]

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        role: "user",
        parts,
      },
    ],
  });

  const cleanedResponse = cleanJsonResponse(response.text ?? "")

  try {
    return JSON.parse(cleanedResponse) as PromptAnimationResponse
  } catch {
    throw new Error("Animation prompt returned invalid frame JSON")
  }
  
}

export async function promptAnimation(
  entities: string,
  userPrompt: string = "create a dance move",
  imageReferences: PromptAnimationImageReference[] = [],
  frameRate: number = 10,
): Promise<PromptAnimationResponse> {
  const imagesSummary = await generateImagesSummarydescribingVisualReferences(imageReferences)
  const parsedEntities = JSON.parse(entities) as { entities?: Record<string, unknown> }
  const promptEntities =
    imagesSummary.length > 0
      ? imagesSummary
      : ((parsedEntities.entities
          ? Object.entries(parsedEntities.entities).map(([entityId, entity]) => {
              const typedEntity = entity as {
                defaultCharacter?: string
                characters?: Record<string, { label?: string }>
              }
              const fallbackCharacterId =
                typedEntity.defaultCharacter ?? Object.keys(typedEntity.characters ?? {})[0] ?? ""
              const fallbackCharacter = typedEntity.characters?.[fallbackCharacterId]

              return {
                entityId,
                characterId: fallbackCharacterId,
                description: fallbackCharacter?.label ?? "Character reference",
              }
            })
          : []) as AnimationEntitiesDocument)
  const scenes = await breakPromptIntoScenes(USER_PROMPT(userPrompt, promptEntities, frameRate))
  const mergedFrames: PromptAnimationResponse["frames"] = {}
  let lastFrameNumber = 0

  for (const scene of scenes) {
    const sceneResponse = await generateSceneWiseFrames({
      scene,
      entities: promptEntities,
      frameRate,
    })

    const sortedSceneFrames = Object.entries(sceneResponse.frames).sort(
      ([firstFrameId], [secondFrameId]) => Number(firstFrameId) - Number(secondFrameId)
    )

    for (const [frameId, frameValue] of sortedSceneFrames) {
      const nextFrameNumber = lastFrameNumber + Number(frameId)
      mergedFrames[String(nextFrameNumber)] = frameValue
    }

    if (sortedSceneFrames.length > 0) {
      lastFrameNumber += Number(sortedSceneFrames[sortedSceneFrames.length - 1][0])
    }
  }

  return {
    frames: mergedFrames,
  }
  // const parts: Array<Record<string, unknown>> = [
  //   {
  //     text: JSON.stringify({
  //       system_prompt: SYSTEM_PROMPT,
  //       prompt: USER_PROMPT(userPrompt, entities),
  //       temperature: 0.2,
  //       max_tokens: 6000,
  //     }),
  //   },
  // ]

  // for (const imageReference of imageReferences) {
  //   const parsedPreview = parsePreviewDataUrl(imageReference.previewUrl)
  //   if (!parsedPreview) {
  //     continue
  //   }
  //   console.log(parsedPreview)


  //   parts.push({
  //     text: `Reference image for entity "${imageReference.entityId}" character "${imageReference.characterId}". Use this visual appearance while generating animation frames.`,
  //   })
  //   parts.push({
  //     inlineData: {
  //       mimeType: parsedPreview.mimeType,
  //       data: parsedPreview.data,
  //     },
  //   })
  // }
  // const response = await ai.models.generateContent({
  //   model: "gemini-3-flash-preview",
  //   contents: [
  //     {
  //       role: "user",
  //       parts,
  //     },
  //   ],
  // });

  // const rawText = response.text ?? ""
  // const parsedPayload: LizaPromptApiResponse = {
  //   detail: rawText,
  //   response: cleanJsonResponse(rawText),
  // }

  // if (!parsedPayload.response) {
  //   throw new Error("Animation prompt returned an empty response")
  // }

  // try {
  //   return JSON.parse(parsedPayload.response) as PromptAnimationResponse
  // } catch {
  //   throw new Error("Animation prompt returned invalid frame JSON")
  // }
}

export { LIZA_API_BASE_URL, LIZA_PROMPT_API_URL }
