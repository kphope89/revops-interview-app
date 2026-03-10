/**
 * Extracts the partial suggestedResponse text from a streaming JSON blob.
 * Claude streams JSON character-by-character, so this parses the partial accumulation.
 */
export function extractStreamingResponse(accumulatedText: string): string {
  const marker = '"suggestedResponse": "'
  const idx = accumulatedText.indexOf(marker)
  if (idx === -1) return ''
  const raw = accumulatedText.slice(idx + marker.length)
  const completeMatch = raw.match(/^([\s\S]*?)",?\s*"toolsToMention"/)
  const content = completeMatch ? completeMatch[1] : raw
  return content
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}
