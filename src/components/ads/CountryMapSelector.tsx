'use client'

import { useState, useCallback } from 'react'
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from 'react-simple-maps'
import { X, Globe, ZoomIn, ZoomOut, RotateCcw, MapPin, Search } from 'lucide-react'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// ISO-3166-1 numeric → { name, code }
const NUMERIC_MAP: Record<number, { name: string; code: string }> = {
    4:{name:'Afganistán',code:'AF'},8:{name:'Albania',code:'AL'},12:{name:'Argelia',code:'DZ'},
    24:{name:'Angola',code:'AO'},32:{name:'Argentina',code:'AR'},36:{name:'Australia',code:'AU'},
    40:{name:'Austria',code:'AT'},50:{name:'Bangladesh',code:'BD'},56:{name:'Bélgica',code:'BE'},
    68:{name:'Bolivia',code:'BO'},76:{name:'Brasil',code:'BR'},100:{name:'Bulgaria',code:'BG'},
    116:{name:'Camboya',code:'KH'},120:{name:'Camerún',code:'CM'},124:{name:'Canadá',code:'CA'},
    144:{name:'Sri Lanka',code:'LK'},152:{name:'Chile',code:'CL'},156:{name:'China',code:'CN'},
    170:{name:'Colombia',code:'CO'},178:{name:'Rep. del Congo',code:'CG'},180:{name:'DR Congo',code:'CD'},
    188:{name:'Costa Rica',code:'CR'},191:{name:'Croacia',code:'HR'},192:{name:'Cuba',code:'CU'},
    203:{name:'Rep. Checa',code:'CZ'},208:{name:'Dinamarca',code:'DK'},214:{name:'Rep. Dominicana',code:'DO'},
    218:{name:'Ecuador',code:'EC'},818:{name:'Egipto',code:'EG'},222:{name:'El Salvador',code:'SV'},
    231:{name:'Etiopía',code:'ET'},246:{name:'Finlandia',code:'FI'},250:{name:'Francia',code:'FR'},
    276:{name:'Alemania',code:'DE'},288:{name:'Ghana',code:'GH'},300:{name:'Grecia',code:'GR'},
    320:{name:'Guatemala',code:'GT'},332:{name:'Haití',code:'HT'},340:{name:'Honduras',code:'HN'},
    348:{name:'Hungría',code:'HU'},356:{name:'India',code:'IN'},360:{name:'Indonesia',code:'ID'},
    364:{name:'Irán',code:'IR'},372:{name:'Irlanda',code:'IE'},376:{name:'Israel',code:'IL'},
    380:{name:'Italia',code:'IT'},388:{name:'Jamaica',code:'JM'},392:{name:'Japón',code:'JP'},
    400:{name:'Jordania',code:'JO'},404:{name:'Kenia',code:'KE'},398:{name:'Kazajistán',code:'KZ'},
    410:{name:'Corea del Sur',code:'KR'},422:{name:'Líbano',code:'LB'},458:{name:'Malasia',code:'MY'},
    484:{name:'México',code:'MX'},504:{name:'Marruecos',code:'MA'},528:{name:'Países Bajos',code:'NL'},
    554:{name:'Nueva Zelanda',code:'NZ'},558:{name:'Nicaragua',code:'NI'},566:{name:'Nigeria',code:'NG'},
    578:{name:'Noruega',code:'NO'},586:{name:'Pakistán',code:'PK'},591:{name:'Panamá',code:'PA'},
    600:{name:'Paraguay',code:'PY'},604:{name:'Perú',code:'PE'},608:{name:'Filipinas',code:'PH'},
    616:{name:'Polonia',code:'PL'},620:{name:'Portugal',code:'PT'},634:{name:'Catar',code:'QA'},
    642:{name:'Rumanía',code:'RO'},643:{name:'Rusia',code:'RU'},682:{name:'Arabia Saudí',code:'SA'},
    686:{name:'Senegal',code:'SN'},710:{name:'Sudáfrica',code:'ZA'},724:{name:'España',code:'ES'},
    752:{name:'Suecia',code:'SE'},756:{name:'Suiza',code:'CH'},764:{name:'Tailandia',code:'TH'},
    792:{name:'Turquía',code:'TR'},800:{name:'Uganda',code:'UG'},804:{name:'Ucrania',code:'UA'},
    784:{name:'Emiratos Árabes',code:'AE'},826:{name:'Reino Unido',code:'GB'},834:{name:'Tanzania',code:'TZ'},
    840:{name:'Estados Unidos',code:'US'},858:{name:'Uruguay',code:'UY'},862:{name:'Venezuela',code:'VE'},
    704:{name:'Vietnam',code:'VN'},887:{name:'Yemen',code:'YE'},894:{name:'Zambia',code:'ZM'},
    716:{name:'Zimbabue',code:'ZW'},
}

// Cities with coordinates [lng, lat]
const CITIES: { name: string; country: string; coords: [number, number] }[] = [
    // Colombia — ciudades y departamentos
    {name:'Bogotá',country:'CO',coords:[-74.08,4.71]},
    {name:'Medellín',country:'CO',coords:[-75.57,6.25]},
    {name:'Cali',country:'CO',coords:[-76.53,3.43]},
    {name:'Barranquilla',country:'CO',coords:[-74.79,10.96]},
    {name:'Cartagena',country:'CO',coords:[-75.51,10.39]},
    {name:'Bucaramanga',country:'CO',coords:[-73.12,7.13]},
    {name:'Pereira',country:'CO',coords:[-75.70,4.81]},
    {name:'Santa Marta',country:'CO',coords:[-74.21,11.24]},
    {name:'Ibagué',country:'CO',coords:[-75.23,4.44]},
    {name:'Manizales',country:'CO',coords:[-75.52,5.07]},
    {name:'Cúcuta',country:'CO',coords:[-72.51,7.89]},
    {name:'Villavicencio',country:'CO',coords:[-73.63,4.14]},
    {name:'Neiva',country:'CO',coords:[-75.30,2.93]},
    {name:'Armenia',country:'CO',coords:[-75.68,4.53]},
    {name:'Pasto',country:'CO',coords:[-77.28,1.21]},
    {name:'Montería',country:'CO',coords:[-75.89,8.76]},
    {name:'Valledupar',country:'CO',coords:[-73.25,10.48]},
    {name:'Sincelejo',country:'CO',coords:[-75.40,9.30]},
    {name:'Popayán',country:'CO',coords:[-76.61,2.44]},
    {name:'Tunja',country:'CO',coords:[-73.36,5.54]},
    {name:'Riohacha',country:'CO',coords:[-72.91,11.55]},
    {name:'Quibdó',country:'CO',coords:[-76.66,5.69]},
    {name:'Florencia',country:'CO',coords:[-75.62,1.61]},
    {name:'Yopal',country:'CO',coords:[-72.40,5.34]},
    {name:'Arauca',country:'CO',coords:[-70.76,7.09]},
    {name:'Mocoa',country:'CO',coords:[-76.65,1.15]},
    {name:'San Andrés',country:'CO',coords:[-81.70,12.53]},
    {name:'Leticia',country:'CO',coords:[-69.94,-4.20]},
    {name:'Bello',country:'CO',coords:[-75.56,6.34]},
    {name:'Itagüí',country:'CO',coords:[-75.60,6.18]},
    {name:'Soledad',country:'CO',coords:[-74.77,10.92]},
    {name:'Soacha',country:'CO',coords:[-74.22,4.58]},
    {name:'Palmira',country:'CO',coords:[-76.30,3.54]},
    {name:'Buenaventura',country:'CO',coords:[-77.00,3.88]},
    {name:'Barrancabermeja',country:'CO',coords:[-73.86,7.07]},
    {name:'Dosquebradas',country:'CO',coords:[-75.67,4.84]},
    {name:'Envigado',country:'CO',coords:[-75.59,6.17]},
    {name:'Girardot',country:'CO',coords:[-74.80,4.30]},
    {name:'Sogamoso',country:'CO',coords:[-72.93,5.72]},
    {name:'Duitama',country:'CO',coords:[-73.02,5.83]},
    {name:'Rionegro',country:'CO',coords:[-75.37,6.15]},
    {name:'Apartadó',country:'CO',coords:[-76.63,7.88]},
    {name:'Turbo',country:'CO',coords:[-76.73,8.10]},
    {name:'Magangué',country:'CO',coords:[-74.75,9.24]},
    // México
    {name:'Ciudad de México',country:'MX',coords:[-99.13,19.43]},
    {name:'Guadalajara',country:'MX',coords:[-103.35,20.67]},
    {name:'Monterrey',country:'MX',coords:[-100.32,25.67]},
    {name:'Puebla',country:'MX',coords:[-98.20,19.05]},
    {name:'Tijuana',country:'MX',coords:[-117.03,32.53]},
    {name:'León',country:'MX',coords:[-101.68,21.12]},
    {name:'Juárez',country:'MX',coords:[-106.49,31.74]},
    {name:'Mérida',country:'MX',coords:[-89.62,20.97]},
    {name:'Cancún',country:'MX',coords:[-86.85,21.16]},
    {name:'Zapopan',country:'MX',coords:[-103.39,20.72]},
    {name:'Ecatepec',country:'MX',coords:[-98.95,19.60]},
    {name:'Nezahualcóyotl',country:'MX',coords:[-98.99,19.41]},
    {name:'Toluca',country:'MX',coords:[-99.66,19.29]},
    {name:'Acapulco',country:'MX',coords:[-99.82,16.86]},
    {name:'Chihuahua',country:'MX',coords:[-106.07,28.63]},
    {name:'Culiacán',country:'MX',coords:[-107.39,24.79]},
    {name:'Aguascalientes',country:'MX',coords:[-102.30,21.88]},
    {name:'Hermosillo',country:'MX',coords:[-110.96,29.07]},
    {name:'San Luis Potosí',country:'MX',coords:[-101.00,22.15]},
    {name:'Querétaro',country:'MX',coords:[-100.39,20.59]},
    {name:'Morelia',country:'MX',coords:[-101.19,19.70]},
    {name:'Veracruz',country:'MX',coords:[-96.13,19.17]},
    // Argentina
    {name:'Buenos Aires',country:'AR',coords:[-58.38,-34.60]},
    {name:'Córdoba',country:'AR',coords:[-64.18,-31.42]},
    {name:'Rosario',country:'AR',coords:[-60.64,-32.95]},
    {name:'Mendoza',country:'AR',coords:[-68.82,-32.89]},
    {name:'La Plata',country:'AR',coords:[-57.95,-34.92]},
    {name:'Mar del Plata',country:'AR',coords:[-57.56,-38.00]},
    {name:'Tucumán',country:'AR',coords:[-65.21,-26.81]},
    {name:'Salta',country:'AR',coords:[-65.41,-24.78]},
    {name:'Santa Fe',country:'AR',coords:[-60.70,-31.63]},
    // Brasil
    {name:'São Paulo',country:'BR',coords:[-46.63,-23.55]},
    {name:'Río de Janeiro',country:'BR',coords:[-43.17,-22.91]},
    {name:'Brasília',country:'BR',coords:[-47.93,-15.78]},
    {name:'Salvador',country:'BR',coords:[-38.51,-12.97]},
    {name:'Fortaleza',country:'BR',coords:[-38.54,-3.72]},
    {name:'Manaus',country:'BR',coords:[-60.02,-3.10]},
    {name:'Curitiba',country:'BR',coords:[-49.27,-25.43]},
    {name:'Recife',country:'BR',coords:[-34.88,-8.06]},
    {name:'Porto Alegre',country:'BR',coords:[-51.23,-30.03]},
    {name:'Belém',country:'BR',coords:[-48.50,-1.45]},
    {name:'Goiânia',country:'BR',coords:[-49.25,-16.68]},
    {name:'Campinas',country:'BR',coords:[-47.06,-22.91]},
    // España
    {name:'Madrid',country:'ES',coords:[-3.70,40.42]},
    {name:'Barcelona',country:'ES',coords:[2.15,41.38]},
    {name:'Valencia',country:'ES',coords:[-0.38,39.47]},
    {name:'Sevilla',country:'ES',coords:[-5.98,37.39]},
    {name:'Zaragoza',country:'ES',coords:[-0.89,41.65]},
    {name:'Málaga',country:'ES',coords:[-4.42,36.72]},
    {name:'Bilbao',country:'ES',coords:[-2.93,43.26]},
    {name:'Alicante',country:'ES',coords:[-0.48,38.34]},
    // Chile
    {name:'Santiago',country:'CL',coords:[-70.65,-33.46]},
    {name:'Valparaíso',country:'CL',coords:[-71.63,-33.05]},
    {name:'Concepción',country:'CL',coords:[-73.05,-36.82]},
    {name:'Antofagasta',country:'CL',coords:[-70.40,-23.65]},
    {name:'Viña del Mar',country:'CL',coords:[-71.55,-33.02]},
    // Perú
    {name:'Lima',country:'PE',coords:[-77.04,-12.05]},
    {name:'Arequipa',country:'PE',coords:[-71.54,-16.40]},
    {name:'Trujillo',country:'PE',coords:[-79.03,-8.11]},
    {name:'Chiclayo',country:'PE',coords:[-79.84,-6.77]},
    {name:'Piura',country:'PE',coords:[-80.63,-5.19]},
    {name:'Cusco',country:'PE',coords:[-71.98,-13.52]},
    // Venezuela
    {name:'Caracas',country:'VE',coords:[-66.90,10.48]},
    {name:'Maracaibo',country:'VE',coords:[-71.64,10.63]},
    {name:'Valencia',country:'VE',coords:[-68.00,10.18]},
    {name:'Barquisimeto',country:'VE',coords:[-69.36,10.07]},
    {name:'Maracay',country:'VE',coords:[-67.60,10.24]},
    // Ecuador
    {name:'Quito',country:'EC',coords:[-78.50,-0.22]},
    {name:'Guayaquil',country:'EC',coords:[-79.89,-2.19]},
    {name:'Cuenca',country:'EC',coords:[-78.99,-2.90]},
    // USA
    {name:'Nueva York',country:'US',coords:[-74.00,40.71]},
    {name:'Los Ángeles',country:'US',coords:[-118.24,34.05]},
    {name:'Chicago',country:'US',coords:[-87.63,41.88]},
    {name:'Houston',country:'US',coords:[-95.37,29.76]},
    {name:'Miami',country:'US',coords:[-80.19,25.77]},
    {name:'Dallas',country:'US',coords:[-96.80,32.78]},
    {name:'Atlanta',country:'US',coords:[-84.39,33.75]},
    {name:'Phoenix',country:'US',coords:[-112.07,33.45]},
    {name:'San Antonio',country:'US',coords:[-98.49,29.42]},
    // Guatemala
    {name:'Guatemala City',country:'GT',coords:[-90.52,14.64]},
    {name:'Quetzaltenango',country:'GT',coords:[-91.52,14.84]},
    // Costa Rica
    {name:'San José',country:'CR',coords:[-84.09,9.93]},
    // Panamá
    {name:'Ciudad de Panamá',country:'PA',coords:[-79.52,8.99]},
    // Rep. Dominicana
    {name:'Santo Domingo',country:'DO',coords:[-69.90,18.48]},
    {name:'Santiago de los Caballeros',country:'DO',coords:[-70.70,19.45]},
    // Cuba
    {name:'La Habana',country:'CU',coords:[-82.38,23.13]},
    // Uruguay
    {name:'Montevideo',country:'UY',coords:[-56.19,-34.90]},
    // Paraguay
    {name:'Asunción',country:'PY',coords:[-57.64,-25.28]},
    // Bolivia
    {name:'La Paz',country:'BO',coords:[-68.15,-16.50]},
    {name:'Santa Cruz de la Sierra',country:'BO',coords:[-63.18,-17.80]},
    {name:'Cochabamba',country:'BO',coords:[-66.16,-17.39]},
    // Honduras
    {name:'Tegucigalpa',country:'HN',coords:[-87.21,14.08]},
    {name:'San Pedro Sula',country:'HN',coords:[-88.03,15.50]},
    // El Salvador
    {name:'San Salvador',country:'SV',coords:[-89.19,13.70]},
    // Nicaragua
    {name:'Managua',country:'NI',coords:[-86.29,12.13]},
    // UK
    {name:'Londres',country:'GB',coords:[-0.12,51.51]},
    {name:'Manchester',country:'GB',coords:[-2.24,53.48]},
    {name:'Birmingham',country:'GB',coords:[-1.89,52.49]},
    // Francia
    {name:'París',country:'FR',coords:[2.35,48.85]},
    {name:'Lyon',country:'FR',coords:[4.83,45.75]},
    {name:'Marsella',country:'FR',coords:[5.37,43.30]},
    // Alemania
    {name:'Berlín',country:'DE',coords:[13.40,52.52]},
    {name:'Múnich',country:'DE',coords:[11.58,48.14]},
    {name:'Hamburgo',country:'DE',coords:[9.99,53.55]},
    // Italia
    {name:'Roma',country:'IT',coords:[12.50,41.90]},
    {name:'Milán',country:'IT',coords:[9.19,45.46]},
    {name:'Nápoles',country:'IT',coords:[14.27,40.85]},
    // Portugal
    {name:'Lisboa',country:'PT',coords:[-9.14,38.71]},
    {name:'Oporto',country:'PT',coords:[-8.61,41.15]},
    // Canadá
    {name:'Toronto',country:'CA',coords:[-79.38,43.65]},
    {name:'Vancouver',country:'CA',coords:[-123.12,49.28]},
    {name:'Montreal',country:'CA',coords:[-73.57,45.50]},
]

const CODE_TO_NAME: Record<string, string> = Object.fromEntries(
    Object.values(NUMERIC_MAP).map(v => [v.code, v.name])
)

const isCountryCode = (s: string) => s.length === 2 && s === s.toUpperCase()

interface Props {
    selected: string[]
    onChange: (locs: string[]) => void
}

export default function CountryMapSelector({ selected, onChange }: Props) {
    const [zoom, setZoom] = useState(1)
    const [center, setCenter] = useState<[number, number]>([0, 20])
    const [tooltip, setTooltip] = useState<string | null>(null)
    const [citySearch, setCitySearch] = useState('')

    const toggle = useCallback((val: string) => {
        onChange(selected.includes(val) ? selected.filter(s => s !== val) : [...selected, val])
    }, [selected, onChange])

    const selectedCountries = selected.filter(isCountryCode)
    const selectedCities = selected.filter(s => !isCountryCode(s))

    const showCities = zoom >= 2

    const cityResults = citySearch.trim().length >= 2
        ? CITIES.filter(c =>
            c.name.toLowerCase().includes(citySearch.toLowerCase()) ||
            (CODE_TO_NAME[c.country] || '').toLowerCase().includes(citySearch.toLowerCase())
        ).slice(0, 8)
        : []

    return (
        <div className="space-y-3">
            {/* Map container */}
            <div className="relative bg-[#070714] border border-white/8 rounded-2xl overflow-hidden">
                {/* Zoom controls */}
                <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
                    <button
                        onClick={() => setZoom(z => Math.min(z * 1.6, 12))}
                        className="w-7 h-7 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-all"
                    ><ZoomIn size={13} /></button>
                    <button
                        onClick={() => setZoom(z => Math.max(z / 1.6, 1))}
                        className="w-7 h-7 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-all"
                    ><ZoomOut size={13} /></button>
                    <button
                        onClick={() => { setZoom(1); setCenter([0, 20]) }}
                        className="w-7 h-7 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-all"
                    ><RotateCcw size={11} /></button>
                </div>

                {/* Tooltip */}
                {tooltip && (
                    <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-black/80 border border-white/10 rounded-lg text-[11px] text-white pointer-events-none">
                        {tooltip}
                    </div>
                )}

                {/* Hint */}
                {!showCities && (
                    <div className="absolute bottom-2 left-2 z-10 text-[10px] text-white/20 pointer-events-none">
                        Acerca el mapa para ver ciudades
                    </div>
                )}

                <ComposableMap
                    projectionConfig={{ scale: 130, center: [0, 20] }}
                    style={{ width: '100%', height: '280px' }}
                >
                    <ZoomableGroup
                        zoom={zoom}
                        center={center}
                        onMoveEnd={({ zoom: z, coordinates }) => {
                            setZoom(z)
                            setCenter(coordinates as [number, number])
                        }}
                    >
                        {/* Countries */}
                        <Geographies geography={GEO_URL}>
                            {({ geographies }: { geographies: any[]; path: any; projection: any }) =>
                                geographies.map((geo: any) => {
                                    const numId = Number(geo.id)
                                    const info = NUMERIC_MAP[numId]
                                    const isSel = info ? selectedCountries.includes(info.code) : false
                                    return (
                                        <Geography
                                            key={geo.rsmKey}
                                            geography={geo}
                                            onClick={() => { if (info) toggle(info.code) }}
                                            onMouseEnter={() => setTooltip(info?.name || null)}
                                            onMouseLeave={() => setTooltip(null)}
                                            style={{
                                                default: { fill: isSel ? '#B735B8' : '#0B1B2B', stroke: '#050B14', strokeWidth: 0.4, outline: 'none', cursor: info ? 'pointer' : 'default' },
                                                hover: { fill: isSel ? '#B735B8' : '#102A55', stroke: '#050B14', strokeWidth: 0.4, outline: 'none', cursor: info ? 'pointer' : 'default' },
                                                pressed: { fill: '#5b21b6', outline: 'none' }
                                            }}
                                        />
                                    )
                                })
                            }
                        </Geographies>

                        {/* City markers — only when zoomed */}
                        {showCities && CITIES.map(city => {
                            const isSel = selectedCities.includes(city.name)
                            const countrySelected = selectedCountries.includes(city.country)
                            const dotR = isSel ? 5 : 3.5
                            return (
                                <Marker
                                    key={`${city.name}-${city.country}`}
                                    coordinates={city.coords}
                                >
                                    {/* Invisible large hit area to capture clicks reliably */}
                                    <circle
                                        r={10}
                                        fill="transparent"
                                        style={{ cursor: 'pointer' }}
                                        onPointerDown={e => { e.stopPropagation(); toggle(city.name) }}
                                        onMouseEnter={() => setTooltip(city.name)}
                                        onMouseLeave={() => setTooltip(null)}
                                    />
                                    {/* Visible dot */}
                                    <circle
                                        r={dotR}
                                        fill={isSel ? '#4C97D8' : countrySelected ? '#B735B8' : '#64748b'}
                                        stroke={isSel ? '#4C97D8' : '#081624'}
                                        strokeWidth={isSel ? 1.5 : 0.8}
                                        style={{ pointerEvents: 'none', transition: 'all 0.15s' }}
                                    />
                                    {isSel && (
                                        <text
                                            textAnchor="middle"
                                            y={-8}
                                            style={{ fontSize: `${Math.max(3, 4.5 / zoom)}px`, fill: '#4C97D8', fontWeight: 700, pointerEvents: 'none' }}
                                        >
                                            {city.name}
                                        </text>
                                    )}
                                </Marker>
                            )
                        })}
                    </ZoomableGroup>
                </ComposableMap>
            </div>

            {/* City search */}
            <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                    value={citySearch}
                    onChange={e => setCitySearch(e.target.value)}
                    placeholder="Buscar ciudad o departamento (Ej: Bogotá, Medellín...)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-white/10 placeholder:text-white/20"
                />
                {citySearch && (
                    <button onClick={() => setCitySearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                        <X size={12} />
                    </button>
                )}
                {cityResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-[#0d0d1f] border border-white/10 rounded-xl overflow-hidden shadow-xl max-h-48 overflow-y-auto">
                        {cityResults.map(c => {
                            const isSel = selectedCities.includes(c.name)
                            return (
                                <button
                                    key={`${c.name}-${c.country}`}
                                    onClick={() => { toggle(c.name); setCitySearch('') }}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-white/5 transition-all text-left ${isSel ? 'text-[#4C97D8]' : 'text-white/70'}`}
                                >
                                    <span className="flex items-center gap-2">
                                        <MapPin size={11} className="text-white/30 shrink-0" />
                                        {c.name}
                                    </span>
                                    <span className="text-xs text-white/25">{CODE_TO_NAME[c.country] || c.country}</span>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Selected chips */}
            {selected.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                    {selectedCountries.map(code => (
                        <span key={code} className="flex items-center gap-1 text-xs bg-[#B735B8]/10 border border-white/10 text-[#B735B8] px-2.5 py-1 rounded-full">
                            {CODE_TO_NAME[code] || code}
                            <button onClick={() => toggle(code)} className="hover:text-[#F87171] ml-0.5"><X size={9} /></button>
                        </span>
                    ))}
                    {selectedCities.map(city => (
                        <span key={city} className="flex items-center gap-1 text-xs bg-[#4C97D8]/10 border border-white/10 text-[#4C97D8] px-2.5 py-1 rounded-full">
                            <MapPin size={9} />{city}
                            <button onClick={() => toggle(city)} className="hover:text-[#F87171] ml-0.5"><X size={9} /></button>
                        </span>
                    ))}
                    <button onClick={() => onChange([])} className="text-[11px] text-white/20 hover:text-[#F87171] px-2 py-1 transition-colors">
                        Limpiar todo
                    </button>
                </div>
            ) : (
                <p className="text-[11px] text-white/20 flex items-center gap-1.5 px-1">
                    <Globe size={11} /> Sin selección: el anuncio se mostrará globalmente
                </p>
            )}
        </div>
    )
}
