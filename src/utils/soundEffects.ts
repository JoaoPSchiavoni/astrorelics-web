/**
 * Sintetizador e controlador de áudio e efeitos sonoros espaciais.
 * Gerencia a trilha sonora oficial de fundo (audio-10-minutos.mp3) com loop contínuo,
 * volume audível e balanceado, reinício automático e ducking durante saltos hiperspaciais.
 */
class SpaceSoundController {
  private ctx: AudioContext | null = null;
  private enabled = false;
  private userMuted = false;
  private bgAudio: HTMLAudioElement | null = null;
  private baseBgVolume = 0.70;
  private stateChangeListeners: Set<(enabled: boolean) => void> = new Set();
  private interactionCleanup: (() => void) | null = null;

  public isEnabled(): boolean {
    if (this.bgAudio) {
      return !this.bgAudio.paused && !this.bgAudio.muted;
    }
    return this.enabled;
  }

  private getAudioUrl(): string {
    const baseUrl =
      typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL
        ? import.meta.env.BASE_URL.replace(/\/$/, '')
        : '';
    return `${baseUrl}/audio-10-minutos.mp3`;
  }

  private ensureBgAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;

    if (!this.bgAudio) {
      let audio = document.getElementById('beyond-bg-music') as HTMLAudioElement | null;
      if (!audio) {
        audio = new Audio(this.getAudioUrl());
        audio.id = 'beyond-bg-music';
        document.body.appendChild(audio);
      }

      audio.loop = true;
      // 'none': a trilha (~5 MB) só é transmitida quando realmente tocar, sem disputar banda
      // com os modelos 3D durante o carregamento inicial (crítico em redes móveis).
      audio.preload = 'none';
      audio.volume = this.baseBgVolume;
      audio.muted = false;

      // Garantia de reinício em loop contínuo assim que a faixa de 10 min acabar
      audio.addEventListener('ended', () => {
        console.log('[Beyond Audio] Faixa finalizada — reiniciando imediatamente em loop contínuo...');
        audio!.currentTime = 0;
        audio!.play().catch((err) => {
          console.warn('[Beyond Audio] Erro ao reiniciar áudio em loop:', err);
        });
      });

      audio.addEventListener('play', () => {
        console.log('[Beyond Audio] Áudio em reprodução ativa (volume: ' + audio!.volume + ')');
        this.enabled = true;
        this.notifyStateChange();
      });

      audio.addEventListener('pause', () => {
        console.log('[Beyond Audio] Áudio pausado.');
        this.enabled = false;
        this.notifyStateChange();
      });

      audio.addEventListener('error', (e) => {
        console.error('[Beyond Audio] Erro no carregamento/reprodução do áudio:', e);
      });

      this.bgAudio = audio;
    }
    return this.bgAudio;
  }

  private notifyStateChange(): void {
    const active = this.isEnabled();
    this.stateChangeListeners.forEach((fn) => {
      try {
        fn(active);
      } catch {
        // noop
      }
    });
  }

  private startBackgroundMusic(): Promise<void> {
    const audio = this.ensureBgAudio();
    if (!audio) return Promise.resolve();

    audio.muted = false;
    audio.volume = this.baseBgVolume;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      return playPromise
        .then(() => {
          this.enabled = true;
          this.notifyStateChange();
        })
        .catch((err) => {
          console.warn('[Beyond Audio] Reprodução automática bloqueada pelo navegador:', err);
        });
    }
    return Promise.resolve();
  }

  private stopBackgroundMusic(): void {
    const audio = this.ensureBgAudio();
    if (!audio) return;

    try {
      audio.pause();
    } catch {
      // noop
    }
    this.enabled = false;
    this.notifyStateChange();
  }

  /**
   * Inicializa o áudio de fundo ou escuta a primeira interação do usuário na página.
   */
  public initAutoPlay(onStateChange?: (enabled: boolean) => void): () => void {
    if (onStateChange) {
      this.stateChangeListeners.add(onStateChange);
    }

    if (typeof window === 'undefined') {
      return () => {};
    }

    const audio = this.ensureBgAudio();
    if (!audio) return () => {};

    // 1. Tenta reproduzir imediatamente
    if (!this.userMuted) {
      audio.volume = this.baseBgVolume;
      audio.muted = false;
      const promise = audio.play();
      if (promise !== undefined) {
        promise
          .then(() => {
            this.enabled = true;
            this.notifyStateChange();
          })
          .catch(() => {
            // Requer interação do usuário segundo as regras do navegador
          });
      }
    }

    // 2. Escuta interação na tela para destravar a reprodução caso o navegador exija gesto
    const handleFirstInteraction = (e: Event) => {
      // Se clicou em um botão (como o botão de som no HUD), o onClick do botão gerencia diretamente
      const target = e.target as HTMLElement | null;
      if (target?.closest('button')) {
        return;
      }

      if (this.userMuted) {
        cleanup();
        return;
      }

      this.ensureContext();
      audio.volume = this.baseBgVolume;
      audio.muted = false;
      audio
        .play()
        .then(() => {
          this.enabled = true;
          this.notifyStateChange();
        })
        .catch(() => {})
        .finally(() => {
          cleanup();
        });
    };

    const cleanup = () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      this.interactionCleanup = null;
    };

    window.addEventListener('pointerdown', handleFirstInteraction, { passive: true });
    window.addEventListener('keydown', handleFirstInteraction, { passive: true });
    window.addEventListener('touchstart', handleFirstInteraction, { passive: true });
    this.interactionCleanup = cleanup;

    return () => {
      cleanup();
      if (onStateChange) {
        this.stateChangeListeners.delete(onStateChange);
      }
    };
  }

  /**
   * Ativa ou desativa explicitamente o áudio (chamado pelo botão do HUD).
   */
  public setEnabled(nextState: boolean): boolean {
    this.userMuted = !nextState;

    if (!nextState && this.interactionCleanup) {
      this.interactionCleanup();
      this.interactionCleanup = null;
    }

    if (nextState) {
      this.ensureContext();
      void this.startBackgroundMusic();
      this.playSubtleChime(520, 0.08);
      this.enabled = true;
    } else {
      this.stopBackgroundMusic();
      this.enabled = false;
    }

    this.notifyStateChange();
    return this.enabled;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  public playHighlightPing(): void {
    if (!this.isEnabled()) return;
    this.playSubtleChime(660, 0.09);
  }

  public playResetTone(): void {
    if (!this.isEnabled()) return;
    this.playSubtleChime(440, 0.11);
  }

  public playMissionClick(): void {
    if (!this.isEnabled()) return;
    this.playSubtleChime(587.33, 0.075);
  }

  public playMissionAlert(): void {
    if (!this.isEnabled()) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(370, now);
      osc.frequency.setValueAtTime(311.13, now + 0.09);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.045, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.24);
    } catch {
      // noop
    }
  }

  public playMissionComplete(): void {
    if (!this.isEnabled()) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.085;
        const duration = 0.35;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.04, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + duration + 0.02);
      });
    } catch {
      // noop
    }
  }

  private playSubtleChime(freq: number, duration: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.12, now + duration);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.04, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch {
      // noop
    }
  }

  /**
   * Efeito sonoro cinematográfico em três fases sincronizado com a viagem espacial:
   * 1. Aceleração (subida harmônica)
   * 2. Viagem (impulso grave filtrado)
   * 3. Chegada (desaceleração suave na órbita do destino)
   *
   * Inclui atenuação dinâmica da música de fundo durante o pulso de propulsão.
   */
  public playHyperspaceTravel(durationSec = 2.5): void {
    if (!this.isEnabled()) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    // Atenuação sutil da música durante o pulso de propulsão
    if (this.bgAudio && !this.bgAudio.paused) {
      const origVol = this.baseBgVolume;
      this.bgAudio.volume = origVol * 0.35;
      const arrivalDelayMs = Math.max(200, (durationSec - 0.6) * 1000);
      setTimeout(() => {
        if (this.isEnabled() && this.bgAudio && !this.bgAudio.paused) {
          this.bgAudio.volume = origVol;
        }
      }, arrivalDelayMs);
    }

    try {
      const now = ctx.currentTime;
      const accelEnd = now + durationSec * 0.26;
      const cruiseEnd = now + durationSec * 0.74;
      const arrivalEnd = now + durationSec;

      // Oscilador grave de propulsão
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sawtooth';
      subOsc.frequency.setValueAtTime(48, now);
      subOsc.frequency.exponentialRampToValueAtTime(135, accelEnd);
      subOsc.frequency.setValueAtTime(135, cruiseEnd);
      subOsc.frequency.exponentialRampToValueAtTime(52, arrivalEnd);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(120, now);
      filter.frequency.exponentialRampToValueAtTime(620, accelEnd);
      filter.frequency.exponentialRampToValueAtTime(110, arrivalEnd);

      subGain.gain.setValueAtTime(0.0001, now);
      subGain.gain.exponentialRampToValueAtTime(0.075, accelEnd);
      subGain.gain.setValueAtTime(0.065, cruiseEnd);
      subGain.gain.exponentialRampToValueAtTime(0.0001, arrivalEnd);

      subOsc.connect(filter);
      filter.connect(subGain);
      subGain.connect(ctx.destination);

      subOsc.start(now);
      subOsc.stop(arrivalEnd + 0.05);

      // Harmônico etéreo de chegada
      const shimmerOsc = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      shimmerOsc.type = 'sine';
      shimmerOsc.frequency.setValueAtTime(220, now);
      shimmerOsc.frequency.exponentialRampToValueAtTime(440, accelEnd);
      shimmerOsc.frequency.exponentialRampToValueAtTime(293.66, arrivalEnd);

      shimmerGain.gain.setValueAtTime(0.0001, now);
      shimmerGain.gain.exponentialRampToValueAtTime(0.03, accelEnd);
      shimmerGain.gain.exponentialRampToValueAtTime(0.0001, arrivalEnd);

      shimmerOsc.connect(shimmerGain);
      shimmerGain.connect(ctx.destination);

      shimmerOsc.start(now);
      shimmerOsc.stop(arrivalEnd + 0.05);
    } catch {
      // noop
    }
  }
}

export const soundEffects = new SpaceSoundController();
