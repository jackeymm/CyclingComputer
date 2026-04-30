export const RIDE_HISTORY_STORAGE_KEY = 'RIDE_HISTORY_LIST'

export interface RideRecord {
  id: string
  date: string
  startTime: number
  endTime: number
  totalDuration: number
  totalDistance: number
  avgSpeed: number
  maxSpeed: number
}

export const getRideHistoryList = (): RideRecord[] => {
  const rawValue = wx.getStorageSync(RIDE_HISTORY_STORAGE_KEY)

  if (!Array.isArray(rawValue)) {
    return []
  }

  return rawValue
    .filter(isRideRecord)
    .sort((currentRecord, nextRecord) => nextRecord.startTime - currentRecord.startTime)
}

export const appendRideRecord = (record: RideRecord): RideRecord[] => {
  if (!isRideRecord(record)) {
    return getRideHistoryList()
  }

  const nextHistoryList = [record, ...getRideHistoryList().filter(
    (historyRecord) => historyRecord.id !== record.id
  )]

  wx.setStorageSync(RIDE_HISTORY_STORAGE_KEY, nextHistoryList)

  return nextHistoryList
}

export const deleteRideRecord = (recordId: string): RideRecord[] => {
  if (!recordId) {
    return getRideHistoryList()
  }

  const nextHistoryList = getRideHistoryList().filter((record) => record.id !== recordId)

  wx.setStorageSync(RIDE_HISTORY_STORAGE_KEY, nextHistoryList)

  return nextHistoryList
}

const isRideRecord = (value: unknown): value is RideRecord => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<RideRecord>

  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.date === 'string' &&
    candidate.date.length > 0 &&
    isNonNegativeNumber(candidate.startTime) &&
    isNonNegativeNumber(candidate.endTime) &&
    isNonNegativeNumber(candidate.totalDuration) &&
    isNonNegativeNumber(candidate.totalDistance) &&
    isNonNegativeNumber(candidate.avgSpeed) &&
    isNonNegativeNumber(candidate.maxSpeed)
  )
}

const isNonNegativeNumber = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}
