import { describe, it, expect } from 'vitest';

/**
 * Tests the thinking state merge logic used in applySessions (storage.ts).
 *
 * The rule: keep whichever thinking state has the higher thinkingAt timestamp.
 * This prevents stale fetchSessions data from overwriting a fresher ephemeral
 * activity update that arrived while fetchSessions was decrypting.
 */

function mergeThinking(
    existing: { thinking: boolean; thinkingAt: number } | null,
    incoming: { thinking: boolean; thinkingAt: number },
): { thinking: boolean; thinkingAt: number } {
    const useExisting = existing != null && existing.thinkingAt > (incoming.thinkingAt ?? 0);
    return {
        thinking: useExisting ? existing.thinking : (incoming.thinking ?? false),
        thinkingAt: useExisting ? existing.thinkingAt : (incoming.thinkingAt ?? 0),
    };
}

describe('thinking state merge (applySessions logic)', () => {
    it('accepts incoming when no existing session', () => {
        const result = mergeThinking(null, { thinking: true, thinkingAt: 5000 });
        expect(result).toEqual({ thinking: true, thinkingAt: 5000 });
    });

    it('keeps newer ephemeral update when stale fetchSessions arrives later', () => {
        const existing = { thinking: true, thinkingAt: 5000 };
        const stale = { thinking: false, thinkingAt: 1000 };

        const result = mergeThinking(existing, stale);
        expect(result).toEqual({ thinking: true, thinkingAt: 5000 });
    });

    it('accepts newer ephemeral update over older fetchSessions data', () => {
        const existing = { thinking: false, thinkingAt: 1000 };
        const fresh = { thinking: true, thinkingAt: 5000 };

        const result = mergeThinking(existing, fresh);
        expect(result).toEqual({ thinking: true, thinkingAt: 5000 });
    });

    it('allows thinking=false when it has a newer timestamp (turn ended)', () => {
        const existing = { thinking: true, thinkingAt: 3000 };
        const turnEnd = { thinking: false, thinkingAt: 5000 };

        const result = mergeThinking(existing, turnEnd);
        expect(result).toEqual({ thinking: false, thinkingAt: 5000 });
    });

    it('uses incoming when timestamps are equal', () => {
        const existing = { thinking: true, thinkingAt: 3000 };
        const incoming = { thinking: false, thinkingAt: 3000 };

        const result = mergeThinking(existing, incoming);
        expect(result).toEqual({ thinking: false, thinkingAt: 3000 });
    });
});
