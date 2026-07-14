'use client'

import React, { useEffect, useRef, useState } from 'react'
import { X, MapPin, Navigation, Check } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

// URL de un asset importado (Next devuelve un objeto con .src; toleramos string).
const assetUrl = (a: any): string => (a && typeof a === 'object' && a.src) ? a.src : (a as string)

export function LocationPicker({ isOpen, onClose, onSelect, initial }: {
    isOpen: boolean
    onClose: () => void
    onSelect: (url: string, lat: number, lng: number) => void
    initial?: { lat: number, lng: number } | null
}) {
    const mapDivRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<any>(null)
    const markerRef = useRef<any>(null)
    const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(initial || null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        let cancelled = false
        setLoading(true); setError(false)

        // Carga Leaflet desde el bundle (mismo dominio → cumple el CSP).
        import('leaflet').then((mod) => {
            const L: any = (mod as any).default || mod
            if (cancelled || !mapDivRef.current) return

            // Íconos del marcador servidos desde el propio dominio.
            delete (L.Icon.Default.prototype as any)._getIconUrl
            L.Icon.Default.mergeOptions({
                iconUrl: assetUrl(iconUrl),
                iconRetinaUrl: assetUrl(iconRetinaUrl),
                shadowUrl: assetUrl(shadowUrl),
            })

            const start = initial || coords || { lat: -16.5, lng: -68.15 } // por defecto: La Paz
            const map = L.map(mapDivRef.current).setView([start.lat, start.lng], initial ? 16 : 13)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap',
            }).addTo(map)

            const marker = L.marker([start.lat, start.lng], { draggable: true }).addTo(map)
            mapRef.current = map
            markerRef.current = marker
            setCoords({ lat: start.lat, lng: start.lng })

            marker.on('dragend', () => {
                const p = marker.getLatLng()
                setCoords({ lat: p.lat, lng: p.lng })
            })
            map.on('click', (e: any) => {
                marker.setLatLng(e.latlng)
                setCoords({ lat: e.latlng.lat, lng: e.latlng.lng })
            })

            setLoading(false)

            // Si no había ubicación previa, intentar centrar en el GPS.
            if (!initial && typeof navigator !== 'undefined' && navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((pos) => {
                    if (cancelled) return
                    const { latitude, longitude } = pos.coords
                    map.setView([latitude, longitude], 16)
                    marker.setLatLng([latitude, longitude])
                    setCoords({ lat: latitude, lng: longitude })
                }, () => { }, { enableHighAccuracy: true, timeout: 8000 })
            }

            setTimeout(() => { try { map.invalidateSize() } catch { } }, 250)
        }).catch(() => {
            if (!cancelled) { setError(true); setLoading(false) }
        })

        return () => {
            cancelled = true
            if (mapRef.current) { try { mapRef.current.remove() } catch { } mapRef.current = null; markerRef.current = null }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    if (!isOpen) return null

    const confirm = () => {
        if (!coords) return
        onSelect(`https://www.google.com/maps?q=${coords.lat},${coords.lng}`, coords.lat, coords.lng)
        onClose()
    }

    const useGPS = () => {
        if (typeof navigator === 'undefined' || !navigator.geolocation || !mapRef.current) return
        navigator.geolocation.getCurrentPosition((pos) => {
            const { latitude, longitude } = pos.coords
            mapRef.current.setView([latitude, longitude], 16)
            markerRef.current?.setLatLng([latitude, longitude])
            setCoords({ lat: latitude, lng: longitude })
        }, () => { }, { enableHighAccuracy: true, timeout: 8000 })
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2"><MapPin size={16} /> Selecciona tu ubicación</h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full"><X size={20} /></button>
                </div>
                <p className="px-4 pt-3 text-[11px] text-slate-500">Toca el mapa o arrastra el pin 📍 hasta el lugar exacto de entrega.</p>
                <div className="relative">
                    <div ref={mapDivRef} style={{ height: 320, width: '100%' }} className="bg-slate-100" />
                    {loading && !error && <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 bg-slate-50">Cargando mapa...</div>}
                    {error && <div className="absolute inset-0 flex items-center justify-center text-xs text-red-500 bg-slate-50 px-6 text-center">No se pudo cargar el mapa. Usa “Ubicación exacta (GPS)”.</div>}
                </div>
                <div className="p-4 space-y-3">
                    <button type="button" onClick={useGPS} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-[11px] uppercase tracking-widest hover:border-slate-800 transition-all">
                        <Navigation size={14} /> Centrar en mi ubicación actual
                    </button>
                    <button type="button" onClick={confirm} disabled={!coords} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-slate-950 text-white font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50">
                        <Check size={16} /> Confirmar ubicación
                    </button>
                </div>
            </div>
        </div>
    )
}
