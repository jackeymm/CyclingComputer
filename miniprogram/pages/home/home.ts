import { RideSessionSnapshot } from '../../services/ride-session'
import { rideSessionService } from '../../services/ride-session-instance'

type HomePageData = {
  speed: string
  duration: string
  distance: string
  status: RideSessionSnapshot['status']
  statusText: string
  statusHint: string
  permissionErrorVisible: boolean
  permissionErrorText: string
  permissionActionVisible: boolean
  primaryActionText: string
  secondaryActionText: string
  secondaryActionDisabled: boolean
}

const VIEW_RENDER_INTERVAL_MS = 1000
let unsubscribeSession: (() => void) | null = null
let unsubscribeSessionError: (() => void) | null = null
let pendingSnapshot: RideSessionSnapshot | null = null
let throttleTimerId: number | null = null
let lastRenderAt = 0
let lastRenderedStateKey = ''

const initialData: HomePageData = {
  speed: '0.00',
  duration: '00:00:00',
  distance: '0.00',
  status: 'IDLE',
  statusText: '等待开始骑行',
  statusHint: '开始后将显示实时速度、时间和里程。',
  permissionErrorVisible: false,
  permissionErrorText: '',
  permissionActionVisible: false,
  primaryActionText: '开始骑行',
  secondaryActionText: '结束',
  secondaryActionDisabled: true,
}

Page({
  data: initialData,

  onLoad() {
    this.renderViewState(rideSessionService.getSnapshot())
    unsubscribeSession = rideSessionService.subscribe((snapshot) => {
      this.scheduleViewState(snapshot)
    })
    unsubscribeSessionError = rideSessionService.subscribeError((error) => {
      this.handlePermissionError(error)
    })
  },

  onUnload() {
    if (unsubscribeSession) {
      unsubscribeSession()
      unsubscribeSession = null
    }

    if (unsubscribeSessionError) {
      unsubscribeSessionError()
      unsubscribeSessionError = null
    }

    this.clearThrottleTimer()
    void rideSessionService.reset()
  },

  async onTapPrimaryAction() {
    const { status } = this.data

    if (status === 'IDLE') {
      this.clearPermissionError()
      await this.handleStartRide()
      return
    }

    if (status === 'RIDING') {
      this.renderViewState(rideSessionService.pause())
      return
    }

    if (status === 'PAUSED') {
      this.renderViewState(rideSessionService.resume())
    }
  },

  onOpenSettingChange(event: WechatMiniprogram.CustomEvent) {
    const authSetting = event.detail.authSetting as Record<string, boolean> | undefined
    const hasLocationPermission = Boolean(authSetting && authSetting['scope.userLocation'])

    if (hasLocationPermission) {
      this.clearPermissionError()
      this.setData({
        statusText: '定位权限已开启',
        statusHint: '请再次点击开始骑行，继续记录本次骑行。',
      })
      return
    }

    this.handlePermissionError({
      errMsg: 'openSetting:fail auth denied',
    })
  },

  async onTapSecondaryAction() {
    const { status } = this.data

    if (status !== 'RIDING' && status !== 'PAUSED') {
      return
    }

    try {
      const snapshot = await rideSessionService.finish()
      this.renderViewState(snapshot)

      wx.navigateTo({
        url:
          `/pages/summary/summary?startTime=${snapshot.startTime}` +
          `&endTime=${snapshot.endTime}` +
          `&totalDuration=${snapshot.elapsedSeconds}` +
          `&totalDistance=${snapshot.totalDistanceKm}` +
          `&averageSpeed=${snapshot.averageSpeedKmh}` +
          `&maxSpeed=${snapshot.maxSpeedKmh}`,
      })
    } catch (error) {
      console.error('finish ride failed', error)
    }
  },

  scheduleViewState(snapshot: RideSessionSnapshot) {
    const now = Date.now()
    const elapsed = now - lastRenderAt

    if (elapsed >= VIEW_RENDER_INTERVAL_MS) {
      this.renderViewState(snapshot)
      return
    }

    pendingSnapshot = snapshot

    if (throttleTimerId !== null) {
      return
    }

    throttleTimerId = setTimeout(() => {
      throttleTimerId = null

      if (!pendingSnapshot) {
        return
      }

      const nextSnapshot = pendingSnapshot
      pendingSnapshot = null
      this.renderViewState(nextSnapshot)
    }, VIEW_RENDER_INTERVAL_MS - elapsed)
  },

  renderViewState(snapshot: RideSessionSnapshot) {
    const nextViewState = buildHomeViewState(snapshot)
    const nextStateKey = getViewStateKey(nextViewState)

    if (nextStateKey === lastRenderedStateKey) {
      pendingSnapshot = null
      return
    }

    lastRenderAt = Date.now()
    pendingSnapshot = null
    lastRenderedStateKey = nextStateKey

    const changedData = getChangedData(this.data, nextViewState)

    if (Object.keys(changedData).length === 0) {
      return
    }

    this.setData(changedData)
  },

  async handleStartRide() {
    try {
      const snapshot = await rideSessionService.start()
      this.renderViewState(snapshot)
    } catch (error) {
      console.error('start ride failed', error)
    }
  },

  clearThrottleTimer() {
    if (throttleTimerId !== null) {
      clearTimeout(throttleTimerId)
      throttleTimerId = null
    }
  },

  clearPermissionError() {
    const nextData = {
      permissionErrorVisible: false,
      permissionErrorText: '',
      permissionActionVisible: false,
    }
    const changedData = getChangedData(this.data, nextData)

    if (Object.keys(changedData).length === 0) {
      return
    }

    this.setData(changedData)
  },

  handlePermissionError(error: WechatMiniprogram.GeneralCallbackResult) {
    const permissionDenied = isLocationPermissionDenied(error)
    const permissionErrorText = permissionDenied
      ? '定位权限未开启，无法开始骑行记录。请先允许获取位置信息。'
      : '定位启动失败，请确认系统定位服务已开启后重试。'

    const nextData = {
      status: 'IDLE',
      statusText: '无法开始骑行',
      statusHint: permissionDenied ? '点击下方按钮前往设置页重新授权。' : '检查系统定位设置后，再次点击开始骑行。',
      permissionErrorVisible: true,
      permissionErrorText,
      permissionActionVisible: permissionDenied,
      primaryActionText: '开始骑行',
      secondaryActionText: '结束',
      secondaryActionDisabled: true,
    }
    lastRenderedStateKey = getViewStateKey(nextData)

    const changedData = getChangedData(this.data, nextData)

    if (Object.keys(changedData).length === 0) {
      return
    }

    this.setData(changedData)
  },
})

const buildHomeViewState = (snapshot: RideSessionSnapshot): HomePageData => {
  return {
    speed: snapshot.formattedSpeed,
    duration: snapshot.formattedDuration,
    distance: snapshot.formattedDistance,
    status: snapshot.status,
    statusText: getStatusText(snapshot.status),
    statusHint: getStatusHint(snapshot.status),
    permissionErrorVisible: false,
    permissionErrorText: '',
    permissionActionVisible: false,
    primaryActionText: getPrimaryActionText(snapshot.status),
    secondaryActionText: '结束',
    secondaryActionDisabled: snapshot.status === 'IDLE' || snapshot.status === 'FINISHED',
  }
}

const getChangedData = (
  currentData: Record<string, unknown>,
  nextData: Record<string, unknown>
): Record<string, unknown> => {
  const changedData: Record<string, unknown> = {}

  Object.keys(nextData).forEach((key) => {
    if (currentData[key] !== nextData[key]) {
      changedData[key] = nextData[key]
    }
  })

  return changedData
}

const getViewStateKey = (viewState: Record<string, unknown>): string => {
  return [
    viewState.speed,
    viewState.duration,
    viewState.distance,
    viewState.status,
    viewState.statusText,
    viewState.statusHint,
    viewState.permissionErrorVisible,
    viewState.permissionErrorText,
    viewState.permissionActionVisible,
    viewState.primaryActionText,
    viewState.secondaryActionText,
    viewState.secondaryActionDisabled,
  ].join('|')
}

const getStatusText = (status: RideSessionSnapshot['status']): string => {
  if (status === 'RIDING') {
    return '骑行中'
  }

  if (status === 'PAUSED') {
    return '已暂停'
  }

  if (status === 'FINISHED') {
    return '骑行已结束'
  }

  return '等待开始骑行'
}

const getStatusHint = (status: RideSessionSnapshot['status']): string => {
  if (status === 'RIDING') {
    return '可以暂停记录，或结束后进入本次骑行总结。'
  }

  if (status === 'PAUSED') {
    return '继续后将从暂停处恢复计时与记录。'
  }

  if (status === 'FINISHED') {
    return '本次骑行已完成，正在准备进入总结页。'
  }

  return '开始后将显示实时速度、时间和里程。'
}

const getPrimaryActionText = (status: RideSessionSnapshot['status']): string => {
  if (status === 'RIDING') {
    return '暂停'
  }

  if (status === 'PAUSED') {
    return '继续'
  }

  return '开始骑行'
}

const isLocationPermissionDenied = (error: WechatMiniprogram.GeneralCallbackResult): boolean => {
  const errorMessage = error.errMsg || ''

  return (
    errorMessage.includes('auth deny') ||
    errorMessage.includes('auth denied') ||
    errorMessage.includes('authorize no response') ||
    errorMessage.includes('scope userLocation')
  )
}
