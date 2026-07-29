const { App } = require('@slack/bolt');
const ClaudeClient = require('../ai/claude');
const VectorDB = require('../knowledge/vectordb');
const Embedder = require('../knowledge/embedder');

const app = new App({ token: process.env.SLACK_BOT_TOKEN, signingSecret: process.env.SLACK_SIGNING_SECRET });
const claude = new ClaudeClient();
const vectorDB = new VectorDB();
const embedder = new Embedder();

// Track in-flight requests per user. Key: userId, value: { messageTs, expires }.
// Deduplicates rapid re-submits that would otherwise trigger multiple Claude calls
// and post identical responses back-to-back in the channel (CORPAI-38).
const inFlight = new Map();
const IN_FLIGHT_TTL_MS = 10_000;

function isInFlight(userId, messageTs) {
  const entry = inFlight.get(userId);
  if (!entry) return false;
  if (Date.now() > entry.expires) { inFlight.delete(userId); return false; }
  return entry.messageTs === messageTs;
}

function markInFlight(userId, messageTs) {
  inFlight.set(userId, { messageTs, expires: Date.now() + IN_FLIGHT_TTL_MS });
}

function clearInFlight(userId) {
  inFlight.delete(userId);
}

app.event('app_mention', async ({ event, say }) => {
  const userId = event.user;
  const messageTs = event.ts;

  // Deduplicate: if this user already has an identical in-flight request, drop silently.
  if (isInFlight(userId, messageTs)) {
    console.log(`[dedup] Dropped duplicate request from ${userId} (ts: ${messageTs})`);
    return;
  }
  markInFlight(userId, messageTs);

  const query = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();

  try {
    await vectorDB.init();
    const embedding = await embedder.embed(query);
    const userRole = event.user_role || 'employee';
    const context = await vectorDB.search(embedding, 5, userRole);
    const answer = await claude.query(query, context);
    await say({ text: answer, thread_ts: event.ts });
  } catch (err) {
    console.error('Error handling mention:', err);
    await say({ text: 'Sorry, I encountered an error processing your request. Please try again.', thread_ts: event.ts });
  } finally {
    clearInFlight(userId);
  }
});

(async () => {
  await vectorDB.init();
  await app.start(process.env.PORT || 3000);
  console.log('CorpAI bot is running');
})();
