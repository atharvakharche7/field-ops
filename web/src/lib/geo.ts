export interface Coords {
  latitude: number
  longitude: number
}

/**
 * The phone's current location, or null if we can't get it.
 * Never throws: permission denied, no GPS signal or a timeout all give null,
 * so a missing location never stops a technician from saving an update.
 * Browsers only allow this on https or localhost.
 */
export function getCoords(): Promise<Coords | null> {
  return new Promise(resolve => {
    if (!('geolocation' in navigator)) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ latitude: round6(pos.coords.latitude), longitude: round6(pos.coords.longitude) }),
      () => resolve(null), // denied, unavailable or timed out
      {
        enableHighAccuracy: false, // network/Wi-Fi location is fast and close enough to prove "on site"
        timeout: 10_000,
        maximumAge: 60_000, // a reading from the last minute is fine
      },
    )
  })
}

// The database keeps 6 decimal places (about 10 cm), which is far more than phone GPS can tell.
function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6
}
