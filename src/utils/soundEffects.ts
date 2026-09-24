/**
 * Utilitaire de retours sonores et vocaux (Web Audio API & Speech Synthesis)
 * Fonctionne 100% hors ligne, sans téléchargement de fichiers externes
 */

class SoundEffectsService {
  private audioCtx: AudioContext | null = null;
  private isSoundEnabled: boolean = true;
  private isVoiceEnabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      const soundPref = localStorage.getItem('fasocarnet_sound_enabled');
      const voicePref = localStorage.getItem('fasocarnet_voice_enabled');
      this.isSoundEnabled = soundPref !== null ? soundPref === 'true' : true;
      this.isVoiceEnabled = voicePref !== null ? voicePref === 'true' : true;
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Joue le carillon / jingle moderne de caisse enregistreuse ("Ting-Ting !")
   */
  playCashRegisterChime(): void {
    if (!this.isSoundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Note 1 : Sol 5 (784 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(783.99, now);
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2 : Do 6 (1046.5 Hz) - Son cristallin
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1046.5, now + 0.1);
      gain2.gain.setValueAtTime(0.3, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.6);

      // Note 3 : Mi 6 (1318.5 Hz) - Harmonique finale festive
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1318.51, now + 0.2);
      gain3.gain.setValueAtTime(0.2, now + 0.2);
      gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.2);
      osc3.stop(now + 0.7);
    } catch (e) {
      console.warn('Audio feedback non disponible:', e);
    }
  }

  /**
   * Joue l'alarme / carillon de relance des dettes (mélodie professionnelle de réveil / alerte)
   */
  playDebtAlarmSound(): void {
    if (!this.isSoundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [
        { freq: 523.25, time: 0.0, dur: 0.25 }, // Do 5
        { freq: 659.25, time: 0.2, dur: 0.25 }, // Mi 5
        { freq: 783.99, time: 0.4, dur: 0.4 },  // Sol 5
        { freq: 1046.5, time: 0.7, dur: 0.6 }   // Do 6
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);
        gain.gain.setValueAtTime(0.28, now + time);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    } catch (e) {
      console.warn('Audio alerte dettes non disponible:', e);
    }
  }

  /**
   * Synthèse vocale courte en français : annonce le montant de la vente
   */
  speakSaleConfirmation(amount: number, isCredit: boolean = false): void {
    if (!this.isVoiceEnabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();

      const formattedAmount = Math.round(amount).toLocaleString('fr-FR');
      const text = isCredit
        ? `Vente à crédit de ${formattedAmount} francs notée`
        : `Vente de ${formattedAmount} francs enregistrée`;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const frVoice = voices.find(v => v.lang.startsWith('fr'));
      if (frVoice) {
        utterance.voice = frVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Synthèse vocale non disponible:', e);
    }
  }

  /**
   * Déclenche le combo son + voix lors d'une validation de vente
   */
  notifySaleSuccess(amount: number, isCredit: boolean = false): void {
    this.playCashRegisterChime();
    setTimeout(() => {
      this.speakSaleConfirmation(amount, isCredit);
    }, 450);
  }

  getSoundEnabled(): boolean {
    return this.isSoundEnabled;
  }

  setSoundEnabled(val: boolean): void {
    this.isSoundEnabled = val;
    if (typeof window !== 'undefined') {
      localStorage.setItem('fasocarnet_sound_enabled', String(val));
    }
  }

  getVoiceEnabled(): boolean {
    return this.isVoiceEnabled;
  }

  setVoiceEnabled(val: boolean): void {
    this.isVoiceEnabled = val;
    if (typeof window !== 'undefined') {
      localStorage.setItem('fasocarnet_voice_enabled', String(val));
    }
  }
}

export const soundEffects = new SoundEffectsService();
