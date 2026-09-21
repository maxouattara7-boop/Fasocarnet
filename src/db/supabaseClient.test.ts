import { describe, it, expect, beforeEach } from 'vitest';
import { supabaseClient } from './supabaseClient';

describe('supabaseClient', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('detects unconfigured state by default', () => {
    expect(supabaseClient.isConfigured()).toBe(false);
    expect(supabaseClient.getClient()).toBeNull();
  });

  it('saves and retrieves custom supabase config', () => {
    supabaseClient.setConfig('https://myproject.supabase.co', 'my-anon-key-123');
    expect(supabaseClient.isConfigured()).toBe(true);

    const config = supabaseClient.getConfig();
    expect(config.url).toBe('https://myproject.supabase.co');
    expect(config.anonKey).toBe('my-anon-key-123');
    expect(config.isCustom).toBe(true);
  });

  it('resets configuration when empty strings are passed', () => {
    supabaseClient.setConfig('https://myproject.supabase.co', 'my-anon-key-123');
    expect(supabaseClient.isConfigured()).toBe(true);

    supabaseClient.setConfig('', '');
    expect(supabaseClient.isConfigured()).toBe(false);
  });

  it('handles missing credentials when testing connection', async () => {
    const res = await supabaseClient.testConnection('', '');
    expect(res.success).toBe(false);
    expect(res.message).toContain('Veuillez renseigner');
  });
});
