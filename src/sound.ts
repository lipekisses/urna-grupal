// Gerador de áudio Web Audio API para simulação fiel dos sons da Urna Eletrônica brasileira

class SoundService {
  private ctx: AudioContext | null = null
  private enabled: boolean = true
  private voiceEnabled: boolean = false

  constructor() {
    // Lazy initialization on first user interaction
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
    return this.ctx
  }

  public setSoundEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  public isSoundEnabled(): boolean {
    return this.enabled
  }

  public setVoiceEnabled(enabled: boolean) {
    this.voiceEnabled = enabled
  }

  public isVoiceEnabled(): boolean {
    return this.voiceEnabled
  }

  /**
   * Bip curto ao pressionar teclas numéricas ou de ação
   */
  public playKeyBeep() {
    if (!this.enabled) return
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(1050, ctx.currentTime)

      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.05)
    } catch {
      // Ignora falhas de áudio silenciosamente
    }
  }

  /**
   * Som de aviso / erro
   */
  public playErrorBeep() {
    if (!this.enabled) return
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(220, ctx.currentTime)

      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.16)
    } catch {}
  }

  /**
   * Som intermediário ao confirmar uma etapa (ex: Presidente antes de Vice)
   */
  public playStepConfirm() {
    if (!this.enabled) return
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const t = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(440, t)
      osc.frequency.setValueAtTime(880, t + 0.08)

      gain.gain.setValueAtTime(0.2, t)
      gain.gain.setValueAtTime(0.2, t + 0.08)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(t)
      osc.stop(t + 0.22)
    } catch {}
  }

  /**
   * O som clássico e icônico da Urna Eletrônica Brasileira (TSE - FIM / "Pililili")
   */
  public playUrnaFim(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.enabled) {
        setTimeout(resolve, 800)
        return
      }
      const ctx = this.getContext()
      if (!ctx) {
        setTimeout(resolve, 800)
        return
      }

      try {
        const t0 = ctx.currentTime
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sine'

        // Tom 1: 440 Hz por 90ms
        osc.frequency.setValueAtTime(440, t0)
        gain.gain.setValueAtTime(0.28, t0)

        // Pausa sutil
        gain.setValueAtTime(0.001, t0 + 0.09)

        // Tom 2: 880 Hz por 90ms
        osc.frequency.setValueAtTime(880, t0 + 0.11)
        gain.setValueAtTime(0.28, t0 + 0.11)

        // Pausa sutil
        gain.setValueAtTime(0.001, t0 + 0.20)

        // Tom 3 agudo característico: ~1760 Hz por 700ms com fadeout suave
        osc.frequency.setValueAtTime(1760, t0 + 0.22)
        gain.setValueAtTime(0.32, t0 + 0.22)
        gain.exponentialRampToValueAtTime(0.0001, t0 + 0.95)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(t0)
        osc.stop(t0 + 0.98)

        setTimeout(() => {
          resolve()
        }, 1000)
      } catch {
        setTimeout(resolve, 800)
      }
    })
  }

  /**
   * Audiodescrição para acessibilidade (síntese de voz em português)
   */
  public speak(text: string) {
    if (!this.voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return

    try {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'pt-BR'
      utterance.rate = 1.05
      window.speechSynthesis.speak(utterance)
    } catch {}
  }
}

export const sounds = new SoundService()
