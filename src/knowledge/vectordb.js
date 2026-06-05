const { PineconeClient } = require('@pinecone-database/pinecone');

class VectorDB {
  constructor() {
    this.client = new PineconeClient();
    this.indexName = process.env.PINECONE_INDEX || 'corpai-knowledge';
  }

  async init() {
    await this.client.init({
      apiKey: process.env.PINECONE_API_KEY,
      environment: process.env.PINECONE_ENVIRONMENT
    });
    this.index = this.client.Index(this.indexName);
  }

  async upsertDocuments(documents) {
    const vectors = documents.map(doc => ({
      id: doc.id,
      values: doc.embedding,
      metadata: {
        title: doc.title,
        content: doc.content,
        source: doc.source,
        accessLevel: doc.accessLevel ?? 1,
        ingestedAt: doc.ingestedAt
      }
    }));
    await this.index.upsert({ vectors });
  }

  // Delete all chunks belonging to a document title before re-ingesting.
  // Without this, updated documents accumulate stale duplicates that cause
  // Claude to synthesize contradictory answers from old and new versions (CORPAI-36).
  async deleteByTitle(title) {
    const slugTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const results = await this.index.query({
      vector: new Array(1536).fill(0),
      topK: 200,
      includeMetadata: true,
      filter: { title: { '\$eq': title } }
    });
    const ids = (results.matches || []).map(m => m.id);
    if (ids.length > 0) {
      await this.index.delete1({ ids });
      console.log(`Deleted ${ids.length} stale chunks for "${title}"`);
    }
    return ids.length;
  }

  async search(queryEmbedding, topK = 5, userRole = 'employee') {
    const ACCESS_CEILING = { employee: 1, manager: 2, hr_director: 3, admin: 3 };
    const maxLevel = ACCESS_CEILING[userRole] ?? 1;

    const results = await this.index.query({
      vector: queryEmbedding,
      topK: topK * 2,
      includeMetadata: true,
      filter: { accessLevel: { '\$lte': maxLevel } }
    });

    const seen = new Set();
    return results.matches
      .filter(m => { const t = m.metadata.title; if (seen.has(t)) return false; seen.add(t); return true; })
      .slice(0, topK)
      .map(m => ({ score: m.score, title: m.metadata.title, content: m.metadata.content, source: m.metadata.source }));
  }
}

module.exports = VectorDB;
