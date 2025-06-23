#!/bin/bash

# Integration Test Cleanup Script
# Moves deprecated integration test files to a backup directory

set -e

echo "🧹 Cleaning up deprecated integration test files..."

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_DIR="$SCRIPT_DIR"
BACKUP_DIR="$TEST_DIR/deprecated-backup"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# List of deprecated files to move
DEPRECATED_FILES=(
    "search-integration.test.ts"
    "search-notes.test.ts"
    "search-index-update.test.ts"
    "link-notes-integration.test.ts"
    "link-debug.test.ts"
    "metadata-integration.test.ts"
    "integration.test.ts"
    "note-type-management.test.ts"
)

echo "📦 Creating backup of deprecated files in: $BACKUP_DIR"

# Move each deprecated file to backup
for file in "${DEPRECATED_FILES[@]}"; do
    if [ -f "$TEST_DIR/$file" ]; then
        echo "  Moving $file to backup..."
        mv "$TEST_DIR/$file" "$BACKUP_DIR/"
    else
        echo "  ⚠️  File $file not found (may already be moved)"
    fi
done

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📁 Deprecated files moved to: $BACKUP_DIR"
echo "🧪 Active integration tests:"
echo "   - search-consolidated.test.ts"
echo "   - mcp-consolidated.test.ts"
echo "   - links-consolidated.test.ts"
echo "   - metadata-streamlined.test.ts"
echo "   - helpers/integration-utils.ts"
echo ""
echo "🔄 To run consolidated tests:"
echo "   npm run test:integration"
echo ""
echo "📚 See CONSOLIDATION.md for detailed migration information"
echo ""
echo "⚠️  Remember to:"
echo "   1. Run the new consolidated tests to verify they pass"
echo "   2. Update any CI/CD scripts that reference the old files"
echo "   3. Remove the backup directory after verifying everything works"
