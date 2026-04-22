import type { LizaActions } from './liza-types'

import { GoogleGenAI } from "@google/genai";
const LIZA_API_BASE_URL = import.meta.env.VITE_LIZA_API_BASE_URL || 'http://localhost:8000'
// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const ai = new GoogleGenAI({apiKey:LIZA_API_BASE_URL});




const LIZA_PROMPT_API_URL = `${LIZA_API_BASE_URL}/prompt`

type LizaPromptApiResponse = {
  response?: string
  detail?: string
  model?: string
  provider_base_url?: string
}

export function parseLizaActions(payload: LizaPromptApiResponse): LizaActions {
  if (!payload.response) {
    throw new Error(payload.detail || 'Liza prompt API returned no response')
  }

  try {
    return JSON.parse(payload.response) as LizaActions
  } catch {
    throw new Error('Liza prompt API returned invalid actions JSON')
  }
}

export async function promptLiza(prompt: string,userPrompt:string="create a dance move"): Promise<LizaActions> {
  // const response = await fetch(LIZA_PROMPT_API_URL, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     system_prompt: prompt,
  //     prompt:userPrompt,
  //     temperature: 0.2,
  //     max_tokens: 4000,
  //   }),
  // })

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: JSON.stringify({
      system_prompt: prompt,
      prompt:`please respond to the message using your body actions in the system prompt i have listed the bones you can control them and respond to the message : ${userPrompt}`,
      temperature: 0.2,
      max_tokens: 600,
    }),
  });
  console.log(response.text);

  // const payload = (await response.text) as LizaPromptApiResponse

  // if (!response.ok || !payload.response) {
  //   throw new Error(payload.detail || 'Liza prompt request failed')
  // }
const d:LizaPromptApiResponse={
  detail:response.text,
  response:response.text
}

  return parseLizaActions(d)
}

export { LIZA_API_BASE_URL, LIZA_PROMPT_API_URL }
