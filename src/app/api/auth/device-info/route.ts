export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

/** Reverse geocode lat/lng → human-readable address via Nominatim (OpenStreetMap, free) */
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    // zoom=18 = building level (most precise), addressdetails=1 for structured parts
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`,
      {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'JDInternacional/1.0' },
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    const a = data.address ?? {}

    // Build precise address: number + street + neighbourhood/suburb + city + country
    const parts: string[] = []

    // Street + number
    const street = a.road ?? a.pedestrian ?? a.footway ?? a.path ?? a.cycleway ?? null
    const number = a.house_number ?? null
    if (street && number) parts.push(`${street} ${number}`)
    else if (street) parts.push(street)
    else if (number) parts.push(number)

    // Neighbourhood / suburb for extra precision
    const neighbourhood = a.neighbourhood ?? a.suburb ?? a.quarter ?? a.city_district ?? null
    if (neighbourhood) parts.push(neighbourhood)

    // City / town / village
    const city = a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? null
    if (city) parts.push(city)

    // State / region
    const state = a.state ?? a.region ?? null
    if (state) parts.push(state)

    // Country
    if (a.country) parts.push(a.country)

    // Fallback: use display_name trimmed (Nominatim already formats it well)
    if (parts.length === 0 && data.display_name) {
      // Take first 5 comma-separated segments to avoid overly long strings
      return data.display_name.split(',').slice(0, 5).map((s: string) => s.trim()).join(', ')
    }

    return parts.length > 0 ? parts.join(', ') : null
  } catch {
    return null
  }
}

// POST /api/auth/device-info — update GPS coordinates + address for the current device
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { lat, lng, deviceId } = await request.json()

    if (
      typeof lat !== 'number' || typeof lng !== 'number' || !deviceId ||
      !isFinite(lat) || !isFinite(lng) ||
      lat < -90 || lat > 90 || lng < -180 || lng > 180
    ) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const device = await prisma.trustedDevice.findUnique({
      where: { userId_deviceId: { userId: user.id, deviceId } },
    })
    if (!device) return NextResponse.json({ error: 'Dispositivo no encontrado' }, { status: 404 })

    // Detect location change — use null check (0 is a valid coordinate)
    const prevLat = device.lat
    const prevLng = device.lng
    const distanceMoved = prevLat !== null && prevLng !== null
      ? Math.sqrt(Math.pow(lat - Number(prevLat), 2) + Math.pow(lng - Number(prevLng), 2))
      : null
    // Mark location changed if moved more than ~0.05 degrees (~5km at equator)
    const locationChanged = distanceMoved !== null && distanceMoved > 0.05

    // Get human-readable address via Nominatim; fallback to coordinates string
    const geocoded = await reverseGeocode(lat, lng)
    const address = geocoded ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`

    await prisma.trustedDevice.update({
      where: { userId_deviceId: { userId: user.id, deviceId } },
      data: {
        lat,
        lng,
        address,
        locationChanged: locationChanged || device.locationChanged,
      },
    })

    return NextResponse.json({ message: 'Ubicación actualizada', address, geocoded: !!geocoded })
  } catch (err) {
    console.error('[DEVICE-INFO]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
