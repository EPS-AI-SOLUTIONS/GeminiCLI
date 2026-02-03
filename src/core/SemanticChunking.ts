/**
 * @deprecated Import directly from './intelligence/SemanticChunking.js' instead.
 *
 * SemanticChunking - Re-export from consolidated intelligence module
 *
 * This file re-exports the consolidated SemanticChunking implementation
 * from src/core/intelligence/SemanticChunking.ts for backward compatibility.
 */

export {
  // Types
  type BoundaryType,
  type ChunkBoundary,
  type HierarchyLevel,
  type ChunkType,
  type ProgrammingLanguage,
  type SemanticChunk,
  type ChunkingResult,
  type ChunkHierarchy,
  type ChunkingOptions,

  // Main functions
  createSemanticChunks,
  semanticChunk,
  createHierarchicalChunks,
  createCodeAwareChunks,

  // Boundary detection
  detectSemanticBoundaries,

  // Code analysis
  detectLanguage,

  // Prioritization
  prioritizeChunks,
  findRelevantChunks,

  // Overlap and merging
  mergeChunksWithOverlap,

  // AI-powered functions
  summarizeChunks,
  reconstructText,

  // Context manager integration
  addToContextWithChunking,
  getSemanticContext
} from './intelligence/SemanticChunking.js';

// Default export
export { semanticChunk as default } from './intelligence/SemanticChunking.js';

// ============================================================================
// LEGACY CLASS-BASED API (for backward compatibility)
// ============================================================================

import {
  createSemanticChunks,
  prioritizeChunks,
  type SemanticChunk,
  type ChunkingOptions,
  detectLanguage
} from './intelligence/SemanticChunking.js';

/**
 * Legacy Chunk interface for backward compatibility
 */
export interface Chunk {
  content: string;
  type: string;
  startLine: number;
  endLine: number;
  semanticScore: number;
  metadata?: ChunkMetadata;
}

/**
 * Legacy ChunkMetadata interface
 */
export interface ChunkMetadata {
  name?: string;
  language?: string;
  parent?: string;
  children?: string[];
  keywords?: string[];
  complexity?: number;
  dependencies?: string[];
}

/**
 * Legacy SemanticChunker class for backward compatibility
 * Wraps the new functional API
 */
export class SemanticChunker {
  private readonly AVG_CHARS_PER_TOKEN = 4;
  private readonly MIN_CHUNK_TOKENS = 50;
  private readonly MAX_CHUNK_TOKENS = 2000;

  /**
   * Chunk code into semantic blocks
   */
  chunkCode(code: string, language: string): Chunk[] {
    const result = createSemanticChunks(code, {
      language: language as any,
      preserveCodeBlocks: true
    });

    return result.chunks.map(this.convertToLegacyChunk);
  }

  /**
   * Chunk text into paragraphs and sections
   */
  chunkText(text: string, maxTokens: number = this.MAX_CHUNK_TOKENS): Chunk[] {
    const maxChunkSize = maxTokens * this.AVG_CHARS_PER_TOKEN;
    const result = createSemanticChunks(text, {
      maxChunkSize,
      minChunkSize: this.MIN_CHUNK_TOKENS * this.AVG_CHARS_PER_TOKEN,
      hierarchical: true
    });

    return result.chunks.map(this.convertToLegacyChunk);
  }

  /**
   * Merge small chunks
   */
  mergeChunks(chunks: Chunk[], maxTokens: number = this.MAX_CHUNK_TOKENS): Chunk[] {
    const merged: Chunk[] = [];
    let current: Chunk | null = null;

    for (const chunk of chunks) {
      const chunkTokens = this.estimateTokens(chunk.content);

      if (!current) {
        current = { ...chunk };
        continue;
      }

      const currentTokens = this.estimateTokens(current.content);
      const combinedTokens = currentTokens + chunkTokens;

      if (combinedTokens <= maxTokens && (chunk.startLine - current.endLine <= 2)) {
        current.content += '\n\n' + chunk.content;
        current.endLine = chunk.endLine;
        current.semanticScore = Math.max(current.semanticScore, chunk.semanticScore);
      } else {
        merged.push(current);
        current = { ...chunk };
      }
    }

    if (current) {
      merged.push(current);
    }

    return merged;
  }

  /**
   * Rank chunks by relevance to query
   */
  rankChunks(chunks: Chunk[], query: string): Chunk[] {
    // Convert to SemanticChunk format
    const semanticChunks: SemanticChunk[] = chunks.map((c, i) => ({
      id: `chunk-${i}`,
      content: c.content,
      summary: c.content.substring(0, 100),
      keywords: c.metadata?.keywords || [],
      importance: c.semanticScore,
      type: 'general' as any,
      hierarchyLevel: 'paragraph' as any,
      startPosition: 0,
      endPosition: c.content.length
    }));

    const prioritized = prioritizeChunks(semanticChunks, query, semanticChunks.length);

    return prioritized.map((sc, i) => ({
      content: sc.content,
      type: chunks.find(c => c.content === sc.content)?.type || 'unknown',
      startLine: chunks.find(c => c.content === sc.content)?.startLine || i,
      endLine: chunks.find(c => c.content === sc.content)?.endLine || i,
      semanticScore: sc.importance,
      metadata: { keywords: sc.keywords }
    }));
  }

  /**
   * Estimate number of tokens
   */
  estimateTokens(text: string): number {
    if (!text) return 0;

    const words = text.split(/\s+/).filter(w => w.length > 0);
    let tokens = 0;

    for (const word of words) {
      tokens += Math.ceil(word.length / this.AVG_CHARS_PER_TOKEN);
      const specialChars = word.match(/[^a-zA-Z0-9]/g);
      if (specialChars) {
        tokens += Math.ceil(specialChars.length / 2);
      }
    }

    const newlines = (text.match(/\n/g) || []).length;
    tokens += Math.ceil(newlines / 2);

    return Math.max(1, tokens);
  }

  /**
   * Convert SemanticChunk to legacy Chunk format
   */
  private convertToLegacyChunk(chunk: SemanticChunk): Chunk {
    const lines = chunk.content.split('\n');
    return {
      content: chunk.content,
      type: chunk.type,
      startLine: 1, // Position-based, not line-based in new API
      endLine: lines.length,
      semanticScore: chunk.importance,
      metadata: {
        keywords: chunk.keywords,
        language: chunk.codeLanguage,
        name: chunk.codeSymbol
      }
    };
  }
}

/**
 * Singleton instance for backward compatibility
 */
export const semanticChunker = new SemanticChunker();
