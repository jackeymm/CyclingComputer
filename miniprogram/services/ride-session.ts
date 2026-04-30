import { RideLocationService, type LocationPoint } from './location'
import { RideTimerService, type RideTimerSnapshot } from './timer'
import { calculateDistanceKm } from '../utils/calculator'
import { formatDistance, formatSpeed } from '../utils/format'

const MIN_VALID_DISTANCE_KM = 0.002
const MIN_VALID_SPEED_KMH = 1
const MAX_VALID_ACCURACY_METERS = 30
const GPS_WEAK_ACCURACY_METERS = 50

export type RideSessionStatus = 'IDLE' | 'RIDING' | 'PAUSED' | 'FINISHED'

export interface RideSessionSnapshot {
  status: RideSessionStatus
  startTime: number
  endTime: number
  elapsedSeconds: number
  formattedDuration: string
  totalDistanceKm: number
  formattedDistance: string
  currentSpeedKmh: number
  formattedSpeed: string
  maxSpeedKmh: number
  averageSpeedKmh: number
  gpsSignalWeak: boolean
  latestPoint: LocationPoint | null
}

type SessionListener = (snapshot: RideSessionSnapshot) => void
type SessionErrorListener = (error: WechatMiniprogram.GeneralCallbackResult) => void

export class RideSessionService {
  private status: RideSessionStatus
  private startTime: number
  private endTime: number
  private totalDistanceKm: number
  private currentSpeedKmh: number
  private maxSpeedKmh: number
  private gpsSignalWeak: boolean
  private latestPoint: LocationPoint | null
  private previousTrackedPoint: LocationPoint | null
  private readonly timerService: RideTimerService
  private readonly locationService: RideLocationService
  private readonly listeners: Set<SessionListener>
  private readonly errorListeners: Set<SessionErrorListener>
  private readonly unsubscribeTimer: () => void
  private readonly unsubscribeLocation: () => void
  private readonly unsubscribeLocationError: () => void

  constructor(
    timerService: RideTimerService = new RideTimerService(),
    locationService: RideLocationService = new RideLocationService()
  ) {
    this.status = 'IDLE'
    this.startTime = 0
    this.endTime = 0
    this.totalDistanceKm = 0
    this.currentSpeedKmh = 0
    this.maxSpeedKmh = 0
    this.gpsSignalWeak = false
    this.latestPoint = null
    this.previousTrackedPoint = null
    this.timerService = timerService
    this.locationService = locationService
    this.listeners = new Set<SessionListener>()
    this.errorListeners = new Set<SessionErrorListener>()
    this.handleTimerChange = this.handleTimerChange.bind(this)
    this.handleLocationChange = this.handleLocationChange.bind(this)
    this.emitError = this.emitError.bind(this)
    this.unsubscribeTimer = this.timerService.subscribe(this.handleTimerChange)
    this.unsubscribeLocation = this.locationService.subscribe(this.handleLocationChange)
    this.unsubscribeLocationError = this.locationService.subscribeError(this.emitError)
  }

  async start(): Promise<RideSessionSnapshot> {
    this.resetMetrics()
    this.status = 'RIDING'
    this.startTime = Date.now()
    this.endTime = 0

    try {
      await this.locationService.start()
      this.applyTimerSnapshot(this.timerService.start())
    } catch (error) {
      this.status = 'IDLE'
      throw error
    }

    return this.emitSnapshot()
  }

  pause(): RideSessionSnapshot {
    if (this.status !== 'RIDING') {
      return this.getSnapshot()
    }

    this.applyTimerSnapshot(this.timerService.pause())
    this.status = 'PAUSED'
    this.currentSpeedKmh = 0

    return this.emitSnapshot()
  }

  resume(): RideSessionSnapshot {
    if (this.status !== 'PAUSED') {
      return this.getSnapshot()
    }

    this.previousTrackedPoint = isHighQualityPoint(this.latestPoint) ? this.latestPoint : null
    this.status = 'RIDING'
    this.applyTimerSnapshot(this.timerService.resume())

    return this.emitSnapshot()
  }

  async finish(): Promise<RideSessionSnapshot> {
    if (this.status === 'IDLE' || this.status === 'FINISHED') {
      return this.getSnapshot()
    }

    if (this.status === 'RIDING') {
      this.applyTimerSnapshot(this.timerService.pause())
    }

    await this.locationService.stop()
    this.status = 'FINISHED'
    this.endTime = Date.now()
    this.currentSpeedKmh = 0
    this.previousTrackedPoint = null

    return this.emitSnapshot()
  }

  async reset(): Promise<RideSessionSnapshot> {
    if (this.locationService.getIsListening()) {
      await this.locationService.stop()
    }

    this.timerService.reset()
    this.status = 'IDLE'
    this.resetMetrics()

    return this.emitSnapshot()
  }

  destroy(): void {
    this.unsubscribeTimer()
    this.unsubscribeLocation()
    this.unsubscribeLocationError()
  }

  subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener)
    listener(this.getSnapshot())

    return () => {
      this.listeners.delete(listener)
    }
  }

  subscribeError(listener: SessionErrorListener): () => void {
    this.errorListeners.add(listener)

    return () => {
      this.errorListeners.delete(listener)
    }
  }

  getSnapshot(): RideSessionSnapshot {
    const timerSnapshot = this.timerService.getSnapshot()
    const averageSpeedKmh =
      timerSnapshot.elapsedSeconds > 0
        ? this.totalDistanceKm / (timerSnapshot.elapsedSeconds / 3600)
        : 0

    return {
      status: this.status,
      startTime: this.startTime,
      endTime: this.endTime,
      elapsedSeconds: timerSnapshot.elapsedSeconds,
      formattedDuration: timerSnapshot.formattedDuration,
      totalDistanceKm: this.totalDistanceKm,
      formattedDistance: formatDistance(this.totalDistanceKm),
      currentSpeedKmh: this.currentSpeedKmh,
      formattedSpeed: formatSpeed(this.currentSpeedKmh),
      maxSpeedKmh: this.maxSpeedKmh,
      averageSpeedKmh,
      gpsSignalWeak: this.gpsSignalWeak,
      latestPoint: this.latestPoint,
    }
  }

  private handleTimerChange(snapshot: RideTimerSnapshot): void {
    if (snapshot.status === 'RIDING' && this.status !== 'FINISHED') {
      this.status = 'RIDING'
    }

    if (snapshot.status === 'PAUSED' && this.status !== 'FINISHED') {
      this.status = 'PAUSED'
    }

    if (snapshot.status === 'IDLE' && this.status !== 'FINISHED') {
      this.status = 'IDLE'
    }

    this.emitSnapshot()
  }

  private handleLocationChange(locationPoint: LocationPoint): void {
    this.latestPoint = locationPoint
    this.gpsSignalWeak = locationPoint.accuracy > GPS_WEAK_ACCURACY_METERS

    if (this.status !== 'RIDING') {
      return
    }

    const estimatedSpeedKmh = this.previousTrackedPoint
      ? estimateSpeedKmh(this.previousTrackedPoint, locationPoint)
      : 0
    const speedKmh = normalizeSpeedKmh(Math.max(locationPoint.speed * 3.6, estimatedSpeedKmh))
    this.currentSpeedKmh = speedKmh

    if (speedKmh > this.maxSpeedKmh) {
      this.maxSpeedKmh = speedKmh
    }

    if (!this.previousTrackedPoint) {
      if (isHighQualityPoint(locationPoint)) {
        this.previousTrackedPoint = locationPoint
      }
      this.emitSnapshot()
      return
    }

    if (!isHighQualityPoint(locationPoint) || speedKmh < MIN_VALID_SPEED_KMH) {
      this.emitSnapshot()
      return
    }

    const distanceKm = calculateDistanceKm(this.previousTrackedPoint, locationPoint)

    if (distanceKm > MIN_VALID_DISTANCE_KM && speedKmh >= MIN_VALID_SPEED_KMH) {
      this.totalDistanceKm += distanceKm
      this.previousTrackedPoint = locationPoint
    }
    this.emitSnapshot()
  }

  private resetMetrics(): void {
    this.startTime = 0
    this.endTime = 0
    this.totalDistanceKm = 0
    this.currentSpeedKmh = 0
    this.maxSpeedKmh = 0
    this.gpsSignalWeak = false
    this.latestPoint = null
    this.previousTrackedPoint = null
  }

  private applyTimerSnapshot(snapshot: RideTimerSnapshot): void {
    if (snapshot.status === 'RIDING') {
      this.status = 'RIDING'
    }

    if (snapshot.status === 'PAUSED') {
      this.status = 'PAUSED'
    }

    if (snapshot.status === 'IDLE') {
      this.status = 'IDLE'
    }
  }

  private emitSnapshot(): RideSessionSnapshot {
    const snapshot = this.getSnapshot()

    this.listeners.forEach((listener) => {
      listener(snapshot)
    })

    return snapshot
  }

  private emitError(error: WechatMiniprogram.GeneralCallbackResult): void {
    this.errorListeners.forEach((listener) => {
      listener(error)
    })
  }
}

const normalizeSpeedKmh = (speedKmh: number): number => {
  if (!Number.isFinite(speedKmh) || speedKmh < MIN_VALID_SPEED_KMH) {
    return 0
  }

  return speedKmh
}

const estimateSpeedKmh = (startPoint: LocationPoint, endPoint: LocationPoint): number => {
  const durationSeconds = (endPoint.timestamp - startPoint.timestamp) / 1000

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return 0
  }

  const distanceKm = calculateDistanceKm(startPoint, endPoint)

  if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
    return 0
  }

  return distanceKm / (durationSeconds / 3600)
}

const isHighQualityPoint = (locationPoint: LocationPoint | null): boolean => {
  if (!locationPoint) {
    return false
  }

  return (
    Number.isFinite(locationPoint.latitude) &&
    Number.isFinite(locationPoint.longitude) &&
    Number.isFinite(locationPoint.accuracy) &&
    locationPoint.accuracy <= MAX_VALID_ACCURACY_METERS
  )
}
