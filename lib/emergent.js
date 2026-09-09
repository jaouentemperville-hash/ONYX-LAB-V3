// Direct Gemini API integration - no proxy, no budget limits, free tier.
// Uses the user's own Google AI Studio API key.

const GEMINI_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-pro-preview'
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'

export async function chat({ system, prompt, model = GEMINI_MODEL, temperature = 0.7 }) {
  if (!GEMINI_KEY) throw new Error('GEMINI_API_KEY missing')

  const url = `${GEMINI_ENDPOINT}/${model}:generateContent?key=${GEMINI_KEY}`
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    systemInstruction: system ? { parts: [{ text: system }] } : undefined,
    generationConfig: {
      temperature,
      responseMimeType: 'application/json',
    },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  })

  const data = await res.json()
  if (!res.ok) {
    const msg = data?.error?.message || `HTTP ${res.status}`
    throw new Error(`Gemini error: ${msg}`)
  }

  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('') || ''
  return text
}

export function extractJson(text) {
  if (!text) return null
  // Try fenced ```json ... ``` first
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fence ? fence[1] : text
  const first = candidate.indexOf('{')
  const last = candidate.lastIndexOf('}')
  if (first === -1 || last === -1) {
    try { return JSON.parse(candidate) } catch { return null }
  }
  try {
    return JSON.parse(candidate.slice(first, last + 1))
  } catch {
    return null
  }
}
