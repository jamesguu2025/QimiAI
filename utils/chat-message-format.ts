export interface ParsedChatContent {
  displayContent: string;
}

// DeepSeek V3.2/V4 emits DSML markers with FULLWIDTH vertical lines (U+FF5C `｜`),
// often doubled (`<｜｜DSML｜｜tagname>`). We normalize to ASCII `|` then match 1+ pipes.

// Unnamed DSML blocks: <|+DSML|+>...</|+DSML|+>
const DSML_BLOCK_PATTERN = /<\|+DSML\|+>[\s\S]*?<\/?\|+DSML\|+>/g;
// Self-closing inline invocations: <|+DSML|+invoke name="..." .../>
const DSML_INLINE_PATTERN = /<\|+DSML\|+invoke\s+[^>]*\/>\s*(?:<\|+DSML\|+>)?/g;
// Named element blocks: <|+DSML|+tagname ...>...</|+DSML|+tagname>
const DSML_NAMED_BLOCK_PATTERN = /<\|+DSML\|+[A-Za-z_]\w*[^>]*>[\s\S]*?<\/\|+DSML\|+[A-Za-z_]\w*>/g;
// Orphaned close/open tags
const DSML_CLOSE_TAG_PATTERN = /<\/\|+DSML\|+[A-Za-z_]\w*>/g;
const DSML_OPEN_TAG_PATTERN = /<\|+DSML\|+[A-Za-z_]\w*[^>]*>/g;
// Trailing incomplete DSML at end of stream
const DSML_PARTIAL_PATTERN = /<\|+DSML\|*[\s\S]*$/;

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

export function parseChatContent(content: string): ParsedChatContent {
  // Normalize fullwidth pipes to ASCII so patterns cover both variants in one pass.
  let stripped = content.replace(/｜/g, '|');

  // Strip self-closing inline DSML
  stripped = stripped.replace(DSML_INLINE_PATTERN, '');

  // Strip unnamed DSML blocks
  stripped = stripped.replace(DSML_BLOCK_PATTERN, '');

  // Strip named DSML element blocks iteratively to handle nesting
  let prev = '';
  while (stripped !== prev) {
    prev = stripped;
    stripped = stripped.replace(DSML_NAMED_BLOCK_PATTERN, '');
  }

  // Clean up orphaned tags and partial markers at stream end
  stripped = stripped
    .replace(DSML_CLOSE_TAG_PATTERN, '')
    .replace(DSML_OPEN_TAG_PATTERN, '')
    .replace(DSML_PARTIAL_PATTERN, '');

  return { displayContent: normalizeWhitespace(stripped) };
}
