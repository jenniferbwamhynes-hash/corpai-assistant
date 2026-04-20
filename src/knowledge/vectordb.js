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
        source: doc.source
      }
    }));

    await this.index.upsert({ vectors });
  }

  async search(queryEmbedding, topK = 5) {
    const results = await this.index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true
    });

    return results.matches.map(match => ({
      score: match.score,
      title: match.metadata.title,
      content: match.metadata.content,
      source: match.metadata.source
    }));
  }
}

module.exports = VectorDB;
