const FALLBACK_RESPONSE = "I don't have information on that topic. " +
  "For this question, please reach out to HR or IT directly — they'll be happy to help.";

class QueryHandler {
  constructor(vectorDB, claudeClient) {
    this.vectorDB = vectorDB;
    this.claudeClient = claudeClient;
  }

  async answer(userQuery) {
    const results = await this.vectorDB.search(userQuery);

    // Return a graceful fallback instead of letting an empty context
    // propagate to Claude and produce an empty Slack post (CORPAI-31).
    if (!results || results.length === 0) {
      return FALLBACK_RESPONSE;
    }

    return this.claudeClient.query(userQuery, results);
  }
}

module.exports = { QueryHandler, FALLBACK_RESPONSE };
