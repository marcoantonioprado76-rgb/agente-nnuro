/**
 * Tipo de cambio USDT → BOB (bolivianos) desde BINANCE P2P.
 *
 * En Bolivia el tipo de cambio real del dólar es el de Binance P2P (el oficial no
 * refleja el mercado). Consultamos los anuncios de COMPRA de USDT (lo que le cuesta
 * a alguien comprar 1 USDT con bolivianos) y tomamos la MEDIANA de los primeros
 * anuncios — la mediana ignora los precios extremos/atípicos.
 *
 * Se cachea en memoria (15 min) para no golpear a Binance en cada visita.
 * Si Binance falla, se devuelve el último valor conocido; y si nunca hubo uno, un
 * valor de respaldo. NUNCA lanza.
 */

const BINANCE_P2P = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search'
const CACHE_MS = 15 * 60 * 1000 // 15 minutos
const FALLBACK_RATE = 10.6 // respaldo si Binance no responde y no hay caché

export type UsdtRate = {
  /** Cuántos bolivianos vale 1 USDT. */
  rate: number
  source: 'binance-p2p' | 'cache' | 'fallback'
  updatedAt: string
}

let cached: { rate: number; at: number } | null = null

/** Mediana de una lista de números (ignora extremos mejor que el promedio). */
function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b)
  if (s.length === 0) return 0
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** Consulta Binance P2P. Devuelve la mediana de los anuncios, o null si falla. */
async function fetchFromBinance(): Promise<number | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(BINANCE_P2P, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      // tradeType BUY = anuncios para COMPRAR USDT con BOB (lo que paga el cliente).
      body: JSON.stringify({
        fiat: 'BOB', page: 1, rows: 10, tradeType: 'BUY', asset: 'USDT',
        countries: [], proMerchantAds: false, shieldMerchantAds: false,
        publisherType: null, payTypes: [],
      }),
      signal: controller.signal,
      cache: 'no-store',
    })
    if (!res.ok) return null

    const data = (await res.json()) as { data?: Array<{ adv?: { price?: string } }> }
    const prices = (data.data ?? [])
      .map((a) => Number(a.adv?.price))
      .filter((n) => Number.isFinite(n) && n > 0)

    if (prices.length === 0) return null
    const m = median(prices)
    // Cordura: un USDT en Bolivia no puede valer menos de 5 ni más de 50 Bs.
    if (m < 5 || m > 50) return null
    return Math.round(m * 100) / 100
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/** Tipo de cambio actual USDT→BOB (con caché de 15 min). Nunca lanza. */
export async function getUsdtToBob(): Promise<UsdtRate> {
  const now = Date.now()

  // Caché fresca → la usamos.
  if (cached && now - cached.at < CACHE_MS) {
    return { rate: cached.rate, source: 'cache', updatedAt: new Date(cached.at).toISOString() }
  }

  const fresh = await fetchFromBinance()
  if (fresh) {
    cached = { rate: fresh, at: now }
    return { rate: fresh, source: 'binance-p2p', updatedAt: new Date(now).toISOString() }
  }

  // Binance no respondió: usamos lo último que supimos.
  if (cached) {
    console.warn('[TC] Binance no respondió — se usa el último valor conocido')
    return { rate: cached.rate, source: 'cache', updatedAt: new Date(cached.at).toISOString() }
  }

  console.warn('[TC] Binance no respondió y no hay caché — se usa el valor de respaldo')
  return { rate: FALLBACK_RATE, source: 'fallback', updatedAt: new Date(now).toISOString() }
}

/** Convierte un monto en USDT a bolivianos, redondeado a 2 decimales. */
export function usdtToBs(usdt: number, rate: number): number {
  return Math.round(usdt * rate * 100) / 100
}
