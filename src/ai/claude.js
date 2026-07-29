const Anthropic = require('@anthropic-ai/sdk');

class ClaudeClient {
  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async query(prompt, context = []) {
    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: this.buildPrompt(prompt, context) }]
    });
    return response.content[0].text;
  }

  // Streaming variant — calls onChunk(text) for each token delta.
  // Caller is responsible for batching updates to avoid Slack rate limits.
  async streamQuery(prompt, context = [], onChunk) {
    const stream = await this.client.messages.stream({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: this.buildPrompt(prompt, context) }]
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' &&
          chunk.delta?.type === 'text_delta') {
        onChunk(chunk.delta.text);
      }
    }

    return await stream.finalMessage();
  }

  buildPrompt(query, context) {
    if (context.length === 0) return query;
    const contextStr = context.map((doc, i) =>
      `[${i}] Source: ${doc.title}\n${doc.content}`
    ).join('\n\n');
    const sourceList = context.map((doc, i) => `[${i}] ${doc.title}`).join(', ');
    return `You are a helpful internal assistant. Answer using only the provided context. Cite sources inline using [index] notation.

Available sources: ${sourceList}

Context:
${contextStr}

Question: ${query}

Answer (with inline citations):`;
  }
}

module.exports = ClaudeClient;
