export type TicketImprovePromptInput = {
  title: string
  description: string
  acceptanceCriteria: string[]
  imagePlaceholders: string[]
  ticketType?: string
  userCommand?: string
}

export const TICKET_IMPROVE_SYSTEM_PROMPT = `You are an expert product manager and QA lead.
Your task is to improve a ticket description and produce clear acceptance criteria.

You must return ONLY valid JSON with the exact shape:
{
  "description": "<p>...</p>",
  "acceptanceCriteria": [
    { "text": "...", "completed": false }
  ]
}

Rules:
- Output JSON only. No markdown, no code fences, no extra text.
- Do not modify the title. Do not include a "title" field in the JSON.
- Keep description in simple HTML using <p>, <ul>, <ol>, <li>, <strong>, <em>.
- Use the provided image placeholders in the output and keep each placeholder exactly once.
- You may move placeholders to improve clarity, but do not alter their text.
- Do not invent specific dates, people, or metrics unless provided.
- Keep acceptance criteria concise and testable. Set completed to false for all items.
- If a ticket type is provided, format the description using the matching sections:
  - story: User Story statement in "As a ..., I want ..., so that ..." format and Context/Background (why this is needed, include client/legal notes if provided).
  - bug: Description (1-2 sentences), Steps to Reproduce (numbered), Expected Result, Actual Result, Environment (where it was found).
  - task, subtask, epic: Objective, Action Items, Definition of Done, Quick Rules for Success (3 bullets).
- Use <strong>Section:</strong> at the start of a <p> for section labels.
- If details are missing, keep sections brief and avoid guessing.`

export function buildTicketImprovePrompt(input: TicketImprovePromptInput): string {
  const description = input.description?.trim() || '(empty)'
  const criteria =
    input.acceptanceCriteria.length > 0
      ? input.acceptanceCriteria.map((item) => `- ${item}`).join('\n')
      : '(none)'
  const imagesNote = input.imagePlaceholders.length > 0
    ? `Image placeholders (keep all, you may move them): ${input.imagePlaceholders.join(', ')}`
    : 'No images provided.'
  const ticketType = input.ticketType?.trim() || '(unknown)'
  const userCommand = input.userCommand?.trim() || '(none)'

  return [
    `Ticket title: ${input.title}`,
    '(Title is context only; do not change it.)',
    `Ticket type: ${ticketType}`,
    '',
    'User command or extra context:',
    userCommand,
    '',
    `Current description (HTML or plain text):`,
    description,
    '',
    `Current acceptance criteria:`,
    criteria,
    '',
    imagesNote,
    '',
    'Improve the description and acceptance criteria based on the information above.',
  ].join('\n')
}
