export type InlineCorrection = {
  original: string;
  corrected: string;
  explanation: string;
};

export type InlineChallenge = {
  type: string;
  prompt: string;
  hint?: string;
};

export type InlineVocabulary = {
  word: string;
  partOfSpeech?: string;
};

export type ParsedToolArtifacts = {
  cleanedText: string;
  correction: InlineCorrection | null;
  challenge: InlineChallenge | null;
  vocabulary: InlineVocabulary | null;
};

type ToolName = 'correctGrammar' | 'issueChallenge' | 'explainVocabulary';

type ProtocolPayload = {
  name: string;
  value: unknown;
  start: number;
  end: number;
};

const TOOL_NAMES = new Set<ToolName>([
  'correctGrammar',
  'issueChallenge',
  'explainVocabulary',
]);

const TOOL_PREFIX_RE = /(?:functions\.)?([a-zA-Z_]\w*):\d+\s*[>|$]\s*/g;
const ECHO_FRAGMENT_RE = /\|\$\{[\s\S]*?\}\]?/g;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function stringField(value: Record<string, unknown>, key: string): string | undefined {
  const field = value[key];
  return typeof field === 'string' && field.trim() ? field.trim() : undefined;
}

function extractJsonObjectAt(text: string, startAt: number): { jsonText: string; start: number; end: number } | null {
  const start = text.indexOf('{', startAt);
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let quote = '';
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === quote) {
        inString = false;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      quote = ch;
      continue;
    }

    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return { jsonText: text.slice(start, i + 1), start, end: i + 1 };
      }
    }
  }

  return null;
}

function collectProtocolPayloads(text: string): ProtocolPayload[] {
  const payloads: ProtocolPayload[] = [];
  TOOL_PREFIX_RE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = TOOL_PREFIX_RE.exec(text)) !== null) {
    const json = extractJsonObjectAt(text, TOOL_PREFIX_RE.lastIndex);
    if (!json) continue;

    try {
      payloads.push({
        name: match[1],
        value: JSON.parse(json.jsonText),
        start: match.index,
        end: json.end,
      });
    } catch {
      payloads.push({
        name: match[1],
        value: null,
        start: match.index,
        end: json.end,
      });
    }

    TOOL_PREFIX_RE.lastIndex = json.end;
  }

  return payloads;
}

function removeRanges(text: string, ranges: Array<{ start: number; end: number }>): string {
  return [...ranges]
    .sort((a, b) => b.start - a.start)
    .reduce((acc, range) => acc.slice(0, range.start) + acc.slice(range.end), text);
}

function normalizeCorrection(value: unknown): InlineCorrection | null {
  if (!isRecord(value)) return null;
  const source = isRecord(value.args) ? value.args : value;
  const original = stringField(source, 'original');
  const corrected = stringField(source, 'corrected');
  const explanation = stringField(source, 'explanation');
  if (!original && !corrected && !explanation) return null;
  return {
    original: original ?? '',
    corrected: corrected ?? '',
    explanation: explanation ?? '',
  };
}

function normalizeChallenge(value: unknown): InlineChallenge | null {
  if (!isRecord(value)) return null;
  const source = isRecord(value.args) ? value.args : value;
  const type = stringField(source, 'type') ?? 'fill-in-blank';
  const prompt = stringField(source, 'prompt');
  const hint = stringField(source, 'hint');
  if (!prompt && !hint) return null;
  return {
    type,
    prompt: prompt ?? '',
    hint,
  };
}

function normalizeVocabulary(value: unknown): InlineVocabulary | null {
  if (!isRecord(value)) return null;
  const source = isRecord(value.args) ? value.args : value;
  const word = stringField(source, 'word');
  const partOfSpeech = stringField(source, 'partOfSpeech');
  if (!word && !partOfSpeech) return null;
  return {
    word: word ?? '',
    partOfSpeech,
  };
}

function readLooseField(source: string, key: string): string | undefined {
  const quoted = new RegExp(`["']${key}["']\\s*:\\s*["']([\\s\\S]*?)["']`, 'i').exec(source);
  if (quoted?.[1]) return quoted[1].trim();

  const plain = new RegExp(`${key}\\s*:\\s*["']?([^\\n\\r,}]+)`, 'i').exec(source);
  return plain?.[1]?.trim();
}

function parseLooseFunctionCall(text: string, toolName: ToolName): Record<string, unknown> | null {
  const call = new RegExp(`(?:functions?\\.)?${toolName}\\s*\\(([\\s\\S]*?)\\)\\s*$`, 'im').exec(text);
  if (!call?.[1]) return null;

  const source = call[1].trim();
  const json = extractJsonObjectAt(source, 0);
  if (json) {
    try {
      return JSON.parse(json.jsonText) as Record<string, unknown>;
    } catch {
      // Continue with loose field parsing below.
    }
  }

  if (toolName === 'correctGrammar') {
    return {
      original: readLooseField(source, 'original'),
      corrected: readLooseField(source, 'corrected'),
      explanation: readLooseField(source, 'explanation'),
    };
  }

  if (toolName === 'issueChallenge') {
    return {
      type: readLooseField(source, 'type'),
      prompt: readLooseField(source, 'prompt'),
      hint: readLooseField(source, 'hint'),
      targetWord: readLooseField(source, 'targetWord'),
    };
  }

  return {
    word: readLooseField(source, 'word'),
    partOfSpeech: readLooseField(source, 'partOfSpeech'),
  };
}

function normalizeBareJsonToolPayload(parsed: unknown): Partial<ParsedToolArtifacts> | null {
  if (!isRecord(parsed)) return null;

  const nested = typeof parsed.name === 'string' && isRecord(parsed.arguments)
    ? parsed.arguments
    : parsed;

  const correction = normalizeCorrection(nested);
  if (correction) return { correction, cleanedText: '' };

  const challenge = normalizeChallenge(nested);
  if (challenge) return { challenge, cleanedText: '' };

  const vocabulary = normalizeVocabulary(nested);
  if (vocabulary) return { vocabulary, cleanedText: '' };

  return null;
}

function parseBareJsonToolPayload(text: string): Partial<ParsedToolArtifacts> | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;

  try {
    return normalizeBareJsonToolPayload(JSON.parse(trimmed));
  } catch {
    return null;
  }
}

function parseLeadingBareJsonToolPayload(text: string): Partial<ParsedToolArtifacts> | null {
  const firstContentIndex = text.match(/^\s*/)?.[0].length ?? 0;
  const json = extractJsonObjectAt(text, firstContentIndex);
  if (!json || json.start !== firstContentIndex) return null;

  let parsedPayload: Partial<ParsedToolArtifacts> | null = null;
  try {
    parsedPayload = normalizeBareJsonToolPayload(JSON.parse(json.jsonText));
  } catch {
    return null;
  }

  if (!parsedPayload) return null;
  return {
    ...parsedPayload,
    cleanedText: text.slice(json.end).trim(),
  };
}

export function stripToolCallArtifacts(text: string): ParsedToolArtifacts {
  const protocolPayloads = collectProtocolPayloads(text);
  const knownPayloads = protocolPayloads.filter((p): p is ProtocolPayload & { name: ToolName } =>
    TOOL_NAMES.has(p.name as ToolName),
  );

  const correction =
    knownPayloads.find(p => p.name === 'correctGrammar')
      ? normalizeCorrection(knownPayloads.find(p => p.name === 'correctGrammar')?.value)
      : normalizeCorrection(parseLooseFunctionCall(text, 'correctGrammar'));

  const challenge =
    knownPayloads.find(p => p.name === 'issueChallenge')
      ? normalizeChallenge(knownPayloads.find(p => p.name === 'issueChallenge')?.value)
      : normalizeChallenge(parseLooseFunctionCall(text, 'issueChallenge'));

  const vocabulary =
    knownPayloads.find(p => p.name === 'explainVocabulary')
      ? normalizeVocabulary(knownPayloads.find(p => p.name === 'explainVocabulary')?.value)
      : normalizeVocabulary(parseLooseFunctionCall(text, 'explainVocabulary'));

  const strippedProtocolText = removeRanges(text, protocolPayloads);
  let cleanedText = strippedProtocolText
    .replace(ECHO_FRAGMENT_RE, '')
    .replace(/(?:functions\.)?[a-zA-Z_]\w*:\d+\s*[>|$][\s\S]*$/gim, '')
    .replace(/functions?\.\w+\s*\([\s\S]*?\)\s*$/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const leadingBareJson = parseLeadingBareJsonToolPayload(cleanedText);
  if (leadingBareJson) cleanedText = leadingBareJson.cleanedText ?? '';

  const bareJson = leadingBareJson ?? parseBareJsonToolPayload(cleanedText);
  if (bareJson && !leadingBareJson) cleanedText = '';

  return {
    cleanedText,
    correction: correction ?? leadingBareJson?.correction ?? bareJson?.correction ?? null,
    challenge: challenge ?? leadingBareJson?.challenge ?? bareJson?.challenge ?? null,
    vocabulary: vocabulary ?? leadingBareJson?.vocabulary ?? bareJson?.vocabulary ?? null,
  };
}

export function getInlineToolFallbackLine(args: Pick<ParsedToolArtifacts, 'correction' | 'challenge' | 'vocabulary'>): string {
  if (args.challenge?.prompt) return `Quick challenge: ${args.challenge.prompt}`;
  if (args.correction?.corrected) return `A more natural way to say it is: ${args.correction.corrected}`;
  if (args.vocabulary?.word) return `Nice word to know: ${args.vocabulary.word}.`;
  return '';
}

export function sanitizeAssistantTextForModel(text: string): string {
  const parsed = stripToolCallArtifacts(text);
  return parsed.cleanedText || getInlineToolFallbackLine(parsed);
}
