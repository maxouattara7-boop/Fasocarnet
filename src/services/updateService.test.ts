import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateService, CURRENT_VERSION_CODE, CURRENT_APP_VERSION, AppUpdateInfo } from './updateService';

describe('updateService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('detects an update when remote versionCode is greater than local', async () => {
    const mockUpdate: AppUpdateInfo = {
      version: '1.3.0',
      versionCode: CURRENT_VERSION_CODE + 1,
      releaseNotes: 'Nouvelles fonctionnalités',
      apkUrl: 'https://example.com/app.apk',
      mandatory: false
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUpdate
    } as any);

    const result = await updateService.checkForUpdate();
    expect(result.hasUpdate).toBe(true);
    expect(result.updateInfo?.version).toBe('1.3.0');
    expect(result.updateInfo?.versionCode).toBe(CURRENT_VERSION_CODE + 1);
  });

  it('returns hasUpdate = false when remote versionCode is equal or smaller', async () => {
    const mockUpdate: AppUpdateInfo = {
      version: CURRENT_APP_VERSION,
      versionCode: CURRENT_VERSION_CODE,
      releaseNotes: 'Version actuelle',
      apkUrl: 'https://example.com/app.apk'
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUpdate
    } as any);

    const result = await updateService.checkForUpdate();
    expect(result.hasUpdate).toBe(false);
    expect(result.updateInfo).toBeUndefined();
  });

  it('handles network failure gracefully without throwing', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const oldXHR = global.XMLHttpRequest;
    global.XMLHttpRequest = vi.fn().mockImplementation(() => ({
      open: vi.fn(),
      send: vi.fn(function(this: any) {
        if (this.onerror) this.onerror(new Error('Network error'));
      })
    })) as any;

    const result = await updateService.checkForUpdate();
    expect(result.hasUpdate).toBe(false);
    expect(result.updateInfo).toBeUndefined();

    global.XMLHttpRequest = oldXHR;
  });

  it('tracks dismissed updates by version and date', () => {
    expect(updateService.isDismissed('1.3.0')).toBe(false);
    
    updateService.dismissUpdate('1.3.0');
    expect(updateService.isDismissed('1.3.0')).toBe(true);
    expect(updateService.isDismissed('1.4.0')).toBe(false);
  });

  it('handles live update execution safely on web / non-native environment', async () => {
    const res = await updateService.applyLiveUpdate('https://example.com/dist.zip', '1.3.0');
    expect(res.success).toBe(false);
  });
});
