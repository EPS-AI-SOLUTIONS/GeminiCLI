/**
 * SemanticCache - Feature #7
 * Semantic caching with embedding-based similarity matching
 */

import crypto from 'crypto';
import chalk from 'chalk';

export interface CacheEntry {
  query: string;
  queryEmbedding: number[];
  response: string;
  timestamp: Date;
  hitCount: number;
}

export class SemanticCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number = 100;
  private similarityThreshold: number = 0.85;
  private ttlMs: number = 30 * 60 * 1000; // 30 minutes

  /**
   * Generate simple hash-based embedding (fast approximation)
   * For production, use proper embedding API
   */
  private generateEmbedding(text: string): number[] {
    const normalized = text.toLowerCase().trim();
    const words = normalized.split(/\s+/);
    const embedding: number[] = new Array(128).fill(0);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const hash = crypto.createHash('md5').update(word).digest();
      for (let j = 0; j < Math.min(hash.length, 128); j++) {
        embedding[j] += hash[j] / 255 * (1 / (i + 1)); // Decay by position
      }
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(v => v / (magnitude || 1));
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
  }

  /**
   * Find similar cached query
   */
  async get(query: string): Promise<string | null> {
    const queryEmbedding = this.generateEmbedding(query);
    const now = Date.now();

    let bestMatch: CacheEntry | null = null;
    let bestSimilarity = 0;

    for (const [key, entry] of this.cache.entries()) {
      // Check TTL
      if (now - entry.timestamp.getTime() > this.ttlMs) {
        this.cache.delete(key);
        continue;
      }

      const similarity = this.cosineSimilarity(queryEmbedding, entry.queryEmbedding);
      if (similarity > this.similarityThreshold && similarity > bestSimilarity) {
        bestMatch = entry;
        bestSimilarity = similarity;
      }
    }

    if (bestMatch) {
      bestMatch.hitCount++;
      console.log(chalk.green(`[Cache] HIT! Similarity: ${(bestSimilarity * 100).toFixed(1)}%`));
      return bestMatch.response;
    }

    return null;
  }

  /**
   * Store query-response pair
   */
  async set(query: string, response: string): Promise<void> {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldest = [...this.cache.entries()]
        .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime())[0];
      if (oldest) this.cache.delete(oldest[0]);
    }

    const key = crypto.createHash('sha256').update(query).digest('hex').substring(0, 16);
    this.cache.set(key, {
      query,
      queryEmbedding: this.generateEmbedding(query),
      response,
      timestamp: new Date(),
      hitCount: 0
    });

    console.log(chalk.gray(`[Cache] Stored (size: ${this.cache.size})`));
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; totalHits: number } {
    let totalHits = 0;
    for (const entry of this.cache.values()) {
      totalHits += entry.hitCount;
    }
    return { size: this.cache.size, totalHits };
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const semanticCache = new SemanticCache();
