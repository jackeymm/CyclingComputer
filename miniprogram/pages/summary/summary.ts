import { formatDistance, formatDuration, formatSpeed } from '../../utils/format'
import { appendRideRecord, type RideRecord } from '../../utils/storage'
import { rideSessionService } from '../../services/ride-session-instance'

type SummaryPageData = {
  title: string
  desc: string
  totalDuration: string
  totalDistance: string
  averageSpeed: string
  saveDisabled: boolean
}

type SummaryOptions = Partial<Record<
  'startTime' | 'endTime' | 'totalDuration' | 'totalDistance' | 'averageSpeed' | 'maxSpeed',
  string
>>

const initialRideRecord: RideRecord = {
  id: '',
  date: '',
  startTime: 0,
  endTime: 0,
  totalDuration: 0,
  totalDistance: 0,
  avgSpeed: 0,
  maxSpeed: 0,
}

let currentRideRecord: RideRecord = { ...initialRideRecord }
const initialData: SummaryPageData = {
  title: '本次骑行完成',
  desc: '确认本次骑行结果后，可以选择保存记录或直接返回。',
  totalDuration: '00:00:00',
  totalDistance: '0.00',
  averageSpeed: '0.00',
  saveDisabled: true,
}

Page({
  data: initialData,

  onLoad(options: SummaryOptions) {
    currentRideRecord = createRideRecord(options)

    this.setData({
      totalDuration: formatDuration(currentRideRecord.totalDuration),
      totalDistance: formatDistance(currentRideRecord.totalDistance),
      averageSpeed: formatSpeed(currentRideRecord.avgSpeed),
      saveDisabled: !currentRideRecord.id,
    })
  },

  onUnload() {
    currentRideRecord = { ...initialRideRecord }
  },

  onTapSaveRecord() {
    if (!currentRideRecord.id) {
      wx.showToast({
        title: '暂无可保存数据',
        icon: 'none',
      })
      return
    }

    appendRideRecord(currentRideRecord)

    wx.showToast({
      title: '已保存',
      icon: 'success',
    })

    wx.switchTab({
      url: '/pages/history/history',
    })
  },

  async onTapCancelReturn() {
    currentRideRecord = { ...initialRideRecord }

    try {
      await rideSessionService.reset()
    } catch (error) {
      console.error('reset ride session failed', error)
    }

    wx.switchTab({
      url: '/pages/home/home',
    })
  },
})

const createRideRecord = (options: SummaryOptions): RideRecord => {
  const startTime = parseNonNegativeNumber(options.startTime)
  const endTime = parseNonNegativeNumber(options.endTime)
  const totalDuration = parseNonNegativeNumber(options.totalDuration)
  const totalDistance = parseNonNegativeNumber(options.totalDistance)
  const avgSpeed = parseNonNegativeNumber(options.averageSpeed)
  const maxSpeed = parseNonNegativeNumber(options.maxSpeed)

  if (!startTime || !endTime) {
    return { ...initialRideRecord }
  }

  return {
    id: String(startTime),
    date: formatRideDate(startTime),
    startTime,
    endTime,
    totalDuration,
    totalDistance,
    avgSpeed,
    maxSpeed,
  }
}

const parseNonNegativeNumber = (value: string | undefined): number => {
  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return 0
  }

  return parsedValue
}

const formatRideDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = padNumber(date.getMonth() + 1)
  const day = padNumber(date.getDate())
  const hour = padNumber(date.getHours())
  const minute = padNumber(date.getMinutes())

  return `${year}-${month}-${day} ${hour}:${minute}`
}

const padNumber = (value: number): string => {
  return value.toString().padStart(2, '0')
}
