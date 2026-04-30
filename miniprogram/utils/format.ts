const DEFAULT_DURATION = '00:00:00'
const DEFAULT_DECIMAL = '0.00'

export const formatDuration = (totalSeconds: number): string => {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return DEFAULT_DURATION
  }

  const safeSeconds = Math.floor(totalSeconds)
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const seconds = safeSeconds % 60

  return [hours, minutes, seconds].map(padNumber).join(':')
}

export const formatSpeed = (speedKmPerHour: number): string => {
  return formatDecimal(speedKmPerHour)
}

export const formatDistance = (distanceKm: number): string => {
  return formatDecimal(distanceKm)
}

const formatDecimal = (value: number): string => {
  if (!Number.isFinite(value) || value < 0) {
    return DEFAULT_DECIMAL
  }

  return value.toFixed(2)
}

const padNumber = (value: number): string => {
  return value.toString().padStart(2, '0')
}
