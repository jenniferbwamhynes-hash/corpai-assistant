const { App } = require('@slack/bolt');

class SlackBot {
  constructor() {
    this.app = new App({
      token: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET
    });
  }

  async start(port = 3000) {
    await this.app.start(port);
    console.log(`⚡️ CorpAI Slack bot is running on port ${port}`);
  }
}

module.exports = SlackBot;
