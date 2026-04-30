import { formatDuration } from '../utils/format'

export type RideTimerStatus = 'IDLE' | 'RIDING' | 'PAUSED'

export interface RideTimerSnapshot {
  status: RideTimerStatus
  elapsedSeconds: number
  formattedDuration: string
}

type TimerListener = (snapshot: RideTimerSnapshot) => void

export class RideTimerService {
  private status: RideTimerStatus
  private elapsedSeconds: number
  private startedAt: number
  private timerId: number | null
  private listeners: Set<TimerListener>

  constructor() {
    this.status = 'IDLE'
    this.elapsedSeconds = 0
    this.startedAt = 0
    this.timerId = null
    this.listeners = new Set<TimerListener>()
  }

  start(): RideTimerSnapshot {
    this.clearTimer()
    this.status = 'RIDING'
    this.elapsedSeconds = 0
    this.startedAt = Date.now()
    this.startTicker()

    return this.emitSnapshot()
  }

  pause(): RideTimerSnapshot {
    if (this.status !== 'RIDING') {
      return this.getSnapshot()
    }

    this.elapsedSeconds = this.getCurrentElapsedSeconds()
    this.status = 'PAUSED'
    this.clearTimer()

    return this.emitSnapshot()
  }

  resume(): RideTimerSnapshot {
    if (this.status !== 'PAUSED') {
      return this.getSnapshot()
    }

    this.status = 'RIDING'
    this.startedAt = Date.now() - this.elapsedSeconds * 1000
    this.startTicker()

    return this.emitSnapshot()
  }

  reset(): RideTimerSnapshot {
    this.clearTimer()
    this.status = 'IDLE'
    this.elapsedSeconds = 0
    this.startedAt = 0

    return this.emitSnapshot()
  }

  subscribe(listener: TimerListener): () => void {
    this.listeners.add(listener)
    listener(this.getSnapshot())

    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot(): RideTimerSnapshot {
    const elapsedSeconds =
      this.status === 'RIDING' ? this.getCurrentElapsedSeconds() : this.elapsedSeconds

    return {
      status: this.status,
      elapsedSeconds,
      formattedDuration: formatDuration(elapsedSeconds),
    }
  }

  private startTicker(): void {
    this.clearTimer()
    this.timerId = setInterval(() => {
      this.elapsedSeconds = this.getCurrentElapsedSeconds()
      this.emitSnapshot()
    }, 1000)
  }

  private clearTimer(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId)
      this.timerId = null
    }
  }

  private getCurrentElapsedSeconds(): number {
    if (!this.startedAt) {
      return 0
    }

    return Math.max(0, Math.floor((Date.now() - this.startedAt) / 1000))
  }

  private emitSnapshot(): RideTimerSnapshot {
    const snapshot = this.getSnapshot()

    this.listeners.forEach((listener) => {
      listener(snapshot)
    })

    return snapshot
  }
}
