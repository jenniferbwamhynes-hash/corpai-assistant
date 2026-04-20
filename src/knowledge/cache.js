class QueryCache {
  constructor(redis) {
    this.redis = redis;
    this.ttl = 3600; // 1 hour
  }

  async get(query) {
    const key = `cache:${this.hashQuery(query)}`;
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async set(query, results) {
    const key = `cache:${this.hashQuery(query)}`;
    await this.redis.setex(key, this.ttl, JSON.stringify(results));
  }

  hashQuery(query) {
    // Simple hash for demo
    return query.toLowerCase().replace(/\s+/g, '-');
  }
}

module.exports = QueryCache;
