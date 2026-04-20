class Logger {
  static log(level, message, metadata = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...metadata
    };

    console.log(JSON.stringify(entry));

    // In production, send to logging service
  }

  static info(message, metadata) {
    this.log('INFO', message, metadata);
  }

  static error(message, metadata) {
    this.log('ERROR', message, metadata);
  }

  static warn(message, metadata) {
    this.log('WARN', message, metadata);
  }
}

module.exports = Logger;
