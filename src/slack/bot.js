const { App } = require('@slack/bolt');
const ClaudeClient = require('../ai/claude');
const VectorDB = require('../knowledge/vectordb');
const Embedder = require('../knowledge/embedder');

const app = new App({ token: process.env.SLACK_BOT_TOKEN, signingSecret: process.env.SLACK_SIGNING_SECRET });
const claude = new ClaudeClient();
const vectorDB = new VectorDB();
const embedder = new Embedder();

const inFlight = new Map();
const IN_FLIGHT_TTL_MS = 10_000;
const UPDATE_INTERVAL_MS = 600;

function isInFlight(userId, messageTs) {
  const entry = inFlight.get(userId);
  if (!entry) return false;
  if (Date.now() > entry.expires) { inFlight.delete(userId); return false; }
  return entry.messageTs === messageTs;
}
function markInFlight(userId, messageTs) {
  inFlight.set(userId, { messageTs, expires: Date.now() + IN_FLIGHT_TTL_MS });
}
function clearInFlight(userId) { inFlight.delete(userId); }

async function safeUpdate(client, channel, ts, text) {
  try {
    await client.chat.update({ channel, ts, text });
  } catch (err) {
    if (err.data?.error !== 'ratelimited') throw err;
  }
}

app.event('app_mention', async ({ event, client }) => {
  const userId = event.user;
  const messageTs = event.ts;

  if (isInFlight(userId, messageTs)) return;
  markInFlight(userId, messageTs);

  const query = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();

  // Post placeholder immediately so the user sees feedback within ~300ms
  const placeholder = await client.chat.postMessage({
    channel: event.channel,
    thread_ts: event.ts,
    text: '_Thinking\u2026_'
  });

  let buffer = '';
  let lastUpdate = Date.now();

  try {
    await vectorDB.init();
    const embedding = await embedder.embed(query);
    const userRole = event.user_role || 'employee';
    const context = await vectorDB.search(embedding, 5, userRole);

    await claude.streamQuery(query, context, async (chunk) => {
      buffer += chunk;
      if (Date.now() - lastUpdate >= UPDATE_INTERVAL_MS) {
        await safeUpdate(client, event.channel, placeholder.ts, buffer + ' \u258c');
        lastUpdate = Date.now();
      }
    });

    // Final update — complete text, no cursor
    await safeUpdate(client, event.channel, placeholder.ts, buffer);
  } catch (err) {
    console.error('Streaming error:', err);
    await safeUpdate(client, event.channel, placeholder.ts,
      '\u26a0\ufe0f Something went wrong processing your request. Please try again.');
  } finally {
    clearInFlight(userId);
  }
});

(async () => {
  await vectorDB.init();
  await app.start(process.env.PORT || 3000);
  console.log('CorpAI bot is running (streaming mode)');
})();
