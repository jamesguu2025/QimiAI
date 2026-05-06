export interface DsmlInvocation {
  name: string;
  parameter?: string;
  raw: string;
}

export interface ParsedChatContent {
  displayContent: string;
  dsmlInvocations: DsmlInvocation[];
}

const DSML_BLOCK_PATTERN = /<\|DSML\|>([\s\S]*?)<\/?\|DSML\|>/g;
const DSML_INLINE_PATTERN = /<\|DSML\|invoke\s+name="([^"]+)"(?:\s+parameter="([^"]*)")?\s*\/>/g;
const DSML_INLINE_WITH_END_PATTERN = /<\|DSML\|invoke\s+name="([^"]+)"(?:\s+parameter="([^"]*)")?\s*\/>\s*(?:<\|DSML\|>)?/g;
const DSML_PARTIAL_PATTERN = /<\|DSML\|[\s\S]*$/;

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

export function parseChatContent(content: string): ParsedChatContent {
  const dsmlInvocations: DsmlInvocation[] = [];

  const withoutInline = content.replace(DSML_INLINE_WITH_END_PATTERN, (
    rawInvoke: string,
    name: string,
    parameter?: string
  ) => {
    dsmlInvocations.push({
      name,
      parameter,
      raw: rawInvoke,
    });
    return '';
  });

  const stripped = withoutInline.replace(DSML_BLOCK_PATTERN, (rawBlock, innerContent) => {
    let matched = false;

    innerContent.replace(DSML_INLINE_PATTERN, (
      rawInvoke: string,
      name: string,
      parameter?: string
    ) => {
      matched = true;
      dsmlInvocations.push({
        name,
        parameter,
        raw: rawInvoke,
      });
      return rawInvoke;
    });

    if (!matched) {
      dsmlInvocations.push({
        name: 'unknown',
        raw: rawBlock,
      });
    }

    return '';
  }).replace(DSML_PARTIAL_PATTERN, '');

  return {
    displayContent: normalizeWhitespace(stripped),
    dsmlInvocations,
  };
}
