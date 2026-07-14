/** Parse basic device info from User-Agent string */
export function parseUserAgent(ua: string): { browser: string; os: string; deviceType: string } {
  const uaLow = ua.toLowerCase()

  // Device type
  const deviceType = /mobile|android|iphone|ipod/.test(uaLow)
    ? 'Mobile'
    : /tablet|ipad/.test(uaLow)
    ? 'Tablet'
    : 'Desktop'

  // OS
  const os = /windows nt 10/.test(uaLow) ? 'Windows 10'
    : /windows nt 11/.test(uaLow) ? 'Windows 11'
    : /windows/.test(uaLow) ? 'Windows'
    : /mac os x/.test(uaLow) ? 'macOS'
    : /android/.test(uaLow) ? (() => {
        const m = ua.match(/Android\s([\d.]+)/i)
        return m ? `Android ${m[1]}` : 'Android'
      })()
    : /iphone|ipad|ipod/.test(uaLow) ? (() => {
        const m = ua.match(/OS\s([\d_]+)/i)
        return m ? `iOS ${m[1].replace(/_/g, '.')}` : 'iOS'
      })()
    : /linux/.test(uaLow) ? 'Linux'
    : /chromeos/.test(uaLow) ? 'ChromeOS'
    : 'Desconocido'

  // Browser — order matters: check specific engines before generic Chrome
  const browser = /samsungbrowser/.test(uaLow) ? 'Samsung Browser'
    : /edg\//.test(uaLow) ? 'Edge'         // Edge Chromium (contains "chrome" too)
    : /opr\/|opera/.test(uaLow) ? 'Opera'  // Opera (contains "chrome" too)
    : /firefox\//.test(uaLow) ? (() => {
        const m = ua.match(/Firefox\/([\d.]+)/i)
        return m ? `Firefox ${m[1].split('.')[0]}` : 'Firefox'
      })()
    : /chrome\//.test(uaLow) ? (() => {
        const m = ua.match(/Chrome\/([\d.]+)/i)
        return m ? `Chrome ${m[1].split('.')[0]}` : 'Chrome'
      })()
    : /safari\//.test(uaLow) ? 'Safari'
    : 'Desconocido'

  return { browser, os, deviceType }
}

/** Get IP geo info — tries ip-api.com first, falls back to ipapi.co */
export async function getIpGeo(ip: string): Promise<{
  city: string | null
  country: string | null
  lat: number | null
  lng: number | null
}> {
  const empty = { city: null, country: null, lat: null, lng: null }

  // Skip for local/private IPs
  if (!ip || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip === '::1') {
    return { city: 'Local', country: 'Local', lat: null, lng: null }
  }

  // Primary: ip-api.com
  try {
    const res = await fetch(`https://ip-api.com/json/${ip}?fields=city,country,lat,lon,status`, {
      signal: AbortSignal.timeout(4000),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.status === 'success' && data.city) {
        return { city: data.city ?? null, country: data.country ?? null, lat: data.lat ?? null, lng: data.lon ?? null }
      }
    }
  } catch { /* fall through to backup */ }

  // Fallback: ipapi.co
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: AbortSignal.timeout(4000),
      headers: { 'User-Agent': 'JDInternacional/1.0' },
    })
    if (res.ok) {
      const data = await res.json()
      if (data.city) {
        return { city: data.city ?? null, country: data.country_name ?? null, lat: data.latitude ?? null, lng: data.longitude ?? null }
      }
    }
  } catch { /* give up */ }

  return empty
}
