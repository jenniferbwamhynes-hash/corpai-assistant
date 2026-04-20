class ConversationMemory {
  constructor() {
    this.conversations = new Map();
  }

  getHistory(userId, limit = 10) {
    if (!this.conversations.has(userId)) {
      return [];
    }
    return this.conversations.get(userId).slice(-limit);
  }

  addMessage(userId, role, content) {
    if (!this.conversations.has(userId)) {
      this.conversations.set(userId, []);
    }

    this.conversations.get(userId).push({
      role,
      content,
      timestamp: Date.now()
    });

    // Keep only last 50 messages per user
    if (this.conversations.get(userId).length > 50) {
      this.conversations.get(userId).shift();
    }
  }

  clearHistory(userId) {
    this.conversations.delete(userId);
  }
}

module.exports = ConversationMemory;
