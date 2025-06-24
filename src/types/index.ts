/**
 * Type definitions for flint-note
 *
 * This file provides common type definitions used across the application.
 */

// Test export to verify module loading
export const TEST_EXPORT = 'test';

// Common utility types
export type Timestamp = string;
export type UUID = string;
export type FilePath = string;

// Link types
export type LinkRelationship =
  | 'references'
  | 'follows-up'
  | 'contradicts'
  | 'supports'
  | 'mentions'
  | 'depends-on'
  | 'blocks'
  | 'related-to';

export interface NoteLink {
  target: string;
  relationship: LinkRelationship;
  created: Timestamp;
  context?: string;
  display?: string; // Display text from wikilink
  type?: string; // Target note type
}

export interface NoteMetadata {
  title?: string;
  type?: string;
  created?: string;
  updated?: string;
  tags?: string[];
  filename?: string; // Store filename for easy reference
  links?: {
    outbound?: NoteLink[];
    inbound?: NoteLink[];
  };
  [key: string]:
    | string
    | string[]
    | number
    | boolean
    | NoteLink[]
    | object
    | null
    | undefined;
}

export interface LinkResult {
  success: boolean;
  link_created: {
    source: string;
    target: string;
    relationship: LinkRelationship;
    bidirectional: boolean;
    timestamp: Timestamp;
  };
  reverse_link_created: boolean;
  message?: string;
}

// Configuration types
export interface BaseConfig {
  version?: string;
}

// Wikilink types
export interface WikiLink {
  target: string; // type/filename format
  display: string; // Display text
  type?: string; // Target note type
  filename?: string; // Target filename
  raw: string; // Original wikilink text
  position: {
    start: number;
    end: number;
  };
}

export interface LinkParseResult {
  wikilinks: WikiLink[];
  content: string; // Content with links potentially modified
}

export interface NoteLookupResult {
  filename: string;
  title: string;
  type: string;
  path: string;
  exists: boolean;
}

export interface LinkSuggestion {
  target: string; // type/filename format
  display: string; // Suggested display text
  type: string;
  filename: string;
  title: string;
  relevance?: number;
}

// Error types
export interface FlintNoteError extends Error {
  code?: string;
  details?: Record<string, unknown>;
}
