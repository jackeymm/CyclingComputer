const EARTH_RADIUS_KM = 6371

export interface GeoPoint {
  latitude: number
  longitude: number
}

export const calculateDistanceKm = (start: GeoPoint, end: GeoPoint): number => {
  if (!isValidGeoPoint(start) || !isValidGeoPoint(end)) {
    return 0
  }

  const latitudeDelta = toRadians(end.latitude - start.latitude)
  const longitudeDelta = toRadians(end.longitude - start.longitude)
  const startLatitude = toRadians(start.latitude)
  const endLatitude = toRadians(end.latitude)

  const haversineValue =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) ** 2

  const centralAngle =
    2 * Math.atan2(Math.sqrt(haversineValue), Math.sqrt(1 - haversineValue))

  return EARTH_RADIUS_KM * centralAngle
}

const isValidGeoPoint = (point: GeoPoint): boolean => {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180
  )
}

const toRadians = (degree: number): number => {
  return (degree * Math.PI) / 180
}
