import { GoogleGenAI, Modality } from "@google/genai";
import { ImageGenerationPrompt, StorytoImagesPrompt } from "./prompt";
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const LIZA_API_BASE_URL =
  import.meta.env.VITE_LIZA_API_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8000";

const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;
export type ImagePromptApiResponse = {
  response?: string;
  detail?: string;
  model?: string;
  provider_base_url?: string;
};

export type GenerateVisualPromptOptions = {
  storyText: string;
  useBackendPromptApi?: boolean;
};

export interface CharacterPrompts {
  [characterName: string]: string;
}

function cleanTextResponse(text: string) {
  const trimmed = text.trim();

  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json|text|markdown)?\s*/i, "").replace(/\s*```$/, "");
  }

  return trimmed;
}

function buildPromptPayload(storyText: string) {
  return {
    system_prompt: ImageGenerationPrompt,
    prompt: StorytoImagesPrompt(storyText),
    temperature: 0.4,
    max_tokens: 2000,
  };
}


export const parseCharacterPrompts = (rawResponse: string): CharacterPrompts => {
  const cleanedResponse = cleanTextResponse(rawResponse);

  try {
    return JSON.parse(cleanedResponse) as CharacterPrompts;
  } catch (error) {
    console.error("Failed to parse Character JSON:", error);

    try {
      const start = cleanedResponse.indexOf("{");
      const end = cleanedResponse.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        const potentialJson = cleanedResponse.substring(start, end + 1);
        return JSON.parse(potentialJson) as CharacterPrompts;
      }
    } catch (innerError) {
      console.error("Deep parse also failed:", innerError);
    }

    throw new Error("Gemini returned invalid character prompt JSON");
  }
};

async function generatePromptWithGemini(storyText: string): Promise<CharacterPrompts> {
  if (!ai) {
    throw new Error("Missing VITE_GEMINI_API_KEY");
  }

  const payload = buildPromptPayload(storyText);
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    // "gemini-2.5-flash",
    // "gemini-3.1-flash-preview"
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${payload.system_prompt}\n\n${payload.prompt}`,
          },
        ],
      },
    ],
  });

  const text = cleanTextResponse(response.text ?? "");
  if (!text) {
    throw new Error("Gemini returned an empty image prompt");
  }

  return parseCharacterPrompts(text);
}


export async function generateVisualPrompt({
  storyText
}: GenerateVisualPromptOptions): Promise<CharacterPrompts> {
  const trimmedStory = storyText.trim();
  if (!trimmedStory) {
    throw new Error("Story text is required");
  }
  if (ai) {
    return generatePromptWithGemini(trimmedStory);
  }

  throw new Error("Missing VITE_GEMINI_API_KEY");
}


export async function generateImagesPrompt(characters: string) {
  // Use the Flash Preview model for speed and specialized reasoning
  if (!ai) {
    throw new Error("Missing VITE_GEMINI_API_KEY");
  }
  try {
    const result = await ai.models.generateContent({
      model:  "gemini-2-5-flash-image-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: ImageGenerationPrompt(characters),
            },
          ],
        },
      ],
       config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
    },
    });
    console.log(result);
    // for (const part of result.candidates?[0].parts) {
    //   if (part.text) {
    //     console.log(part.text);
    //   } else if (part.inlineData) {
    //     const imageData = part.inlineData.data;
    //     const buffer = Buffer.from(imageData, "base64");
    //     fs.writeFileSync("gemini-native-image.png", buffer);
    //     console.log("Image saved as gemini-native-image.png");
    //   }
    // }
  } catch (error) {
    console.error("Error generating code/prompt:", error);
    return null;
  }
}

export { GEMINI_API_KEY, LIZA_API_BASE_URL };
