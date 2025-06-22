/**
 * Link Manager
 *
 * Handles creation and management of links between notes, including
 * bidirectional linking, relationship types, and link validation.
 */

import path from 'path';
import { Workspace } from './workspace.ts';
import { NoteManager } from './notes.ts';
import type { NoteLink, LinkRelationship, LinkResult } from '../types/index.ts';

interface LinkNotesArgs {
  source: string;
  target: string;
  relationship?: LinkRelationship;
  bidirectional?: boolean;
  context?: string;
}

export class LinkManager {
  #workspace: Workspace;
  #noteManager: NoteManager;

  constructor(workspace: Workspace, noteManager: NoteManager) {
    this.#workspace = workspace;
    this.#noteManager = noteManager;
  }

  /**
   * Create a link between two notes
   */
  async linkNotes(args: LinkNotesArgs): Promise<LinkResult> {
    const {
      source,
      target,
      relationship = 'references',
      bidirectional = true,
      context
    } = args;

    // Validate relationship type
    if (!this.isValidRelationship(relationship)) {
      throw new Error(`Invalid relationship type: ${relationship}`);
    }

    // Normalize identifiers and verify both notes exist
    const sourceNote = await this.#noteManager.getNote(source);
    const targetNote = await this.#noteManager.getNote(target);

    // Check for duplicate links
    if (await this.linkExists(source, target, relationship)) {
      throw new Error(
        `Link already exists from ${source} to ${target} with relationship ${relationship}`
      );
    }

    const timestamp = new Date().toISOString();

    // Create the primary link
    await this.addLinkToNote(source, {
      target: target,
      relationship,
      created: timestamp,
      context
    });

    let reverseLinkCreated = false;

    // Create reverse link if bidirectional
    if (bidirectional) {
      const reverseRelationship = this.getReverseRelationship(relationship);

      // Only create reverse link if it doesn't already exist
      if (!(await this.linkExists(target, source, reverseRelationship))) {
        await this.addLinkToNote(target, {
          target: source,
          relationship: reverseRelationship,
          created: timestamp,
          context: context ? `Reverse of: ${context}` : undefined
        });
        reverseLinkCreated = true;
      }
    }

    // Add inline links to content if appropriate
    await this.addInlineLinks(source, target, relationship);

    return {
      success: true,
      link_created: {
        source: source,
        target: target,
        relationship,
        bidirectional,
        timestamp
      },
      reverse_link_created: reverseLinkCreated
    };
  }

  /**
   * Add a link to a note's frontmatter
   */
  private async addLinkToNote(identifier: string, link: NoteLink): Promise<void> {
    const note = await this.#noteManager.getNote(identifier);
    const links = note.metadata.links || [];

    // Add the new link
    links.push(link);

    // Update the note metadata and let updateNote handle the content formatting
    const updatedMetadata = { ...note.metadata, links };

    // Pass the plain content - updateNote will handle frontmatter formatting
    await this.#noteManager.updateNoteWithMetadata(
      identifier,
      note.content,
      updatedMetadata
    );
  }

  /**
   * Format note content with updated frontmatter including links
   * @deprecated Use NoteManager.formatUpdatedNoteContent instead
   */
  private formatNoteWithLinks(
    content: string,
    metadata: Record<string, unknown>
  ): string {
    // This method is deprecated - NoteManager handles frontmatter formatting
    return content;
  }

  /**
   * Add inline wikilinks to note content where appropriate
   */
  private async addInlineLinks(
    sourceIdentifier: string,
    targetIdentifier: string,
    relationship: LinkRelationship
  ): Promise<void> {
    const sourceNote = await this.#noteManager.getNote(sourceIdentifier);
    const targetNote = await this.#noteManager.getNote(targetIdentifier);

    const targetTitle = targetNote.title;
    const targetFilename = path.basename(targetNote.filename, '.md');

    // Check if content already contains a link to the target
    const wikilinkPattern = new RegExp(`\\[\\[${targetFilename}([|][^\\]]*)?\\]\\]`);
    const markdownLinkPattern = new RegExp(
      `\\[([^\\]]*)\\]\\([^)]*${targetFilename}[^)]*\\)`
    );

    if (
      wikilinkPattern.test(sourceNote.content) ||
      markdownLinkPattern.test(sourceNote.content)
    ) {
      // Link already exists in content, don't add another
      return;
    }

    // For certain relationships, add context-appropriate inline links
    if (
      relationship === 'references' ||
      relationship === 'mentions' ||
      relationship === 'related-to'
    ) {
      const wikilink = `[[${targetFilename}|${targetTitle}]]`;

      // Add a simple reference at the end of the content
      const updatedContent = sourceNote.content.trim() + `\n\nSee also: ${wikilink}`;

      // Get the current note again to ensure we have the latest metadata
      const currentNote = await this.#noteManager.getNote(sourceIdentifier);

      // Update just the content, preserving existing metadata
      await this.#noteManager.updateNoteWithMetadata(
        sourceIdentifier,
        updatedContent,
        currentNote.metadata
      );
    }
  }

  /**
   * Check if a link already exists between two notes
   */
  private async linkExists(
    sourceIdentifier: string,
    targetIdentifier: string,
    relationship: LinkRelationship
  ): Promise<boolean> {
    try {
      const note = await this.#noteManager.getNote(sourceIdentifier);
      const links = note.metadata.links || [];

      return links.some(
        link => link.target === targetIdentifier && link.relationship === relationship
      );
    } catch {
      return false;
    }
  }

  /**
   * Check if relationship type is valid
   */
  private isValidRelationship(relationship: string): relationship is LinkRelationship {
    const validRelationships: LinkRelationship[] = [
      'references',
      'follows-up',
      'contradicts',
      'supports',
      'mentions',
      'depends-on',
      'blocks',
      'related-to'
    ];
    return validRelationships.includes(relationship as LinkRelationship);
  }

  /**
   * Get the reverse relationship for bidirectional linking
   */
  private getReverseRelationship(relationship: LinkRelationship): LinkRelationship {
    const reverseMap: Record<LinkRelationship, LinkRelationship> = {
      references: 'mentions',
      'follows-up': 'mentions',
      contradicts: 'contradicts',
      supports: 'supports',
      mentions: 'mentions',
      'depends-on': 'blocks',
      blocks: 'depends-on',
      'related-to': 'related-to'
    };

    return reverseMap[relationship] || 'related-to';
  }

  /**
   * Get all links for a specific note
   */
  async getLinksForNote(identifier: string): Promise<NoteLink[]> {
    const note = await this.#noteManager.getNote(identifier);
    return note.metadata.links || [];
  }

  /**
   * Remove a specific link between two notes
   */
  async removeLink(
    source: string,
    target: string,
    relationship: LinkRelationship
  ): Promise<boolean> {
    const note = await this.#noteManager.getNote(source);
    const links = note.metadata.links || [];

    const linkIndex = links.findIndex(
      link => link.target === target && link.relationship === relationship
    );

    if (linkIndex === -1) {
      return false;
    }

    // Remove the link
    links.splice(linkIndex, 1);

    // Update the note with new metadata
    const updatedMetadata = { ...note.metadata, links };
    await this.#noteManager.updateNoteWithMetadata(source, note.content, updatedMetadata);

    return true;
  }
}
