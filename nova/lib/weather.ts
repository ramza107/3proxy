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
  /** Apparent temperature °C */
  feelsC: number
  /** Relative humidity % */
  humidity: number | null
  /** Wind speed km/h */
  windKmh: number | null
  /** Max precip probability for the day 0–100 */
  precipChance: number | null
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

export type WeatherKind = 'clear' | 'cloud' | 'fog' | 'rain' | 'snow' | 'storm' | 'mixed'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function weatherLabel(code: number) {
  return CODE_LABEL[code] || 'Weather'
}

/** Coarse weather bucket for art / palette / SF Symbols. */
export function weatherKind(code?: number | null): WeatherKind {
  if (code == null) return 'mixed'
  if (code === 0 || code === 1) return 'clear'
  if (code === 2 || code === 3) return 'cloud'
  if (code >= 45 && code <= 48) return 'fog'
  if (code >= 71 && code <= 77) return 'snow'
  if (code >= 95) return 'storm'
  if (code >= 51 && code <= 67) return 'rain'
  if (code >= 80 && code <= 82) return 'rain'
  return 'mixed'
}

/** Soft sky gradient for cards (start → end). */
export function weatherPalette(code?: number | null): [string, string, string] {
  const kind = weatherKind(code)
  switch (kind) {
    case 'clear':
      return ['#B8DFF0', '#E4F3EC', '#F7FBF8']
    case 'cloud':
      return ['#C5D2DC', '#E4EBF0', '#F4F7F9']
    case 'fog':
      return ['#CDD1D6', '#E6E8EA', '#F3F4F5']
    case 'rain':
      return ['#9BB8C8', '#C9DCE6', '#E8F1F4']
    case 'snow':
      return ['#C8D6E4', '#E8EEF4', '#F7FAFC']
    case 'storm':
      return ['#8AA0B4', '#B7C8D4', '#DCE6EC']
    default:
      return ['#C5DED8', '#E4F0EC', '#F5F9F8']
  }
}

/** Short planning hint tied to the sky. */
export function weatherMood(code?: number | null): string {
  const kind = weatherKind(code)
  switch (kind) {
    case 'clear':
      return 'Clear air — good for outdoors'
    case 'cloud':
      return 'Soft light — steady indoor focus'
    case 'fog':
      return 'Low visibility — leave extra travel time'
    case 'rain':
      return 'Wet streets — keep travel buffers'
    case 'snow':
      return 'Cold snap — warm layers'
    case 'storm':
      return 'Storm risk — leave margin'
    default:
      return 'Shape the day around the weather'
  }
}

/** SF Symbol name for iOS widgets / system Image. */
export function weatherSymbol(code?: number | null): string {
  const kind = weatherKind(code)
  switch (kind) {
    case 'clear':
      return 'sun.max.fill'
    case 'cloud':
      return code === 2 ? 'cloud.sun.fill' : 'cloud.fill'
    case 'fog':
      return 'cloud.fog.fill'
    case 'rain':
      return 'cloud.rain.fill'
    case 'snow':
      return 'cloud.snow.fill'
    case 'storm':
      return 'cloud.bolt.rain.fill'
    default:
      return 'cloud.sun.fill'
  }
}

/** Accent ink for weather art / symbols. */
export function weatherAccent(code?: number | null): string {
  const kind = weatherKind(code)
  switch (kind) {
    case 'clear':
      return '#D4A017'
    case 'cloud':
      return '#5A717A'
    case 'fog':
      return '#7E929A'
    case 'rain':
      return '#3D6F8A'
    case 'snow':
      return '#6B8CAD'
    case 'storm':
      return '#3A5268'
    default:
      return '#0F6E66'
  }
}

export type CityHit = {
  name: string
  countryCode: string
  country: string
  admin1?: string
  lat: number
  lon: number
  /** Stored in settings.weatherCity — e.g. "Buenos Aires, AR" */
  label: string
}

type GeocodeResult = {
  latitude: number
  longitude: number
  name: string
  country_code?: string
  country?: string
  admin1?: string
}

function cityLabel(hit: GeocodeResult): string {
  return hit.country_code ? `${hit.name}, ${hit.country_code}` : hit.name
}

function toCityHit(hit: GeocodeResult): CityHit {
  return {
    name: hit.name,
    countryCode: hit.country_code || '',
    country: hit.country || hit.country_code || '',
    admin1: hit.admin1,
    lat: hit.latitude,
    lon: hit.longitude,
    label: cityLabel(hit),
  }
}

/** Parse optional ", XX" country suffix from a stored city label. */
function parseCityQuery(raw: string): { name: string; countryCode: string | null } {
  const q = raw.trim()
  const m = q.match(/^(.*?),\s*([A-Za-z]{2})$/)
  if (m) return { name: m[1].trim(), countryCode: m[2].toUpperCase() }
  return { name: q, countryCode: null }
}

async function fetchGeocodeResults(
  name: string,
  count: number,
  language = 'en',
): Promise<GeocodeResult[]> {
  const q = name.trim()
  if (!q) return []
  const url =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}` +
    `&count=${count}&language=${encodeURIComponent(language)}&format=json`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = (await res.json()) as { results?: GeocodeResult[] }
  return data.results || []
}

/** Typeahead search for Settings city picker. */
export async function searchCities(query: string, language = 'en'): Promise<CityHit[]> {
  const { name } = parseCityQuery(query)
  if (name.length < 2) return []
  const results = await fetchGeocodeResults(name, 8, language)
  return results.map(toCityHit)
}

async function geocodeCity(city: string): Promise<{ lat: number; lon: number; name: string } | null> {
  const { name, countryCode } = parseCityQuery(city)
  if (!name) return null
  const langs = /[\u0400-\u04FF]/.test(name) ? ['ru', 'uk', 'en'] : ['en', 'ru', 'uk', 'de', 'es']
  let results: GeocodeResult[] = []
  for (const lang of langs) {
    results = await fetchGeocodeResults(name, countryCode ? 8 : 1, lang)
    if (results.length) break
  }
  if (!results.length) return null
  const hit =
    (countryCode
      ? results.find((r) => (r.country_code || '').toUpperCase() === countryCode)
      : null) || results[0]
  return { lat: hit.latitude, lon: hit.longitude, name: cityLabel(hit) }
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
    `&current=temperature_2m,weather_code,relative_humidity_2m,apparent_temperature,wind_speed_10m,precipitation` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&timezone=auto&forecast_days=1&wind_speed_unit=kmh`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = (await res.json()) as {
    current?: {
      temperature_2m?: number
      weather_code?: number
      relative_humidity_2m?: number
      apparent_temperature?: number
      wind_speed_10m?: number
      precipitation?: number
    }
    daily?: {
      temperature_2m_max?: number[]
      temperature_2m_min?: number[]
      precipitation_probability_max?: number[]
    }
  }
  const temp = data.current?.temperature_2m
  const code = data.current?.weather_code
  if (temp == null || code == null) return null
  const feels = data.current?.apparent_temperature ?? temp
  const humidity = data.current?.relative_humidity_2m
  const wind = data.current?.wind_speed_10m
  const precipChance = data.daily?.precipitation_probability_max?.[0]
  return {
    day: todayISO(),
    label: weatherLabel(code),
    code,
    tempC: Math.round(temp),
    highC: Math.round(data.daily?.temperature_2m_max?.[0] ?? temp),
    lowC: Math.round(data.daily?.temperature_2m_min?.[0] ?? temp),
    place,
    feelsC: Math.round(feels),
    humidity: humidity != null ? Math.round(humidity) : null,
    windKmh: wind != null ? Math.round(wind) : null,
    precipChance: precipChance != null ? Math.round(precipChance) : null,
  }
}

/** Fetch today's weather for a city name, or device location as fallback. */
export async function fetchWeatherBrief(
  city?: string | null,
  coords?: { lat: number; lon: number } | null,
): Promise<WeatherBrief | null> {
  try {
    if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lon)) {
      const place = city?.trim() || 'Selected city'
      return await forecastAt(coords.lat, coords.lon, place)
    }
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
