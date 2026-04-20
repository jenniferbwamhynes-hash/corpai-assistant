const Anthropic = require('@anthropic-ai/sdk');

class ClaudeClient {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  async query(prompt, context = []) {
    // RAG implementation - inject context into prompt
    const fullPrompt = this.buildPrompt(prompt, context);

    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: fullPrompt }]
    });

    return response.content[0].text;
  }

  buildPrompt(query, context) {
    if (context.length === 0) return query;

    const contextStr = context.map(doc =>
      `Source: ${doc.title}\n${doc.content}`
    ).join('\n\n');

    return `Answer the following question using only the provided context. Cite your sources.

Context:
${contextStr}

Question: ${query}`;
  }
}

module.exports = ClaudeClient;
