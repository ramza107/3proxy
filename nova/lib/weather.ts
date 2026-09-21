/** Open-Meteo forecast — no API key. */

export type WeatherBrief = {
  day: string
  label: string
  /** Open-Meteo weather_code */
  code: number
  tempC: number
  highC: number
  lowC: number
  place: string
}

const CODE_LABEL: Record<number, string> = {
  0: 'Clear',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  80: 'Showers',
  81: 'Showers',
  82: 'Heavy showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm',
  99: 'Thunderstorm',
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function weatherLabel(code: number) {
  return CODE_LABEL[code] || 'Weather'
}

async function geocodeCity(city: string): Promise<{ lat: number; lon: number; name: string } | null> {
  const q = city.trim()
  if (!q) return null
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = (await res.json()) as {
    results?: { latitude: number; longitude: number; name: string; country_code?: string }[]
  }
  const hit = data.results?.[0]
  if (!hit) return null
  const place = hit.country_code ? `${hit.name}, ${hit.country_code}` : hit.name
  return { lat: hit.latitude, lon: hit.longitude, name: place }
}

async function coordsFromDevice(): Promise<{ lat: number; lon: number; name: string } | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 4000)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer)
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          name: 'Near you',
        })
      },
      () => {
        clearTimeout(timer)
        resolve(null)
      },
      { enableHighAccuracy: false, maximumAge: 60 * 60 * 1000, timeout: 3500 },
    )
  })
}

async function forecastAt(
  lat: number,
  lon: number,
  place: string,
): Promise<WeatherBrief | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code` +
    `&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = (await res.json()) as {
    current?: { temperature_2m?: number; weather_code?: number }
    daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[] }
  }
  const temp = data.current?.temperature_2m
  const code = data.current?.weather_code
  if (temp == null || code == null) return null
  return {
    day: todayISO(),
    label: weatherLabel(code),
    code,
    tempC: Math.round(temp),
    highC: Math.round(data.daily?.temperature_2m_max?.[0] ?? temp),
    lowC: Math.round(data.daily?.temperature_2m_min?.[0] ?? temp),
    place,
  }
}

/** Fetch today's weather for a city name, or device location as fallback. */
export async function fetchWeatherBrief(city?: string | null): Promise<WeatherBrief | null> {
  try {
    const fromCity = city?.trim() ? await geocodeCity(city) : null
    const loc = fromCity || (await coordsFromDevice())
    if (!loc) return null
    return await forecastAt(loc.lat, loc.lon, loc.name)
  } catch {
    return null
  }
}

export function formatWeatherLine(w: WeatherBrief) {
  return `${w.label} · ${w.tempC}° (${w.lowC}–${w.highC}°) · ${w.place}`
}
