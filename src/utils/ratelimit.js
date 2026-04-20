class RateLimiter {
  constructor(redis) {
    this.redis = redis;
    this.windowSeconds = 3600; // 1 hour
    this.maxRequests = 20;
  }

  async checkLimit(userId) {
    const key = `ratelimit:${userId}`;
    const current = await this.redis.get(key);

    if (!current) {
      await this.redis.setex(key, this.windowSeconds, 1);
      return { allowed: true, remaining: this.maxRequests - 1 };
    }

    const count = parseInt(current);
    if (count >= this.maxRequests) {
      const ttl = await this.redis.ttl(key);
      return {
        allowed: false,
        remaining: 0,
        resetIn: ttl
      };
    }

    await this.redis.incr(key);
    return {
      allowed: true,
      remaining: this.maxRequests - count - 1
    };
  }
}

module.exports = RateLimiter;
