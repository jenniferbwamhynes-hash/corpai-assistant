const Anthropic = require('@anthropic-ai/sdk');

class ClaudeClient {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  async query(prompt, context = []) {
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

    // Use 0-based index to match the array order returned by the vector DB.
    // Previously used 1-based labels which caused every citation to reference
    // the document at position n+1 instead of n after a reindex (CORPAI-30).
    const contextStr = context.map((doc, index) =>
      `[${index}] Source: ${doc.title}\n${doc.content}`
    ).join('\n\n');

    const sourceList = context.map((doc, index) =>
      `[${index}] ${doc.title}`
    ).join(', ');

    return `You are a helpful internal assistant. Answer the question using only the provided context. \
Cite your sources inline using [index] notation (e.g. [0], [1]).

Available sources: ${sourceList}

Context:
${contextStr}

Question: ${query}

Answer (with inline citations):`;
  }
}

module.exports = ClaudeClient;
