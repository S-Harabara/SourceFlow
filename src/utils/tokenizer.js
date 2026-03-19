import { Tiktoken } from 'tiktoken/lite';
import claudeConfig from '@anthropic-ai/tokenizer/dist/cjs/claude.json';

/**
 * Accurately count tokens using the Claude BPE ranks.
 * This implementation avoids the CommonJS wrapper of @anthropic-ai/tokenizer
 * which causes issues with Top-Level Await and Wasm in Vite builds.
 */
export function getTokenCount(text) {
    if (!text) return 0;
    try {
        const tokenizer = new Tiktoken(
            claudeConfig.bpe_ranks,
            claudeConfig.special_tokens,
            claudeConfig.pat_str
        );
        const encoded = tokenizer.encode(text.normalize('NFKC'), 'all');
        tokenizer.free();

        return encoded.length;
    } catch (e) {
        console.warn('Tokenizer failed, falling back to estimation:', e);
        return Math.ceil(text.length / 4);
    }
}
