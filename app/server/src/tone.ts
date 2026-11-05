export type AITone = 'friendly' | 'concise' | 'coach'

export function toneInstructions(tone: AITone | string | undefined): string {
  switch (tone) {
    case 'concise':
      return `## Tone preference: concise
Keep replies to 1 short sentence when possible. No pep talk. Confirm what you saved and where.`
    case 'coach':
      return `## Tone preference: coach
Be warm and motivating (1–2 short sentences). Celebrate progress lightly when they complete something. Still stay practical — never pad with fluff.`
    case 'friendly':
    default:
      return `## Tone preference: friendly
Warm, clear, conversational. 1–2 short sentences. Match the user's energy without being chatty.`
  }
}
