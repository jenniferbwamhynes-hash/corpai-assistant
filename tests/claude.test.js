const ClaudeClient = require('../src/ai/claude');

describe('ClaudeClient', () => {
  test('buildPrompt includes context', () => {
    const client = new ClaudeClient();
    const context = [
      { title: 'HR Policy', content: 'PTO is 20 days per year' }
    ];

    const prompt = client.buildPrompt('How much PTO do I get?', context);

    expect(prompt).toContain('HR Policy');
    expect(prompt).toContain('PTO is 20 days per year');
  });

  test('buildPrompt works without context', () => {
    const client = new ClaudeClient();
    const prompt = client.buildPrompt('Hello', []);

    expect(prompt).toBe('Hello');
  });
});
