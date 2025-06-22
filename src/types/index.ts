/**
 * Type definitions for jade-note
 *
 * This file provides common type definitions used across the application.
 */

// Re-export types that might be used elsewhere
export type {} from '../core/workspace.js';
export type {} from '../core/notes.js';
export type {} from '../core/note-types.js';
export type {} from '../core/search.js';

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

// Error types
export interface JadeNoteError extends Error {
  code?: string;
  details?: Record<string, unknown>;
}
