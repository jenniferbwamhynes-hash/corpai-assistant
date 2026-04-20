const fs = require('fs').promises;
const pdf = require('pdf-parse');

class DocumentIngestion {
  constructor(vectorDB, claudeClient) {
    this.vectorDB = vectorDB;
    this.claudeClient = claudeClient;
  }

  async processPDF(filePath) {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);

    // Chunk text into manageable pieces
    const chunks = this.chunkText(data.text, 500);

    return chunks.map((chunk, idx) => ({
      id: `${filePath}-chunk-${idx}`,
      content: chunk,
      title: filePath,
      source: 'pdf'
    }));
  }

  chunkText(text, chunkSize) {
    const words = text.split(' ');
    const chunks = [];

    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(' '));
    }

    return chunks;
  }

  async generateEmbedding(text) {
    // In production, use Claude or dedicated embedding model
    // Placeholder for now
    return Array(1536).fill(0).map(() => Math.random());
  }

  async ingestDocument(filePath) {
    const chunks = await this.processPDF(filePath);

    for (const chunk of chunks) {
      chunk.embedding = await this.generateEmbedding(chunk.content);
    }

    await this.vectorDB.upsertDocuments(chunks);
    console.log(`Ingested ${chunks.length} chunks from ${filePath}`);
  }
}

module.exports = DocumentIngestion;
