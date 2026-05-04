import { describe, expect, it } from 'vitest';
import {
  getInlineToolFallbackLine,
  sanitizeAssistantTextForModel,
  stripToolCallArtifacts,
} from './tool-artifacts';

describe('tool artifact parsing', () => {
  it('turns current > challenge protocol text into a card payload', () => {
    const parsed = stripToolCallArtifacts(
      'functions.issueChallenge:0>{"prompt":"Try saying \\"I want to learn English\\" with confidence.","type":"use-in-sentence","targetWord":"learn"}',
    );

    expect(parsed.cleanedText).toBe('');
    expect(parsed.challenge).toMatchObject({
      type: 'use-in-sentence',
      prompt: 'Try saying "I want to learn English" with confidence.',
    });
    expect(getInlineToolFallbackLine(parsed)).toBe(
      'Quick challenge: Try saying "I want to learn English" with confidence.',
    );
  });

  it('turns current > grammar protocol text into a card payload', () => {
    const parsed = stripToolCallArtifacts(
      'functions.correctGrammar:1>{"corrected":"I want to learn English.","explanation":"Use a full sentence here.","original":"want learn English"}',
    );

    expect(parsed.cleanedText).toBe('');
    expect(parsed.correction).toMatchObject({
      original: 'want learn English',
      corrected: 'I want to learn English.',
      explanation: 'Use a full sentence here.',
    });
  });

  it('still supports the older | protocol delimiter', () => {
    const parsed = stripToolCallArtifacts(
      'Nice try. functions.explainVocabulary:0|{"word":"confidence","partOfSpeech":"noun"}',
    );

    expect(parsed.cleanedText).toBe('Nice try.');
    expect(parsed.vocabulary).toMatchObject({
      word: 'confidence',
      partOfSpeech: 'noun',
    });
  });

  it('removes the $ protocol and input echo wrapper from mixed assistant text', () => {
    const parsed = stripToolCallArtifacts(
      "functions.explainVocabulary:0$\n{\n  \"word\":\"favorite\"\n}|${I think so what's your favorite movie}]My favorite movie is \"The Shawshank Redemption\". Can you use the word \"favorite\" in a sentence about a movie?",
    );

    expect(parsed.cleanedText).toBe(
      'My favorite movie is "The Shawshank Redemption". Can you use the word "favorite" in a sentence about a movie?',
    );
    expect(parsed.vocabulary).toMatchObject({
      word: 'favorite',
    });
    expect(parsed.cleanedText).not.toContain('functions.');
    expect(parsed.cleanedText).not.toContain('|${');
    expect(parsed.cleanedText).not.toContain('{');
  });

  it('handles bare JSON card payloads without exposing JSON text', () => {
    const parsed = stripToolCallArtifacts(
      '{"type":"translate-to-english","prompt":"Say this in English: I want to learn English","hint":"Start with I want to..."}',
    );

    expect(parsed.cleanedText).toBe('');
    expect(parsed.challenge).toMatchObject({
      type: 'translate-to-english',
      prompt: 'Say this in English: I want to learn English',
      hint: 'Start with I want to...',
    });
  });

  it('removes a leading bare JSON correction while preserving the natural reply', () => {
    const parsed = stripToolCallArtifacts(
      '{\n  "corrected":"I like movies.",\n  "explanation":"You are good to go, just a small typo there!",\n  "original":"I like movies"\n}You are good to go, just a small typo there! So, any action movie you have seen recently?',
    );

    expect(parsed.cleanedText).toBe(
      'You are good to go, just a small typo there! So, any action movie you have seen recently?',
    );
    expect(parsed.correction).toMatchObject({
      original: 'I like movies',
      corrected: 'I like movies.',
      explanation: 'You are good to go, just a small typo there!',
    });
    expect(parsed.cleanedText).not.toContain('"corrected"');
    expect(parsed.cleanedText).not.toContain('{');
  });

  it('sanitizes assistant history before sending it back to the model', () => {
    const text = sanitizeAssistantTextForModel(
      'functions.issueChallenge:0>{"prompt":"Use learn in a sentence.","type":"use-in-sentence"}',
    );

    expect(text).toBe('Quick challenge: Use learn in a sentence.');
    expect(text).not.toContain('functions.');
    expect(text).not.toContain('{');
  });
});
