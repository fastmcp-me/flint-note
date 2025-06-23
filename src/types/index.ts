/**
 * Type definitions for jade-note
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
}

export interface NoteMetadata {
  title?: string;
  type?: string;
  created?: string;
  updated?: string;
  tags?: string[];
  links?: NoteLink[];
  [key: string]: string | string[] | number | boolean | NoteLink[] | undefined;
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
