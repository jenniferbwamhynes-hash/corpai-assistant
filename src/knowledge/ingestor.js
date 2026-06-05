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

    // Classify before ingesting — confidential docs get tagged so the
    // access control layer can filter them out of employee-facing queries.
    const accessLevel = classifyDocument(title, content);

    const chunks = this.chunkText(content);
    const documents = await Promise.all(chunks.map(async (chunk, i) => ({
      id: `${title}-chunk-${i}`,
      title,
      content: chunk,
      source: filePath,
      accessLevel,
      embedding: await this.embedder.embed(chunk),
    })));

    await this.vectorDB.upsertDocuments(documents);
    const label = accessLevel >= 3 ? ' [CONFIDENTIAL — restricted]' : '';
    console.log(`Ingested: ${title}${label} (${chunks.length} chunks)`);
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
