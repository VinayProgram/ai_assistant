export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  promptPath: '/prompt',
}

export function getPromptApiUrl() {
  return `${API_CONFIG.baseUrl}${API_CONFIG.promptPath}`
}
