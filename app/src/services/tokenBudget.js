/**
 * Token budget utility for AI context management.
 * Estimates token usage and builds prompts that respect provider limits.
 */

const CHARS_PER_TOKEN = 4

/**
 * Estimate token count from text (~4 chars per token average).
 * @param {string} text
 * @returns {number}
 */
export function estimateTokens(text) {
  if (!text) return 0
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

/**
 * Default context windows by provider (tokens).
 */
export const PROVIDER_DEFAULTS = {
  google: 1000000,
  openai: 128000,
  anthropic: 200000,
  openrouter: 128000,
  local: 8000,
}

/**
 * Truncate text to a token budget, adding an indicator when truncated.
 * @param {string} text
 * @param {number} maxTokens
 * @returns {{ text: string, truncated: boolean, originalTokens: number }}
 */
export function truncateToBudget(text, maxTokens) {
  if (!text) return { text: '', truncated: false, originalTokens: 0 }
  const originalTokens = estimateTokens(text)
  if (originalTokens <= maxTokens) {
    return { text, truncated: false, originalTokens }
  }
  const maxChars = maxTokens * CHARS_PER_TOKEN
  const truncated = text.slice(0, maxChars)
  return {
    text: truncated + '\n\n[... truncado para ajustarse al límite del modelo ...]',
    truncated: true,
    originalTokens,
  }
}

/**
 * Build AI context respecting a token budget.
 * Priority: prompt > compendium (always full) > sceneText > ragFragments.
 *
 * @param {Object} params
 * @param {string} params.prompt      - The instruction/template (never truncated)
 * @param {string} params.compendium  - Compendium data (always sent in full)
 * @param {string} params.sceneText   - Current scene text (truncated if needed)
 * @param {string[]} params.ragFragments - RAG-retrieved fragments (truncated last)
 * @param {number} maxTokens          - Total input token budget
 * @returns {{ prompt: string, compendium: string, sceneText: string, ragFragments: string[], warnings: string[], truncated: boolean }}
 */
export function buildContextWithBudget({ prompt, compendium, sceneText, ragFragments }, maxTokens) {
  const warnings = []
  let truncated = false

  const promptTokens = estimateTokens(prompt)
  const compendiumTokens = estimateTokens(compendium)

  // Prompt and compendium are always included in full
  let remaining = maxTokens - promptTokens - compendiumTokens
  if (remaining < 0) remaining = 0

  // Scene text gets next priority
  const sceneResult = truncateToBudget(sceneText || '', remaining)
  remaining -= sceneResult.originalTokens
  if (sceneResult.truncated) {
    truncated = true
    warnings.push(`Scene text truncated from ${sceneResult.originalTokens} to ~${estimateTokens(sceneResult.text)} tokens`)
  }
  if (remaining < 0) remaining = 0

  // RAG fragments with whatever remains
  let finalFragments = []
  if (ragFragments && ragFragments.length > 0) {
    const fragmentTexts = []
    let usedTokens = 0
    for (const frag of ragFragments) {
      const fragTokens = estimateTokens(frag)
      if (usedTokens + fragTokens <= remaining) {
        fragmentTexts.push(frag)
        usedTokens += fragTokens
      } else {
        // Try to fit a truncated version
        const budgetLeft = remaining - usedTokens
        if (budgetLeft > 50) {
          const { text } = truncateToBudget(frag, budgetLeft)
          fragmentTexts.push(text)
          truncated = true
          warnings.push('Some RAG fragments were truncated')
        }
        break
      }
    }
    if (ragFragments.length > fragmentTexts.length) {
      truncated = true
      warnings.push(`RAG fragments reduced from ${ragFragments.length} to ${fragmentTexts.length}`)
    }
    finalFragments = fragmentTexts
  }

  return {
    prompt,
    compendium: compendium || '',
    sceneText: sceneResult.text,
    ragFragments: finalFragments,
    warnings,
    truncated,
  }
}
