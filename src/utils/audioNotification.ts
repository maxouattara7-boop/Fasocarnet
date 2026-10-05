/**
 * Utilitaire de notification sonore léger utilisant l'API Web Audio native.
 * Fonctionne 100% hors-ligne, sans dépendance externe ni fichier audio lourd.
 */

class AudioNotificationService {
  private audioCtx: AudioContext | null = null;
  private isSoundEnabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fasocarnet_admin_sound_enabled');
      this.isSoundEnabled = saved !== 'false';
    }
  }

  public isEnabled(): boolean {
    return this.isSoundEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.isSoundEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('fasocarnet_admin_sound_enabled', enabled ? 'true' : 'false');
    }
  }

  public toggle(): boolean {
    this.setEnabled(!this.isSoundEnabled);
    return this.isSoundEnabled;
  }

  /**
   * Joue un son court, doux et harmonieux (double-ton chime : 880Hz -> 1320Hz)
   */
  public playNewAccountChime(): void {
    if (!this.isSoundEnabled) return;
    if (typeof window === 'undefined') return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      // Note 1 : La 5 (880 Hz)
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Note 2 : Mi 6 (1318.5 Hz) 60ms plus tard
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.5, now + 0.06);
      gain2.gain.setValueAtTime(0.14, now + 0.06);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(now + 0.06);
      osc2.stop(now + 0.28);

    } catch (err) {
      console.warn('[AudioNotification] Impossible de jouer le son:', err);
    }
  }
}

export const audioNotification = new AudioNotificationService();
