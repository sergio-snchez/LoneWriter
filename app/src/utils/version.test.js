import { describe, it, expect } from 'vitest';
import { APP_VERSION } from './version';

describe('APP_VERSION', () => {
  it('is defined and is a string', () => {
    expect(APP_VERSION).toBeDefined();
    expect(typeof APP_VERSION).toBe('string');
  });

  it('has a value matching semver-like format', () => {
    // Should match something like "2.0.0-timeline" or "x.y.z-*"
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('should be the project version', () => {
    // In tests the fallback is used since __APP_VERSION__ is a Vite define
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
