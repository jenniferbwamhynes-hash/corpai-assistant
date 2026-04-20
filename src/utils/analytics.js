class Analytics {
  static trackQuery(userId, query, responseTime, success) {
    // Track query metrics
    console.log('METRIC:', {
      type: 'query',
      userId,
      queryLength: query.length,
      responseTime,
      success,
      timestamp: Date.now()
    });

    // In production, send to analytics service
  }

  static trackFeedback(userId, messageId, rating) {
    console.log('METRIC:', {
      type: 'feedback',
      userId,
      messageId,
      rating,
      timestamp: Date.now()
    });
  }
}

module.exports = Analytics;
