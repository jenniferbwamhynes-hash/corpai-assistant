const fs = require('fs');
const path = require('path');
const { classifyDocument } = require('../security/accessControl');

class DocumentIngestor {
  constructor(vectorDB, embedder) {
    this.vectorDB = vectorDB;
    this.embedder = embedder;
  }

  async ingestFile(filePath) {
    const title = path.basename(filePath, path.extname(filePath));
    const content = fs.readFileSync(filePath, 'utf8');
    const accessLevel = classifyDocument(title, content);

    // Purge any existing chunks for this title before inserting new ones.
    // Re-ingesting without deletion leaves stale versions in the vector DB,
    // causing Claude to cite contradictory information from old and new
    // copies of the same document simultaneously (CORPAI-36).
    await this.vectorDB.deleteByTitle(title);

    const ingestedAt = new Date().toISOString();
    const chunks = this.chunkText(content);
    const documents = await Promise.all(chunks.map(async (chunk, i) => ({
      id: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-chunk-${i}`,
      title,
      content: chunk,
      source: filePath,
      accessLevel,
      ingestedAt,
      embedding: await this.embedder.embed(chunk),
    })));

    await this.vectorDB.upsertDocuments(documents);
    const label = accessLevel >= 3 ? ' [CONFIDENTIAL]' : '';
    console.log(`Ingested: ${title}${label} (${chunks.length} chunks, ${ingestedAt})`);
  }

  chunkText(text, maxWords = 500) {
    const words = text.split(/\s+/);
    const chunks = [];
    for (let i = 0; i < words.length; i += maxWords) {
      chunks.push(words.slice(i, i + maxWords).join(' '));
    }
    return chunks;
  }
}

module.exports = DocumentIngestor;
