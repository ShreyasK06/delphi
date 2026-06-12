import type { ChatMessage, Profile } from '../../types'

/**
 * Seam for the coaching backend. The mock implementation is rule-based;
 * a real implementation would proxy to the Claude API with the delphi coach
 * system prompt and the serialized profile injected as context.
 */
export interface CoachAdapter {
  send(profile: Profile, history: ChatMessage[], message: string): Promise<string>
}
