export interface LocationPoint {
  latitude: number
  longitude: number
  speed: number
  accuracy: number
  timestamp: number
}

type LocationListener = (locationPoint: LocationPoint) => void
type LocationErrorListener = (error: WechatMiniprogram.GeneralCallbackResult) => void

export class RideLocationService {
  private isListening: boolean
  private latestPoint: LocationPoint | null
  private readonly locationListeners: Set<LocationListener>
  private readonly errorListeners: Set<LocationErrorListener>

  constructor() {
    this.isListening = false
    this.latestPoint = null
    this.locationListeners = new Set<LocationListener>()
    this.errorListeners = new Set<LocationErrorListener>()
    this.handleLocationChange = this.handleLocationChange.bind(this)
  }

  private handleLocationChange(
    result: WechatMiniprogram.OnLocationChangeCallbackResult
  ): void {
    const locationPoint: LocationPoint = {
      latitude: result.latitude,
      longitude: result.longitude,
      speed: Number.isFinite(result.speed) ? result.speed : 0,
      accuracy: Number.isFinite(result.accuracy) ? result.accuracy : 0,
      timestamp: Date.now(),
    }

    this.latestPoint = locationPoint
    this.locationListeners.forEach((listener) => {
      listener(locationPoint)
    })
  }

  async start(): Promise<void> {
    if (this.isListening) {
      return
    }

    wx.onLocationChange(this.handleLocationChange)

    try {
      await this.startLocationUpdate()
      this.isListening = true
    } catch (error) {
      wx.offLocationChange(this.handleLocationChange)
      this.emitError(error)
      throw error
    }
  }

  async stop(): Promise<void> {
    wx.offLocationChange(this.handleLocationChange)

    if (!this.isListening) {
      this.latestPoint = null
      return
    }

    try {
      await this.stopLocationUpdate()
    } catch (error) {
      this.emitError(error)
      throw error
    } finally {
      this.isListening = false
      this.latestPoint = null
    }
  }

  subscribe(listener: LocationListener): () => void {
    this.locationListeners.add(listener)

    if (this.latestPoint) {
      listener(this.latestPoint)
    }

    return () => {
      this.locationListeners.delete(listener)
    }
  }

  subscribeError(listener: LocationErrorListener): () => void {
    this.errorListeners.add(listener)

    return () => {
      this.errorListeners.delete(listener)
    }
  }

  getLatestPoint(): LocationPoint | null {
    return this.latestPoint
  }

  getIsListening(): boolean {
    return this.isListening
  }

  private startLocationUpdate(): Promise<void> {
    return new Promise((resolve, reject) => {
      wx.startLocationUpdate({
        success: () => {
          resolve()
        },
        fail: (error) => {
          reject(error)
        },
      })
    })
  }

  private stopLocationUpdate(): Promise<void> {
    return new Promise((resolve, reject) => {
      wx.stopLocationUpdate({
        success: () => {
          resolve()
        },
        fail: (error) => {
          reject(error)
        },
      })
    })
  }

  private emitError(error: unknown): void {
    if (!error || typeof error !== 'object') {
      return
    }

    const safeError = error as WechatMiniprogram.GeneralCallbackResult

    this.errorListeners.forEach((listener) => {
      listener(safeError)
    })
  }
}
