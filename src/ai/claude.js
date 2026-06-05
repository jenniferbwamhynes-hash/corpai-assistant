const Anthropic = require('@anthropic-ai/sdk');

const TRUNCATION_NOTICE =
  '\n\n_Note: This response was too long to display in full. For complete details, please refer to the relevant policy document directly or contact HR._';

class ClaudeClient {
  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';
  }

  async query(userQuery, contextDocs) {
    const context = contextDocs
      .map(doc => `[${doc.title}]\n${doc.content}`)
      .join('\n\n---\n\n');

    const systemPrompt =
      'You are CorpAI, an internal HR and IT assistant. Answer questions using only ' +
      'the provided knowledge base context. Be concise but complete. If the context ' +
      'does not contain the answer, say so clearly.';

    const message = await this.client.messages.create({
      model: this.model,
      // Raised from 512 — policy explanations regularly exceeded the old limit
      // and were posted to Slack truncated mid-sentence with no warning (CORPAI-35).
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Context:\n${context}\n\nQuestion: ${userQuery}`
        }
      ]
    });

    const text = message.content[0]?.text || '';

    // Detect hard truncation and append a notice so users know the answer
    // is incomplete rather than silently receiving a partial response.
    if (message.stop_reason === 'max_tokens') {
      return text + TRUNCATION_NOTICE;
    }

    return text;
  }
}

module.exports = ClaudeClient;
