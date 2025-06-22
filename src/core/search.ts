/**
 * Search Manager
 *
 * Handles search operations across notes, including text search,
 * filtering by type, and maintaining search indices.
 */

import path from 'path';
import fs from 'fs/promises';
import yaml from 'js-yaml';
import { Workspace } from './workspace.ts';

interface SearchIndex {
  version: string;
  last_updated: string;
  notes: Record<string, SearchIndexEntry>;
}

interface SearchIndexEntry {
  content: string;
  title: string;
  type: string;
  tags: string[];
  updated: string;
}

interface SearchResult {
  id: string;
  title: string;
  type: string;
  tags: string[];
  score: number;
  snippet: string;
  lastUpdated: string;
}

interface TagSearchResult {
  id: string;
  title: string;
  type: string;
  tags: string[];
  lastUpdated: string;
}

interface TagInfo {
  tag: string;
  count: number;
}

interface SimilarNoteResult {
  id: string;
  title: string;
  type: string;
  tags: string[];
  similarity: number;
  lastUpdated: string;
}

interface ParsedNote {
  metadata: NoteMetadata;
  content: string;
}

interface NoteMetadata {
  title?: string;
  type?: string;
  created?: string;
  updated?: string;
  tags?: string[];
  [key: string]: string | string[] | undefined;
}

interface RebuildResult {
  indexedNotes: number;
  timestamp: string;
}

export class SearchManager {
  #workspace: Workspace;
  static #globalIndexLock: Promise<void> = Promise.resolve();

  constructor(workspace: Workspace) {
    this.#workspace = workspace;
  }

  /**
   * Search notes by content and/or type
   */
  async searchNotes(
    query: string,
    typeFilter: string | null = null,
    limit: number = 10
  ): Promise<SearchResult[]> {
    try {
      const searchIndex = await this.loadSearchIndex();
      const results: SearchResult[] = [];

      // Prepare search terms
      const searchTerms = query
        .toLowerCase()
        .split(/\s+/)
        .filter(term => term.length > 0);

      if (searchTerms.length === 0) {
        return [];
      }

      // Search through indexed notes
      for (const [notePath, noteData] of Object.entries(searchIndex.notes)) {
        // Apply type filter if specified
        if (typeFilter && noteData.type !== typeFilter) {
          continue;
        }

        // Calculate relevance score
        const score = this.calculateRelevanceScore(noteData, searchTerms);

        if (score > 0) {
          // Parse note path to get identifier
          const identifier = this.pathToIdentifier(notePath);

          results.push({
            id: identifier,
            title: noteData.title,
            type: noteData.type,
            tags: noteData.tags,
            score,
            snippet: this.generateSnippet(noteData.content, searchTerms),
            lastUpdated: noteData.updated
          });
        }
      }

      // Sort by relevance score (highest first)
      results.sort((a, b) => b.score - a.score);

      // Apply limit
      return results.slice(0, limit);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Search failed: ${errorMessage}`);
    }
  }

  /**
   * Load search index from file
   */
  async loadSearchIndex(): Promise<SearchIndex> {
    try {
      const indexPath = this.#workspace.searchIndexPath;
      const indexContent = await fs.readFile(indexPath, 'utf-8');
      return JSON.parse(indexContent);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        // Try to rebuild index if file doesn't exist
        try {
          console.log('Search index missing, attempting to rebuild...');
          await this.rebuildSearchIndex();
          const indexContent = await fs.readFile(
            this.#workspace.searchIndexPath,
            'utf-8'
          );
          return JSON.parse(indexContent);
        } catch (rebuildError) {
          console.error('Failed to rebuild search index:', rebuildError);
          // Return empty index as fallback
          return {
            version: '1.0.0',
            last_updated: new Date().toISOString(),
            notes: {}
          };
        }
      }
      throw error;
    }
  }

  /**
   * Calculate relevance score for a note based on search terms
   */
  calculateRelevanceScore(noteData: SearchIndexEntry, searchTerms: string[]): number {
    let score = 0;
    const content = noteData.content.toLowerCase();
    const title = noteData.title.toLowerCase();
    const tags = noteData.tags.map(tag => tag.toLowerCase());

    for (const term of searchTerms) {
      // Title matches are weighted more heavily
      const titleMatches = this.countOccurrences(title, term);
      score += titleMatches * 10;

      // Tag matches are also weighted heavily
      for (const tag of tags) {
        if (tag.includes(term)) {
          score += 8;
        }
      }

      // Content matches
      const contentMatches = this.countOccurrences(content, term);
      score += contentMatches * 2;

      // Exact word matches get bonus points
      const titleWords = title.split(/\s+/);
      const contentWords = content.split(/\s+/);

      if (titleWords.includes(term)) {
        score += 15;
      }

      if (contentWords.includes(term)) {
        score += 3;
      }
    }

    return score;
  }

  /**
   * Count occurrences of a term in text
   */
  countOccurrences(text: string, term: string): number {
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  }

  /**
   * Generate a snippet showing search term context
   */
  generateSnippet(
    content: string,
    searchTerms: string[],
    maxLength: number = 200
  ): string {
    let bestSnippet = '';
    let maxTerms = 0;

    // Find the position with the most search terms
    for (let i = 0; i < content.length - maxLength; i += 50) {
      const snippet = content.substring(i, i + maxLength);
      const lowerSnippet = snippet.toLowerCase();

      let termCount = 0;
      for (const term of searchTerms) {
        if (lowerSnippet.includes(term)) {
          termCount++;
        }
      }

      if (termCount > maxTerms) {
        maxTerms = termCount;
        bestSnippet = snippet;
      }
    }

    // If no good snippet found, use the beginning
    if (!bestSnippet) {
      bestSnippet = content.substring(0, maxLength);
    }

    // Clean up the snippet
    bestSnippet = bestSnippet.trim();
    if (bestSnippet.length === maxLength) {
      bestSnippet += '...';
    }

    // Highlight search terms
    for (const term of searchTerms) {
      const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      bestSnippet = bestSnippet.replace(regex, '**$1**');
    }

    return bestSnippet;
  }

  /**
   * Convert file path to note identifier
   */
  pathToIdentifier(notePath: string): string {
    const relativePath = path.relative(this.#workspace.rootPath, notePath);
    const parts = relativePath.split(path.sep);

    if (parts.length >= 2) {
      const type = parts[0];
      const filename = parts[parts.length - 1];
      return `${type}/${filename}`;
    }

    return relativePath;
  }

  /**
   * Search notes by tags
   */
  async searchByTags(
    tags: string[],
    matchAll: boolean = false
  ): Promise<TagSearchResult[]> {
    try {
      const searchIndex = await this.loadSearchIndex();
      const results: TagSearchResult[] = [];
      const searchTags = tags.map(tag => tag.toLowerCase());

      for (const [notePath, noteData] of Object.entries(searchIndex.notes)) {
        const noteTags = noteData.tags.map(tag => tag.toLowerCase());

        let matches = false;
        if (matchAll) {
          // All tags must be present
          matches = searchTags.every(tag => noteTags.includes(tag));
        } else {
          // At least one tag must be present
          matches = searchTags.some(tag => noteTags.includes(tag));
        }

        if (matches) {
          const identifier = this.pathToIdentifier(notePath);
          results.push({
            id: identifier,
            title: noteData.title,
            type: noteData.type,
            tags: noteData.tags,
            lastUpdated: noteData.updated
          });
        }
      }

      // Sort by last updated (newest first)
      results.sort(
        (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      );

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Tag search failed: ${errorMessage}`);
    }
  }

  /**
   * Get all unique tags from notes
   */
  async getAllTags(): Promise<TagInfo[]> {
    try {
      const searchIndex = await this.loadSearchIndex();
      const tagCounts: Record<string, number> = {};

      for (const noteData of Object.values(searchIndex.notes)) {
        for (const tag of noteData.tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }

      // Convert to array and sort by frequency
      const tags = Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);

      return tags;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get tags: ${errorMessage}`);
    }
  }

  /**
   * Search for similar notes based on content similarity
   */
  async findSimilarNotes(
    noteIdentifier: string,
    limit: number = 5
  ): Promise<SimilarNoteResult[]> {
    try {
      const searchIndex = await this.loadSearchIndex();
      const targetPath = this.identifierToPath(noteIdentifier);
      const targetNote = searchIndex.notes[targetPath];

      if (!targetNote) {
        throw new Error(`Note '${noteIdentifier}' not found in search index`);
      }

      const results: SimilarNoteResult[] = [];
      const targetWords = this.extractWords(targetNote.content);

      for (const [notePath, noteData] of Object.entries(searchIndex.notes)) {
        // Skip the target note itself
        if (notePath === targetPath) {
          continue;
        }

        const noteWords = this.extractWords(noteData.content);
        const similarity = this.calculateSimilarity(targetWords, noteWords);

        if (similarity > 0.1) {
          // Minimum similarity threshold
          const identifier = this.pathToIdentifier(notePath);
          results.push({
            id: identifier,
            title: noteData.title,
            type: noteData.type,
            tags: noteData.tags,
            similarity,
            lastUpdated: noteData.updated
          });
        }
      }

      // Sort by similarity (highest first)
      results.sort((a, b) => b.similarity - a.similarity);

      return results.slice(0, limit);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Similar notes search failed: ${errorMessage}`);
    }
  }

  /**
   * Extract words from content for similarity calculation
   */
  extractWords(content: string): Record<string, number> {
    return content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .reduce(
        (acc, word) => {
          acc[word] = (acc[word] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
  }

  /**
   * Calculate similarity between two word frequency maps
   */
  calculateSimilarity(
    words1: Record<string, number>,
    words2: Record<string, number>
  ): number {
    const allWords = new Set([...Object.keys(words1), ...Object.keys(words2)]);
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (const word of allWords) {
      const freq1 = words1[word] || 0;
      const freq2 = words2[word] || 0;

      dotProduct += freq1 * freq2;
      norm1 += freq1 * freq1;
      norm2 += freq2 * freq2;
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Convert note identifier to file path
   */
  identifierToPath(identifier: string): string {
    if (identifier.includes('/')) {
      const parts = identifier.split('/');
      const type = parts[0];
      const filename = parts.slice(1).join('/');
      return path.join(this.#workspace.rootPath, type, filename);
    } else {
      const config = this.#workspace.getConfig();
      const defaultType = config?.default_note_type || 'general';
      const filename = identifier.endsWith('.md') ? identifier : `${identifier}.md`;
      return path.join(this.#workspace.rootPath, defaultType, filename);
    }
  }

  /**
   * Rebuild the entire search index
   */
  async rebuildSearchIndex(): Promise<RebuildResult> {
    // Use the same lock mechanism to prevent concurrent index operations
    return this.#withIndexLock(async () => {
      try {
        const index: SearchIndex = {
          version: '1.0.0',
          last_updated: new Date().toISOString(),
          notes: {}
        };

        // Scan all note types
        const workspaceRoot = this.#workspace.rootPath;
        const entries = await fs.readdir(workspaceRoot, { withFileTypes: true });

        for (const entry of entries) {
          if (
            entry.isDirectory() &&
            !entry.name.startsWith('.') &&
            entry.name !== 'node_modules'
          ) {
            const typePath = path.join(workspaceRoot, entry.name);
            const typeEntries = await fs.readdir(typePath);

            for (const filename of typeEntries) {
              if (filename.endsWith('.md') && !filename.startsWith('.')) {
                const notePath = path.join(typePath, filename);

                try {
                  const content = await fs.readFile(notePath, 'utf-8');
                  const parsed = this.parseNoteContent(content);

                  index.notes[notePath] = {
                    content: content,
                    title:
                      parsed.metadata.title || this.extractTitleFromFilename(filename),
                    type: parsed.metadata.type || entry.name,
                    tags: parsed.metadata.tags || [],
                    updated: new Date().toISOString()
                  };
                } catch (_error) {
                  // Skip files that can't be read
                  continue;
                }
              }
            }
          }
        }

        // Save the rebuilt index
        const indexPath = this.#workspace.searchIndexPath;
        await this.#writeIndexFileWithRetry(indexPath, index);

        return {
          indexedNotes: Object.keys(index.notes).length,
          timestamp: index.last_updated
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to rebuild search index: ${errorMessage}`);
      }
    });
  }

  /**
   * Read index file with retry logic to handle JSON corruption
   */
  async #readIndexFileWithRetry(
    indexPath: string,
    maxRetries: number = 3
  ): Promise<string> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const content = await fs.readFile(indexPath, 'utf-8');

        // Validate JSON by parsing it
        if (content.trim()) {
          JSON.parse(content);
        }

        return content;
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
          throw error; // File doesn't exist, don't retry
        }

        if (attempt === maxRetries - 1) {
          throw error; // Last attempt, give up
        }

        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 10 * (attempt + 1)));
      }
    }

    return '';
  }

  /**
   * Write index file with atomic operation to prevent corruption
   */
  async #writeIndexFileWithRetry(indexPath: string, index: SearchIndex): Promise<void> {
    const tempPath = `${indexPath}.tmp.${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;
    const content = JSON.stringify(index, null, 2);

    try {
      // Ensure parent directory exists
      await fs.mkdir(path.dirname(indexPath), { recursive: true });

      // Write to temporary file first
      await fs.writeFile(tempPath, content, 'utf-8');

      // Atomic move to final location
      await fs.rename(tempPath, indexPath);
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  /**
   * Execute a function with exclusive access to the search index
   */
  async #withIndexLock<T>(fn: () => Promise<T>): Promise<T> {
    const currentLock = SearchManager.#globalIndexLock;
    let resolve: () => void;
    SearchManager.#globalIndexLock = new Promise<void>(r => (resolve = r));

    try {
      await currentLock;
      return await fn();
    } finally {
      resolve!();
    }
  }

  /**
   * Update a single note in the search index (thread-safe)
   */
  async updateNoteInIndex(notePath: string, content: string): Promise<void> {
    return this.#withIndexLock(async () => {
      try {
        const indexPath = this.#workspace.searchIndexPath;
        let index: SearchIndex = {
          version: '1.0.0',
          last_updated: new Date().toISOString(),
          notes: {}
        };

        // Load existing index with retry logic
        try {
          const indexContent = await this.#readIndexFileWithRetry(indexPath);
          if (indexContent.trim()) {
            index = JSON.parse(indexContent);
          }
        } catch (error) {
          if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            // Create parent directory if it doesn't exist
            await fs.mkdir(path.dirname(indexPath), { recursive: true });
          } else {
            console.warn('Failed to load search index, using default:', error);
          }
        }

        // Extract searchable content
        const parsed = this.parseNoteContent(content);
        const searchableContent = [
          parsed.metadata.title || '',
          parsed.content,
          (parsed.metadata.tags || []).join(' ')
        ].join(' ');

        // Update index entry
        index.notes[notePath] = {
          content: searchableContent,
          title:
            parsed.metadata.title ||
            this.extractTitleFromFilename(path.basename(notePath)),
          type: parsed.metadata.type || path.basename(path.dirname(notePath)),
          tags: parsed.metadata.tags || [],
          updated: new Date().toISOString()
        };

        index.last_updated = new Date().toISOString();

        // Save updated index with retry logic
        await this.#writeIndexFileWithRetry(indexPath, index);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to update search index: ${errorMessage}`);
      }
    });
  }

  /**
   * Remove a note from the search index (thread-safe)
   */
  async removeNoteFromIndex(notePath: string): Promise<void> {
    return this.#withIndexLock(async () => {
      try {
        const indexPath = this.#workspace.searchIndexPath;

        // Load existing index with retry logic
        try {
          const indexContent = await this.#readIndexFileWithRetry(indexPath);
          if (!indexContent.trim()) {
            return; // Empty index, nothing to remove
          }

          const index = JSON.parse(indexContent);

          // Remove the note entry
          delete index.notes[notePath];
          index.last_updated = new Date().toISOString();

          // Save updated index with retry logic
          await this.#writeIndexFileWithRetry(indexPath, index);
        } catch (error) {
          if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            // Index doesn't exist, nothing to remove
            return;
          }
          throw error;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to remove from search index: ${errorMessage}`);
      }
    });
  }

  /**
   * Parse note content (simplified version)
   */
  parseNoteContent(content: string): ParsedNote {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (match) {
      const frontmatter = match[1];
      const body = match[2];
      const metadata = this.parseFrontmatter(frontmatter);
      return { metadata, content: body.trim() };
    } else {
      return { metadata: {}, content: content.trim() };
    }
  }

  /**
   * Parse YAML frontmatter using js-yaml
   */
  parseFrontmatter(frontmatter: string): NoteMetadata {
    try {
      const parsed = yaml.load(frontmatter) as Record<string, unknown>;

      if (!parsed || typeof parsed !== 'object') {
        return {};
      }

      // Convert to NoteMetadata format
      const metadata: NoteMetadata = {};

      for (const [key, value] of Object.entries(parsed)) {
        // Type guard for allowed metadata values
        if (typeof value === 'string' || Array.isArray(value) || value === undefined) {
          metadata[key] = value;
        }
      }

      return metadata;
    } catch {
      // If YAML parsing fails, return empty metadata
      return {};
    }
  }

  /**
   * Extract title from filename
   */
  extractTitleFromFilename(filename: string): string {
    return filename
      .replace(/\.md$/, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }
}
