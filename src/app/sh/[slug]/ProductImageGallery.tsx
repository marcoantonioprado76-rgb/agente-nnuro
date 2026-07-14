'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ProductImageGalleryProps {
    images: string[]
    name: string
    aspectRatio?: string
}

export function ProductImageGallery({ images, name, aspectRatio = "aspect-square" }: ProductImageGalleryProps) {
    const [current, setCurrent] = useState(0)
    const validImages = images?.length > 0 ? images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200']

    useEffect(() => {
        if (validImages.length <= 1) return

        const timer = setInterval(() => {
            setCurrent((prev) => (prev + 1) % validImages.length)
        }, 2000)

        return () => clearInterval(timer)
    }, [validImages.length])

    const next = (e?: React.MouseEvent) => {
        e?.preventDefault()
        e?.stopPropagation()
        setCurrent((prev) => (prev + 1) % validImages.length)
    }

    const prev = (e?: React.MouseEvent) => {
        e?.preventDefault()
        e?.stopPropagation()
        setCurrent((prev) => (prev - 1 + validImages.length) % validImages.length)
    }

    return (
        <div className={`relative ${aspectRatio} bg-white overflow-hidden group select-none`}>
            {/* Riel de Imágenes */}
            <div
                className="flex w-full h-full transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${current * 100}%)` }}
            >
                {validImages.map((img, i) => (
                    <div key={i} className="w-full h-full flex-shrink-0 flex items-center justify-center bg-white">
                        <img
                            src={img}
                            alt={`${name} - ${i + 1}`}
                            className="w-full h-full object-contain p-4"
                        />
                    </div>
                ))}
            </div>

            {validImages.length > 1 && (
                <>
                    {/* Indicadores */}
                    <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5 z-10">
                        {validImages.map((_, i) => (
                            <button
                                key={i}
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setCurrent(i)
                                }}
                                className={`h-1 rounded-full transition-all duration-300 ${i === current ? 'w-6 bg-slate-900' : 'w-1.5 bg-slate-200'}`}
                            />
                        ))}
                    </div>

                    {/* Controles Nav */}
                    <button
                        onClick={prev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-slate-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white/40 shadow-sm z-20"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        onClick={next}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-slate-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white/40 shadow-sm z-20"
                    >
                        <ChevronRight size={16} />
                    </button>
                </>
            )}
        </div>
    )
}
