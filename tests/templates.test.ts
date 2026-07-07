import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('workflow templates', () => {
  it('ships seven importable template JSON files', () => {
    const dir = join(process.cwd(), 'examples', 'templates');
    const files = readdirSync(dir).filter((name) => name.endsWith('.json')).sort();

    expect(files).toHaveLength(7);

    for (const file of files) {
      const content = readFileSync(join(dir, file), 'utf8');
      const parsed = JSON.parse(content) as {
        name?: string;
        nodes?: unknown[];
        connections?: Record<string, unknown>;
      };

      expect(typeof parsed.name).toBe('string');
      expect(Array.isArray(parsed.nodes)).toBe(true);
      expect(typeof parsed.connections).toBe('object');
    }
  });
});
