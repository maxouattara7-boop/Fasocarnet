import { describe, it, expect, beforeEach } from 'vitest';
import { supabaseClient } from './supabaseClient';

describe('supabaseClient', () => {
  beforeEach(() => {
    supabaseClient.setConfig('', '');
  });

  it('reads active configuration or defaults to environment', () => {
    const config = supabaseClient.getConfig();
    expect(config).toBeDefined();
    expect(typeof config.url).toBe('string');
    expect(typeof config.anonKey).toBe('string');
  });

  it('saves and retrieves custom supabase config', () => {
    supabaseClient.setConfig('https://myproject.supabase.co', 'my-anon-key-123');
    expect(supabaseClient.isConfigured()).toBe(true);

    const config = supabaseClient.getConfig();
    expect(config.url).toBe('https://myproject.supabase.co');
    expect(config.anonKey).toBe('my-anon-key-123');
    expect(config.isCustom).toBe(true);
  });

  it('resets custom configuration when empty strings are passed', () => {
    supabaseClient.setConfig('https://myproject.supabase.co', 'my-anon-key-123');
    expect(supabaseClient.getConfig().url).toBe('https://myproject.supabase.co');

    supabaseClient.setConfig('', '');
    const config = supabaseClient.getConfig();
    expect(config.isCustom).toBe(false);
  });

  it('handles missing credentials when testing connection with empty inputs', async () => {
    const res = await supabaseClient.testConnection('', '');
    expect(res.success).toBe(false);
    expect(res.message).toContain('Veuillez renseigner');
  });
});
