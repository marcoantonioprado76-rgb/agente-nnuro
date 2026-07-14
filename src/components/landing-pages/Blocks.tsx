'use client'

import React, { useRef, useState } from 'react'
import { LucideIcon, Globe, Users, Activity, ChevronRight, Play, Plus, Trash2, ArrowUp, ArrowDown, Check, Star, Shield, ChevronDown, Youtube, Camera, Loader2, Link as LinkIcon } from 'lucide-react'

// ... (BlockData and BlockProps interfaces)

const EditableImage = ({ src, alt, className, onUpload, isEditing }: { src: string, alt: string, className: string, onUpload: (url: string) => void, isEditing: boolean }) => {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)

    const handleUploadClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (isEditing) {
            fileInputRef.current?.click()
        }
    }

    const handleUrlClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (isEditing) {
            const newUrl = window.prompt('Introduce la URL de la imagen:', src)
            if (newUrl && newUrl !== src) {
                onUpload(newUrl)
            }
        }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })
            const data = await res.json()
            if (data.url) {
                onUpload(data.url)
            }
        } catch (error) {
            console.error('Error uploading image:', error)
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className={`relative group/img ${className}`}>
            {uploading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-20 rounded-inherit">
                    <Loader2 className="w-6 h-6 text-[#00F0FF] animate-spin" />
                </div>
            ) : isEditing && (
                <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/0 group-hover/img:bg-black/20 transition-all z-10 rounded-inherit opacity-0 group-hover/img:opacity-100">
                    <button
                        onClick={handleUploadClick}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-md border border-white/20 transition-all hover:scale-110"
                        title="Subir archivo"
                    >
                        <Camera className="w-5 h-5 text-white" />
                    </button>
                    <button
                        onClick={handleUrlClick}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-md border border-white/20 transition-all hover:scale-110"
                        title="Cambiar URL"
                    >
                        <LinkIcon className="w-5 h-5 text-white" />
                    </button>
                </div>
            )}
            <img src={src} alt={alt} className="w-full h-full object-cover" />
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
            />
        </div>
    )
}

const Deletable = ({ children, onDelete, isEditing, className = '' }: { children: React.ReactNode, onDelete: () => void, isEditing: boolean, className?: string }) => {
    if (!isEditing) return <div className={className}>{children}</div>

    return (
        <div className={`relative group/deletable ${className}`}>
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    if (window.confirm('¿Estás seguro de que quieres eliminar este elemento?')) {
                        onDelete()
                    }
                }}
                className="absolute -top-2 -right-2 z-[60] p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover/deletable:opacity-100 transition-opacity shadow-lg hover:scale-110"
                title="Eliminar elemento"
            >
                <Trash2 size={12} />
            </button>
            {children}
        </div>
    )
}

const SortableElement = ({ children, onMoveUp, onMoveDown, isEditing, className = '' }: { children: React.ReactNode, onMoveUp?: () => void, onMoveDown?: () => void, isEditing: boolean, className?: string }) => {
    if (!isEditing) return <div className={className}>{children}</div>

    return (
        <div className={`relative group/sortable w-full flex justify-center ${className}`}>
            <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover/sortable:opacity-100 transition-opacity z-[60]">
                {onMoveUp && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
                        className="p-1.5 bg-white/10 hover:bg-[#00F0FF] hover:text-black rounded-lg backdrop-blur-md border border-white/20 transition-all text-white"
                        title="Subir"
                    >
                        <ArrowUp size={14} />
                    </button>
                )}
                {onMoveDown && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
                        className="p-1.5 bg-white/10 hover:bg-[#00F0FF] hover:text-black rounded-lg backdrop-blur-md border border-white/20 transition-all text-white"
                        title="Bajar"
                    >
                        <ArrowDown size={14} />
                    </button>
                )}
            </div>
            {children}
        </div>
    )
}

const EditableVideo = ({ videoId, onUpdate, isEditing, className = '' }: { videoId: string, onUpdate: (id: string) => void, isEditing: boolean, className?: string }) => {
    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation()
        const newUrl = window.prompt('Introduce el ID de YouTube o la URL del video:', videoId)
        if (newUrl) {
            // Extraer ID si es una URL
            let finalId = newUrl
            if (newUrl.includes('youtube.com/watch?v=')) {
                finalId = newUrl.split('v=')[1].split('&')[0]
            } else if (newUrl.includes('youtu.be/')) {
                finalId = newUrl.split('youtu.be/')[1].split('?')[0]
            } else if (newUrl.includes('youtube.com/embed/')) {
                finalId = newUrl.split('embed/')[1].split('?')[0]
            }
            onUpdate(finalId)
        }
    }

    return (
        <div className={`relative group/video ${className}`}>
            {isEditing && (
                <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover/video:opacity-100 transition-opacity bg-black/20 backdrop-blur-[2px]">
                    <button
                        onClick={handleEdit}
                        className="p-3 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-md border border-white/20 transition-all hover:scale-110 flex items-center gap-2 text-white font-bold text-sm"
                    >
                        <Youtube className="w-5 h-5" />
                        Cambiar Video
                    </button>
                </div>
            )}
            <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${videoId}?autoplay=0&mute=0&controls=1`}
                title="Video Player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />
        </div>
    )
}

const EditableButton = ({ text, url, onUpdate, isEditing, className = '', styleClass = '' }: { text: string, url?: string, onUpdate: (text: string, url: string) => void, isEditing: boolean, className?: string, styleClass?: string }) => {
    const handleUrlEdit = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        const newUrl = window.prompt('URL del botón:', url || '#')
        if (newUrl !== null) {
            onUpdate(text, newUrl)
        }
    }

    return (
        <div className={`relative group/btn inline-flex ${className}`}>
            {isEditing && (
                <button
                    onClick={handleUrlEdit}
                    className="absolute -top-3 -right-3 z-50 p-2 bg-[#00F0FF] text-black rounded-full shadow-xl hover:scale-110 transition-all border-2 border-black opacity-0 group-hover/btn:opacity-100"
                    title="Configurar URL"
                >
                    <LinkIcon size={14} />
                </button>
            )}
            <div
                className={`${styleClass} outline-none cursor-text`}
                contentEditable={isEditing}
                suppressContentEditableWarning
                onBlur={(e) => {
                    if (isEditing) {
                        onUpdate(e.currentTarget.innerText || 'Botón', url || '#')
                    }
                }}
                onClick={(e) => isEditing && e.preventDefault()}
            >
                {text || (isEditing ? 'Configurar Botón' : '')}
            </div>
        </div>
    )
}

export interface BlockData {
    id: string
    type: string
    content: any
    styles: any
}

interface BlockProps {
    data: BlockData
    isEditing?: boolean
    onEdit?: (id: string, field: string, value: any) => void
}

const Glow = ({ color = '#9B00FF', size = '300px', opacity = 0.2, className = '' }) => (
    <div
        className={`absolute pointer-events-none blur-[100px] rounded-full ${className}`}
        style={{
            backgroundColor: color,
            width: size,
            height: size,
            opacity: opacity
        }}
    />
)

const HexPattern = () => (
    <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill-rule='evenodd' stroke='%23ffffff' stroke-width='1' fill='none'/%3E%3C/svg%3E")`, backgroundSize: '60px 60px' }} />
)

export const NDTHeroBlock = ({ data, isEditing, onEdit }: BlockProps) => {
    const { logo, headline, subheadline, videoId, bonusText, buttonText } = data.content
    const { accentColor = '#00F0FF' } = data.styles

    const defaultOrder = ['logo', 'headline', 'subheadline', 'video', 'bonusText', 'button']
    const elementOrder = data.content.elementOrder || defaultOrder

    const moveElement = (direction: 'up' | 'down', index: number) => {
        const newOrder = [...elementOrder]
        const targetIdx = direction === 'up' ? index - 1 : index + 1
        if (targetIdx < 0 || targetIdx >= newOrder.length) return
            ;[newOrder[index], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[index]]
        onEdit?.(data.id, 'elementOrder', newOrder)
    }

    const renderElement = (type: string, index: number) => {
        switch (type) {
            case 'logo':
                return logo && (
                    <SortableElement
                        key="logo"
                        isEditing={!!isEditing}
                        onMoveUp={index > 0 ? () => moveElement('up', index) : undefined}
                        onMoveDown={index < elementOrder.length - 1 ? () => moveElement('down', index) : undefined}
                        className="mb-12"
                    >
                        <Deletable isEditing={!!isEditing} onDelete={() => onEdit?.(data.id, 'logo', null)}>
                            <EditableImage
                                src={logo}
                                alt="Logo"
                                className="h-12 w-auto"
                                isEditing={!!isEditing}
                                onUpload={(url) => onEdit?.(data.id, 'logo', url)}
                            />
                        </Deletable>
                    </SortableElement>
                )
            case 'headline':
                return (
                    <SortableElement
                        key="headline"
                        isEditing={!!isEditing}
                        onMoveUp={index > 0 ? () => moveElement('up', index) : undefined}
                        onMoveDown={index < elementOrder.length - 1 ? () => moveElement('down', index) : undefined}
                        className="mb-8 max-w-4xl"
                    >
                        <h1
                            className="text-3xl md:text-5xl font-black tracking-tighter leading-tight uppercase outline-none"
                            contentEditable={isEditing}
                            onBlur={(e) => isEditing && onEdit?.(data.id, 'headline', e.currentTarget.innerText)}
                            suppressContentEditableWarning
                        >
                            {headline}
                        </h1>
                    </SortableElement>
                )
            case 'subheadline':
                return subheadline && (
                    <SortableElement
                        key="subheadline"
                        isEditing={!!isEditing}
                        onMoveUp={index > 0 ? () => moveElement('up', index) : undefined}
                        onMoveDown={index < elementOrder.length - 1 ? () => moveElement('down', index) : undefined}
                        className="mb-10 max-w-4xl"
                    >
                        <Deletable isEditing={!!isEditing} onDelete={() => onEdit?.(data.id, 'subheadline', null)}>
                            <p
                                className="flex items-center gap-2 text-[#00F0FF] text-xs font-black uppercase tracking-widest outline-none"
                                contentEditable={isEditing}
                                onBlur={(e) => isEditing && onEdit?.(data.id, 'subheadline', e.currentTarget.innerText)}
                                suppressContentEditableWarning
                            >
                                <Play size={12} fill="currentColor" /> {subheadline}
                            </p>
                        </Deletable>
                    </SortableElement>
                )
            case 'video':
                return (
                    <SortableElement
                        key="video"
                        isEditing={!!isEditing}
                        onMoveUp={index > 0 ? () => moveElement('up', index) : undefined}
                        onMoveDown={index < elementOrder.length - 1 ? () => moveElement('down', index) : undefined}
                        className="mb-12"
                    >
                        <div className="w-full relative group">
                            <div className="absolute -inset-1 rounded-2xl blur-xl opacity-20 bg-[#00F0FF]" />
                            <EditableVideo
                                videoId={videoId}
                                isEditing={!!isEditing}
                                onUpdate={(newId) => onEdit?.(data.id, 'videoId', newId)}
                                className="relative rounded-2xl overflow-hidden border border-white/10 bg-black aspect-video shadow-2xl"
                            />
                        </div>
                    </SortableElement>
                )
            case 'bonusText':
                return bonusText && (
                    <SortableElement
                        key="bonusText"
                        isEditing={!!isEditing}
                        onMoveUp={index > 0 ? () => moveElement('up', index) : undefined}
                        onMoveDown={index < elementOrder.length - 1 ? () => moveElement('down', index) : undefined}
                        className="mb-12 max-w-4xl"
                    >
                        <Deletable isEditing={!!isEditing} onDelete={() => onEdit?.(data.id, 'bonusText', null)}>
                            <p
                                className="text-white/60 text-sm md:text-base max-w-2xl leading-relaxed outline-none"
                                contentEditable={isEditing}
                                onBlur={(e) => isEditing && onEdit?.(data.id, 'bonusText', e.currentTarget.innerText)}
                                suppressContentEditableWarning
                            >
                                {bonusText}
                            </p>
                        </Deletable>
                    </SortableElement>
                )
            case 'button':
                return (
                    <SortableElement
                        key="button"
                        isEditing={!!isEditing}
                        onMoveUp={index > 0 ? () => moveElement('up', index) : undefined}
                        onMoveDown={index < elementOrder.length - 1 ? () => moveElement('down', index) : undefined}
                    >
                        <EditableButton
                            text={buttonText}
                            url={data.content.buttonUrl}
                            isEditing={!!isEditing}
                            onUpdate={(text, url) => {
                                onEdit?.(data.id, 'buttonText', text)
                                onEdit?.(data.id, 'buttonUrl', url)
                            }}
                            styleClass="relative bg-[#00F0FF] text-black px-12 py-6 rounded-lg font-black text-sm md:text-base uppercase tracking-widest shadow-[0_0_50px_rgba(0,240,255,0.3)] hover:scale-105 transition-all"
                            className="relative group"
                        />
                    </SortableElement>
                )
            default:
                return null
        }
    }

    return (
        <section className="relative pt-16 pb-32 px-6 overflow-visible bg-[#050505] text-white font-inter group/block">
            <HexPattern />
            {isEditing && (
                <div className="absolute top-4 right-4 z-50 opacity-0 group-hover/block:opacity-100 transition-opacity flex gap-2">
                    <button onClick={() => onEdit?.(data.id, 'moveUp', true)} className="bg-white/10 p-2 rounded-lg text-white"><ArrowUp size={14} /></button>
                    <button onClick={() => onEdit?.(data.id, 'moveDown', true)} className="bg-white/10 p-2 rounded-lg text-white"><ArrowDown size={14} /></button>
                    <button onClick={() => onEdit?.(data.id, 'delete', true)} className="bg-red-500/20 p-2 rounded-lg text-red-500"><Trash2 size={14} /></button>
                </div>
            )}
            <Glow color={accentColor} size="600px" className="-top-40 -left-40" opacity={0.1} />
            <Glow color={accentColor} size="600px" className="top-1/4 -right-40" opacity={0.05} />

            <div className="max-w-6xl mx-auto relative z-10 flex flex-col items-center text-center">
                {elementOrder.map((type: string, idx: number) => renderElement(type, idx))}
            </div>
        </section>
    )
}

export const NDTResultsBlock = ({ data, isEditing, onEdit }: BlockProps) => {
    const { badge, title, items = [] } = data.content
    const { accentColor = '#00F0FF' } = data.styles

    return (
        <section className="relative py-32 px-6 bg-[#050505] overflow-hidden">
            <HexPattern />
            {isEditing && (
                <div className="absolute top-4 right-4 z-50 opacity-0 group-hover/block:opacity-100 transition-opacity flex gap-2">
                    <button onClick={() => onEdit?.(data.id, 'moveUp', true)} className="bg-white/10 p-2 rounded-lg text-white"><ArrowUp size={14} /></button>
                    <button onClick={() => onEdit?.(data.id, 'moveDown', true)} className="bg-white/10 p-2 rounded-lg text-white"><ArrowDown size={14} /></button>
                    <button onClick={() => onEdit?.(data.id, 'delete', true)} className="bg-red-500/20 p-2 rounded-lg text-red-500"><Trash2 size={14} /></button>
                </div>
            )}

            <div className="max-w-6xl mx-auto relative z-10 flex flex-col items-center text-center">
                <span className="text-[#00F0FF] text-[10px] font-black uppercase tracking-[0.3em] mb-4">
                    {badge}
                </span>
                <h2
                    className="text-4xl md:text-5xl font-black mb-20 tracking-tighter uppercase"
                    contentEditable={isEditing}
                    onBlur={(e) => isEditing && onEdit?.(data.id, 'title', e.currentTarget.innerText)}
                    suppressContentEditableWarning
                >
                    {title}
                </h2>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 w-full">
                    {items.map((item: any, idx: number) => (
                        <Deletable
                            key={idx}
                            isEditing={!!isEditing}
                            onDelete={() => {
                                const newItems = items.filter((_: any, i: number) => i !== idx)
                                onEdit?.(data.id, 'items', newItems)
                            }}
                        >
                            <div className="flex flex-col gap-4">
                                <div className="aspect-[4/5] bg-[#D9D9D9] rounded-xl overflow-hidden shadow-2xl relative group">
                                    <EditableImage
                                        src={item.image || ''}
                                        alt={item.name}
                                        className="w-full h-full"
                                        isEditing={!!isEditing}
                                        onUpload={(url) => {
                                            const newItems = [...items]
                                            newItems[idx] = { ...newItems[idx], image: url }
                                            onEdit?.(data.id, 'items', newItems)
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                </div>
                                <div className="text-left">
                                    <h4
                                        className="text-base font-bold text-white mb-1 uppercase tracking-tight outline-none"
                                        contentEditable={isEditing}
                                        onBlur={(e) => {
                                            if (isEditing) {
                                                const newItems = [...items]
                                                newItems[idx] = { ...newItems[idx], name: e.currentTarget.innerText }
                                                onEdit?.(data.id, 'items', newItems)
                                            }
                                        }}
                                        suppressContentEditableWarning
                                    >
                                        {item.name}
                                    </h4>
                                    <p
                                        className="text-[#00F0FF] text-[10px] font-black uppercase tracking-widest outline-none"
                                        contentEditable={isEditing}
                                        onBlur={(e) => {
                                            if (isEditing) {
                                                const newItems = [...items]
                                                newItems[idx] = { ...newItems[idx], role: e.currentTarget.innerText }
                                                onEdit?.(data.id, 'items', newItems)
                                            }
                                        }}
                                        suppressContentEditableWarning
                                    >
                                        {item.role}
                                    </p>
                                </div>
                            </div>
                        </Deletable>
                    ))}
                </div>
            </div>
        </section>
    )
}
export const HeroBlock = ({ data, isEditing, onEdit }: BlockProps) => {
    const { title, subtitle, buttonText, image, videoId, badge } = data.content
    const { accentColor = '#00FF88', layout = 'center' } = data.styles

    const defaultOrder = ['badge', 'title', 'subtitle', 'buttons', 'media']
    const elementOrder = data.content.elementOrder || defaultOrder

    const moveElement = (direction: 'up' | 'down', index: number) => {
        const newOrder = [...elementOrder]
        const targetIdx = direction === 'up' ? index - 1 : index + 1
        if (targetIdx < 0 || targetIdx >= newOrder.length) return
            ;[newOrder[index], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[index]]
        onEdit?.(data.id, 'elementOrder', newOrder)
    }

    const renderElement = (type: string, index: number) => {
        switch (type) {
            case 'badge':
                return badge && (
                    <SortableElement
                        key="badge"
                        isEditing={!!isEditing}
                        onMoveUp={index > 0 ? () => moveElement('up', index) : undefined}
                        onMoveDown={index < elementOrder.length - 1 ? () => moveElement('down', index) : undefined}
                        className="mb-6"
                    >
                        <Deletable isEditing={!!isEditing} onDelete={() => onEdit?.(data.id, 'badge', null)}>
                            <span
                                className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-white/60 outline-none"
                                contentEditable={isEditing}
                                onBlur={(e) => isEditing && onEdit?.(data.id, 'badge', e.currentTarget.innerText)}
                                suppressContentEditableWarning
                            >
                                {badge}
                            </span>
                        </Deletable>
                    </SortableElement>
                )
            case 'title':
                return (
                    <SortableElement
                        key="title"
                        isEditing={!!isEditing}
                        onMoveUp={index > 0 ? () => moveElement('up', index) : undefined}
                        onMoveDown={index < elementOrder.length - 1 ? () => moveElement('down', index) : undefined}
                        className="mb-8"
                    >
                        <h1
                            className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] uppercase outline-none"
                            style={{ textShadow: `0 0 40px ${accentColor}30` }}
                            contentEditable={isEditing}
                            onBlur={(e) => isEditing && onEdit?.(data.id, 'title', e.currentTarget.innerText)}
                            suppressContentEditableWarning
                        >
                            {title}
                        </h1>
                    </SortableElement>
                )
            case 'subtitle':
                return (
                    <SortableElement
                        key="subtitle"
                        isEditing={!!isEditing}
                        onMoveUp={index > 0 ? () => moveElement('up', index) : undefined}
                        onMoveDown={index < elementOrder.length - 1 ? () => moveElement('down', index) : undefined}
                        className="mb-10"
                    >
                        <p
                            className="text-lg md:text-xl text-white/40 max-w-2xl font-light leading-relaxed outline-none"
                            contentEditable={isEditing}
                            onBlur={(e) => isEditing && onEdit?.(data.id, 'subtitle', e.currentTarget.innerText)}
                            suppressContentEditableWarning
                        >
                            {subtitle}
                        </p>
                    </SortableElement>
                )
            case 'buttons':
                return (
                    <SortableElement
                        key="buttons"
                        isEditing={!!isEditing}
                        onMoveUp={index > 0 ? () => moveElement('up', index) : undefined}
                        onMoveDown={index < elementOrder.length - 1 ? () => moveElement('down', index) : undefined}
                        className="mb-10"
                    >
                        <div className={`flex flex-wrap gap-4 ${layout === 'center' ? 'justify-center' : ''}`}>
                            <EditableButton
                                text={buttonText}
                                url={data.content.buttonUrl}
                                isEditing={!!isEditing}
                                onUpdate={(text, url) => {
                                    onEdit?.(data.id, 'buttonText', text)
                                    onEdit?.(data.id, 'buttonUrl', url)
                                }}
                                styleClass="bg-white text-black px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_50px_rgba(255,255,255,0.2)]"
                            />
                        </div>
                    </SortableElement>
                )
            case 'media':
                return (image || videoId) && (
                    <SortableElement
                        key="media"
                        isEditing={!!isEditing}
                        onMoveUp={index > 0 ? () => moveElement('up', index) : undefined}
                        onMoveDown={index < elementOrder.length - 1 ? () => moveElement('down', index) : undefined}
                        className={layout === 'side' ? 'flex-1' : 'w-full'}
                    >
                        <div className="w-full relative group">
                            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent z-10 pointer-events-none" />
                            <div className={`absolute -inset-1 rounded-[32px] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity bg-${accentColor}`} style={{ backgroundColor: accentColor }} />
                            <div className="relative rounded-[32px] overflow-hidden border border-white/10 bg-dark-900 aspect-video shadow-2xl">
                                {videoId ? (
                                    <EditableVideo
                                        videoId={videoId}
                                        isEditing={!!isEditing}
                                        onUpdate={(newId) => onEdit?.(data.id, 'videoId', newId)}
                                        className="w-full h-full"
                                    />
                                ) : (
                                    <EditableImage
                                        src={image}
                                        alt="Hero"
                                        className="w-full h-full"
                                        isEditing={!!isEditing}
                                        onUpload={(url) => onEdit?.(data.id, 'image', url)}
                                    />
                                )}
                            </div>
                        </div>
                    </SortableElement>
                )
            default:
                return null
        }
    }

    return (
        <section className="relative py-24 px-6 overflow-visible bg-[#050505] text-white font-inter group/block">
            {isEditing && (
                <div className="absolute top-4 right-4 z-50 opacity-0 group-hover/block:opacity-100 transition-opacity flex gap-2">
                    <button onClick={() => onEdit?.(data.id, 'moveUp', true)} className="bg-white/10 p-2 rounded-lg text-white"><ArrowUp size={14} /></button>
                    <button onClick={() => onEdit?.(data.id, 'moveDown', true)} className="bg-white/10 p-2 rounded-lg text-white"><ArrowDown size={14} /></button>
                    <button onClick={() => onEdit?.(data.id, 'delete', true)} className="bg-red-500/20 p-2 rounded-lg text-red-500"><Trash2 size={14} /></button>
                </div>
            )}
            <Glow color={accentColor} className="-top-20 -left-20" opacity={0.15} />
            <Glow color={accentColor} className="top-1/2 -right-40" opacity={0.1} />

            <div className={`max-w-6xl mx-auto flex flex-col ${layout === 'center' ? 'items-center text-center' : 'md:flex-row items-center text-left gap-12'}`}>
                {layout === 'center' ? (
                    <div className="max-w-4xl w-full flex flex-col items-center">
                        {elementOrder.map((type: string, idx: number) => renderElement(type, idx))}
                    </div>
                ) : (
                    <>
                        <div className="flex-1 flex flex-col items-start">
                            {elementOrder.filter((t: string) => t !== 'media').map((type: string, idx: number) => renderElement(type, idx))}
                        </div>
                        {elementOrder.includes('media') && renderElement('media', elementOrder.indexOf('media'))}
                    </>
                )}
            </div>
        </section>
    )
}

export const LogoCloudBlock = ({ data, isEditing, onEdit }: BlockProps) => {
    const { logos = [] } = data.content
    return (
        <section className="py-12 border-y border-white/5 bg-[#050505] group/block relative">
            {isEditing && (
                <div className="absolute top-4 right-4 z-50 opacity-0 group-hover/block:opacity-100 transition-opacity flex gap-2">
                    <button
                        onClick={() => onEdit?.(data.id, 'moveUp', true)}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 p-2 rounded-lg text-white"
                    ><ArrowUp size={14} /></button>
                    <button
                        onClick={() => onEdit?.(data.id, 'moveDown', true)}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 p-2 rounded-lg text-white"
                    ><ArrowDown size={14} /></button>
                    <button
                        onClick={() => onEdit?.(data.id, 'delete', true)}
                        className="bg-red-500/20 hover:bg-red-500/40 backdrop-blur-md border border-red-500/30 p-2 rounded-lg text-red-500"
                    ><Trash2 size={14} /></button>
                </div>
            )}
            <div className="max-w-6xl mx-auto px-6">
                <div className="flex flex-wrap items-center justify-center gap-12 opacity-30 grayscale hover:grayscale-0 transition-all">
                    {logos.length > 0 ? logos.map((l: any, i: number) => (
                        <img key={i} src={l} className="h-6 md:h-8 object-contain" alt="Brand" />
                    )) : (
                        <>
                            <div
                                className="text-xl font-black tracking-tighter text-white outline-none"
                                contentEditable={isEditing}
                                onBlur={(e) => {
                                    if (!isEditing) return
                                    const newLogos = [...logos]
                                    newLogos[0] = e.currentTarget.innerText
                                    onEdit?.(data.id, 'logos', newLogos)
                                }}
                                suppressContentEditableWarning
                            >STACK</div>
                            <div
                                className="text-xl font-black tracking-tighter text-white outline-none"
                                contentEditable={isEditing}
                                onBlur={(e) => {
                                    if (!isEditing) return
                                    const newLogos = [...logos]
                                    newLogos[1] = e.currentTarget.innerText
                                    onEdit?.(data.id, 'logos', newLogos)
                                }}
                                suppressContentEditableWarning
                            >BUNGALOW</div>
                            <div
                                className="text-xl font-black tracking-tighter text-white outline-none"
                                contentEditable={isEditing}
                                onBlur={(e) => {
                                    if (!isEditing) return
                                    const newLogos = [...logos]
                                    newLogos[2] = e.currentTarget.innerText
                                    onEdit?.(data.id, 'logos', newLogos)
                                }}
                                suppressContentEditableWarning
                            >PETSKY</div>
                            <div
                                className="text-xl font-black tracking-tighter text-white outline-none"
                                contentEditable={isEditing}
                                onBlur={(e) => {
                                    if (!isEditing) return
                                    const newLogos = [...logos]
                                    newLogos[3] = e.currentTarget.innerText
                                    onEdit?.(data.id, 'logos', newLogos)
                                }}
                                suppressContentEditableWarning
                            >MONOGRAM</div>
                        </>
                    )}
                </div>
            </div>
        </section>
    )
}

export const FeaturesBlock = ({ data, isEditing, onEdit }: BlockProps) => {
    const { title, items = [] } = data.content
    const { accentColor = '#00FF88' } = data.styles

    return (
        <section className="relative py-32 px-6 bg-[#050505] overflow-hidden group/block">
            {isEditing && (
                <div className="absolute top-4 right-4 z-50 opacity-0 group-hover/block:opacity-100 transition-opacity flex gap-2">
                    <button
                        onClick={() => onEdit?.(data.id, 'moveUp', true)}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 p-2 rounded-lg text-white"
                    ><ArrowUp size={14} /></button>
                    <button
                        onClick={() => onEdit?.(data.id, 'moveDown', true)}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 p-2 rounded-lg text-white"
                    ><ArrowDown size={14} /></button>
                    <button
                        onClick={() => onEdit?.(data.id, 'delete', true)}
                        className="bg-red-500/20 hover:bg-red-500/40 backdrop-blur-md border border-red-500/30 p-2 rounded-lg text-red-500"
                    ><Trash2 size={14} /></button>
                </div>
            )}
            <Glow color={accentColor} className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" opacity={0.05} />
            <div className="max-w-6xl mx-auto relative z-10">
                <h2
                    className="text-4xl md:text-5xl font-black text-center mb-20 tracking-tighter uppercase outline-none"
                    contentEditable={isEditing}
                    onBlur={(e) => isEditing && onEdit?.(data.id, 'title', e.currentTarget.innerText)}
                    suppressContentEditableWarning
                >
                    {title}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {items.map((item: any, idx: number) => (
                        <div key={idx} className="bg-white/[0.02] backdrop-blur-3xl border border-white/5 p-10 rounded-[40px] hover:border-white/20 transition-all group overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity">
                                <Globe size={80} />
                            </div>
                            <div
                                className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-8 border border-white/10 group-hover:bg-white group-hover:text-black transition-all"
                                style={{ background: `${accentColor}20`, color: accentColor }}
                            >
                                {idx === 0 ? <Shield size={24} /> : idx === 1 ? <Globe size={24} /> : <Play size={24} />}
                            </div>
                            <h3
                                className="text-2xl font-bold text-white mb-4 tracking-tight outline-none"
                                contentEditable={isEditing}
                                onBlur={(e) => {
                                    if (!isEditing) return
                                    const newItems = [...items]
                                    newItems[idx] = { ...newItems[idx], title: e.currentTarget.innerText }
                                    onEdit?.(data.id, 'items', newItems)
                                }}
                                suppressContentEditableWarning
                            >
                                {item.title}
                            </h3>
                            <p
                                className="text-white/40 leading-relaxed font-light text-sm outline-none"
                                contentEditable={isEditing}
                                onBlur={(e) => {
                                    if (!isEditing) return
                                    const newItems = [...items]
                                    newItems[idx] = { ...newItems[idx], description: e.currentTarget.innerText }
                                    onEdit?.(data.id, 'items', newItems)
                                }}
                                suppressContentEditableWarning
                            >
                                {item.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export const TeamBlock = ({ data, isEditing, onEdit }: BlockProps) => {
    const { title, members = [] } = data.content
    const { accentColor = '#9B00FF' } = data.styles
    return (
        <section className="py-32 px-6 bg-[#050505] relative group/block">
            {isEditing && (
                <div className="absolute top-4 right-4 z-50 opacity-0 group-hover/block:opacity-100 transition-opacity flex gap-2">
                    <button
                        onClick={() => onEdit?.(data.id, 'moveUp', true)}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 p-2 rounded-lg text-white"
                    ><ArrowUp size={14} /></button>
                    <button
                        onClick={() => onEdit?.(data.id, 'moveDown', true)}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 p-2 rounded-lg text-white"
                    ><ArrowDown size={14} /></button>
                    <button
                        onClick={() => onEdit?.(data.id, 'delete', true)}
                        className="bg-red-500/20 hover:bg-red-500/40 backdrop-blur-md border border-red-500/30 p-2 rounded-lg text-red-500"
                    ><Trash2 size={14} /></button>
                </div>
            )}
            <div className="max-w-6xl mx-auto">
                <h2
                    className="text-4xl md:text-5xl font-black text-center mb-20 tracking-tighter uppercase outline-none"
                    contentEditable={isEditing}
                    onBlur={(e) => isEditing && onEdit?.(data.id, 'title', e.currentTarget.innerText)}
                    suppressContentEditableWarning
                >
                    {title}
                </h2>
                <div className="space-y-6">
                    {members.map((m: any, idx: number) => (
                        <div key={idx} className="bg-white/[0.03] border border-white/5 rounded-[40px] p-8 flex flex-col md:flex-row items-center gap-10 hover:border-white/20 transition-all group">
                            <div className="w-48 h-48 rounded-3xl overflow-hidden border-2 border-white/10 shrink-0">
                                <EditableImage
                                    src={m.image}
                                    alt={m.name}
                                    className="w-full h-full grayscale group-hover:grayscale-0 transition-all"
                                    isEditing={!!isEditing}
                                    onUpload={(url) => {
                                        const newMembers = [...members]
                                        newMembers[idx] = { ...newMembers[idx], image: url }
                                        onEdit?.(data.id, 'members', newMembers)
                                    }}
                                />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h4
                                    className="text-2xl font-bold mb-2 outline-none"
                                    contentEditable={isEditing}
                                    onBlur={(e) => {
                                        if (!isEditing) return
                                        const newMembers = [...members]
                                        newMembers[idx] = { ...newMembers[idx], name: e.currentTarget.innerText }
                                        onEdit?.(data.id, 'members', newMembers)
                                    }}
                                    suppressContentEditableWarning
                                >{m.name}</h4>
                                <EditableButton
                                    text={m.buttonText} // Assuming m.buttonText exists for each member
                                    url={m.buttonUrl} // Assuming m.buttonUrl exists for each member
                                    isEditing={!!isEditing}
                                    onUpdate={(text, url) => {
                                        const newMembers = [...members];
                                        newMembers[idx] = { ...newMembers[idx], buttonText: text, buttonUrl: url };
                                        onEdit?.(data.id, 'members', newMembers);
                                    }}
                                    styleClass={`relative px-8 py-4 rounded-full font-bold text-white transition-all hover:scale-105 hover:shadow-2xl shadow-${accentColor}/20`}
                                />
                                <p
                                    className="text-[#00FF88] text-sm font-bold uppercase tracking-widest mb-4 outline-none"
                                    style={{ color: accentColor }}
                                    contentEditable={isEditing}
                                    onBlur={(e) => {
                                        if (!isEditing) return
                                        const newMembers = [...members]
                                        newMembers[idx] = { ...newMembers[idx], role: e.currentTarget.innerText }
                                        onEdit?.(data.id, 'members', newMembers)
                                    }}
                                    suppressContentEditableWarning
                                >{m.role}</p>
                                <div className="flex flex-wrap gap-6 mb-6 opacity-40 text-[10px] font-black uppercase tracking-widest justify-center md:justify-start">
                                    <span>Rev. Closed: {m.rev}</span>
                                    <span>Rating: {m.rating} ★</span>
                                    <span>Location: {m.location}</span>
                                </div>
                                <div className="flex gap-4 justify-center md:justify-start">
                                    <EditableButton
                                        text={m.secondaryButtonText || 'View Profile'}
                                        url={m.secondaryButtonUrl}
                                        isEditing={!!isEditing}
                                        onUpdate={(text, url) => {
                                            const newMembers = [...members]
                                            newMembers[idx] = { ...newMembers[idx], secondaryButtonText: text, secondaryButtonUrl: url }
                                            onEdit?.(data.id, 'members', newMembers)
                                        }}
                                        styleClass="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white hover:text-black transition-all"
                                    />
                                    <EditableButton
                                        text={m.primaryButtonText || 'Schedule'}
                                        url={m.primaryButtonUrl}
                                        isEditing={!!isEditing}
                                        onUpdate={(text, url) => {
                                            const newMembers = [...members]
                                            newMembers[idx] = { ...newMembers[idx], primaryButtonText: text, primaryButtonUrl: url }
                                            onEdit?.(data.id, 'members', newMembers)
                                        }}
                                        styleClass="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white hover:text-black transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export const PricingBlock = ({ data, isEditing, onEdit }: BlockProps) => {
    const { title, subtitle, tiers = [] } = data.content
    const { accentColor = '#00FF88' } = data.styles

    return (
        <section className="py-32 px-6 bg-[#050505] relative group/block">
            {isEditing && (
                <div className="absolute top-4 right-4 z-50 opacity-0 group-hover/block:opacity-100 transition-opacity flex gap-2">
                    <button
                        onClick={() => onEdit?.(data.id, 'moveUp', true)}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 p-2 rounded-lg text-white"
                    ><ArrowUp size={14} /></button>
                    <button
                        onClick={() => onEdit?.(data.id, 'moveDown', true)}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 p-2 rounded-lg text-white"
                    ><ArrowDown size={14} /></button>
                    <button
                        onClick={() => onEdit?.(data.id, 'delete', true)}
                        className="bg-red-500/20 hover:bg-red-500/40 backdrop-blur-md border border-red-500/30 p-2 rounded-lg text-red-500"
                    ><Trash2 size={14} /></button>
                </div>
            )}
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-20">
                    <h2
                        className="text-4xl md:text-5xl font-black mb-6 tracking-tighter uppercase outline-none"
                        contentEditable={isEditing}
                        onBlur={(e) => isEditing && onEdit?.(data.id, 'title', e.currentTarget.innerText)}
                        suppressContentEditableWarning
                    >
                        {title}
                    </h2>
                    <p
                        className="text-white/40 font-light outline-none"
                        contentEditable={isEditing}
                        onBlur={(e) => isEditing && onEdit?.(data.id, 'subtitle', e.currentTarget.innerText)}
                        suppressContentEditableWarning
                    >
                        {subtitle}
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {tiers.map((t: any, i: number) => (
                        <div key={i} className={`p-10 rounded-[48px] border transition-all ${t.featured ? 'bg-white/[0.04] border-[#00FF88]/30 scale-105' : 'bg-white/[0.02] border-white/5'}`}>
                            <span
                                className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 block outline-none"
                                contentEditable={isEditing}
                                onBlur={(e) => {
                                    if (!isEditing) return
                                    const newTiers = [...tiers]
                                    newTiers[i] = { ...newTiers[i], name: e.currentTarget.innerText }
                                    onEdit?.(data.id, 'tiers', newTiers)
                                }}
                                suppressContentEditableWarning
                            >{t.name}</span>
                            <div className="flex items-baseline gap-2 mb-8">
                                <span
                                    className="text-5xl font-black outline-none"
                                    contentEditable={isEditing}
                                    onBlur={(e) => {
                                        if (!isEditing) return
                                        const newTiers = [...tiers]
                                        newTiers[i] = { ...newTiers[i], price: e.currentTarget.innerText }
                                        onEdit?.(data.id, 'tiers', newTiers)
                                    }}
                                    suppressContentEditableWarning
                                >${t.price}</span>
                                <span className="text-white/40 text-sm">/mo</span>
                            </div>
                            <ul className="space-y-4 mb-10">
                                {t.features.map((f: string, idx: number) => (
                                    <li key={idx} className="flex items-center gap-3 text-sm text-white/60">
                                        <Check size={16} className="text-[#00FF88]" />
                                        <span
                                            className="outline-none"
                                            contentEditable={isEditing}
                                            onBlur={(e) => {
                                                if (!isEditing) return
                                                const newFeatures = [...t.features]
                                                newFeatures[idx] = e.currentTarget.innerText
                                                const newTiers = [...tiers]
                                                newTiers[i] = { ...newTiers[i], features: newFeatures }
                                                onEdit?.(data.id, 'tiers', newTiers)
                                            }}
                                            suppressContentEditableWarning
                                        >{f}</span>
                                    </li>
                                ))}
                            </ul>
                            <EditableButton
                                text={t.buttonText}
                                url={t.buttonUrl}
                                isEditing={!!isEditing}
                                onUpdate={(text, url) => {
                                    const newTiers = [...tiers]
                                    newTiers[i] = { ...newTiers[i], buttonText: text, buttonUrl: url }
                                    onEdit?.(data.id, 'tiers', newTiers)
                                }}
                                styleClass={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all ${t.featured ? 'bg-[#00FF88] text-black shadow-[0_0_40px_rgba(0,255,136,0.3)]' : 'bg-white/5 text-white border border-white/10 hover:bg-white hover:text-black'}`}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export const FaqBlock = ({ data, isEditing, onEdit }: BlockProps) => {
    const { title, items = [] } = data.content
    return (
        <section className="py-32 px-6 bg-[#050505] relative group/block">
            {isEditing && (
                <div className="absolute top-4 right-4 z-50 opacity-0 group-hover/block:opacity-100 transition-opacity flex gap-2">
                    <button
                        onClick={() => onEdit?.(data.id, 'moveUp', true)}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 p-2 rounded-lg text-white"
                    ><ArrowUp size={14} /></button>
                    <button
                        onClick={() => onEdit?.(data.id, 'moveDown', true)}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 p-2 rounded-lg text-white"
                    ><ArrowDown size={14} /></button>
                    <button
                        onClick={() => onEdit?.(data.id, 'delete', true)}
                        className="bg-red-500/20 hover:bg-red-500/40 backdrop-blur-md border border-red-500/30 p-2 rounded-lg text-red-500"
                    ><Trash2 size={14} /></button>
                </div>
            )}
            <div className="max-w-3xl mx-auto">
                <h2
                    className="text-4xl font-black text-center mb-20 tracking-tighter uppercase outline-none"
                    contentEditable={isEditing}
                    onBlur={(e) => isEditing && onEdit?.(data.id, 'title', e.currentTarget.innerText)}
                    suppressContentEditableWarning
                >{title}</h2>
                <div className="space-y-4">
                    {items.map((item: any, i: number) => (
                        <div key={i} className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 hover:border-white/20 transition-all cursor-pointer group flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <h4
                                    className="text-lg font-bold text-white/80 group-hover:text-white transition-colors outline-none"
                                    contentEditable={isEditing}
                                    onBlur={(e) => {
                                        if (!isEditing) return
                                        const newItems = [...items]
                                        newItems[i] = { ...newItems[i], question: e.currentTarget.innerText }
                                        onEdit?.(data.id, 'items', newItems)
                                    }}
                                    suppressContentEditableWarning
                                >{item.question}</h4>
                                <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:border-white/30 transition-all shrink-0">
                                    <ChevronDown size={18} className="text-white/40" />
                                </div>
                            </div>
                            {isEditing && (
                                <p
                                    className="text-white/40 text-sm outline-none"
                                    contentEditable={isEditing}
                                    onBlur={(e) => {
                                        if (!isEditing) return
                                        const newItems = [...items]
                                        newItems[i] = { ...newItems[i], answer: e.currentTarget.innerText }
                                        onEdit?.(data.id, 'items', newItems)
                                    }}
                                    suppressContentEditableWarning
                                >{item.answer || 'Escribe la respuesta aquí...'}</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export const NDTFeaturesBlock = ({ data, isEditing, onEdit }: BlockProps) => {
    const { badge, title, subtitle, items = [] } = data.content
    const { accentColor = '#00F0FF' } = data.styles

    return (
        <section className="relative py-32 px-6 bg-[#050505] overflow-hidden">
            <HexPattern />
            <div className="max-w-6xl mx-auto relative z-10 flex flex-col md:flex-row gap-20">
                {/* Lado izquierdo: Gráfico visual */}
                <div className="flex-1 relative">
                    <div className="absolute -inset-20 bg-[#00F0FF]/5 blur-3xl rounded-full" />
                    <div className="relative bg-white/5 border border-white/10 rounded-3xl p-12 aspect-[4/3] flex flex-col justify-end overflow-hidden">
                        {/* Fake Graph Lines */}
                        <div className="absolute bottom-12 left-12 right-12 h-px bg-white/20" />
                        <div className="absolute bottom-12 left-12 top-12 w-px bg-white/20" />
                        <svg className="w-full h-full absolute inset-0 p-12 overflow-visible" viewBox="0 0 400 300">
                            <path d="M 0 280 Q 150 250 250 80 T 400 20" stroke="#00F0FF" strokeWidth="4" fill="none" className="drop-shadow-[0_0_10px_#00F0FF]" />
                        </svg>
                        {/* Floating Labels */}
                        <div className="absolute top-20 right-20 bg-[#00F0FF] text-black text-[10px] font-black px-3 py-1 rounded-full animate-bounce">
                            FATURANDO 5 DÍGITOS
                        </div>
                    </div>
                </div>

                {/* Lado derecho: Lista */}
                <div className="flex-1">
                    <span className="text-[#00F0FF] text-[10px] font-black uppercase tracking-[0.3em] mb-4 block">
                        {badge}
                    </span>
                    <h2
                        className="text-4xl font-black mb-6 tracking-tighter uppercase leading-tight"
                        contentEditable={isEditing}
                        onBlur={(e) => isEditing && onEdit?.(data.id, 'title', e.currentTarget.innerText)}
                        suppressContentEditableWarning
                    >
                        {title}
                    </h2>
                    <p
                        className="text-white/60 mb-10 text-lg leading-relaxed"
                        contentEditable={isEditing}
                        onBlur={(e) => isEditing && onEdit?.(data.id, 'subtitle', e.currentTarget.innerText)}
                        suppressContentEditableWarning
                    >
                        {subtitle}
                    </p>

                    <ul className="space-y-6">
                        {items.map((item: string, idx: number) => (
                            <Deletable
                                key={idx}
                                isEditing={!!isEditing}
                                onDelete={() => {
                                    const newItems = items.filter((_: any, i: number) => i !== idx)
                                    onEdit?.(data.id, 'items', newItems)
                                }}
                            >
                                <li className="flex gap-4 items-start group">
                                    <div className="mt-1 w-6 h-6 rounded-full bg-[#00F0FF]/20 border border-[#00F0FF]/40 flex items-center justify-center shrink-0 group-hover:bg-[#00F0FF] group-hover:text-black transition-all">
                                        <Check size={14} />
                                    </div>
                                    <span
                                        className="text-white text-base leading-tight font-medium"
                                        contentEditable={isEditing}
                                        onBlur={(e) => {
                                            if (!isEditing) return
                                            const newItems = [...items]
                                            newItems[idx] = e.currentTarget.innerText
                                            onEdit?.(data.id, 'items', newItems)
                                        }}
                                        suppressContentEditableWarning
                                    >
                                        {item}
                                    </span>
                                </li>
                            </Deletable>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    )
}

export const NDTSkinBlock = ({ data, isEditing, onEdit }: BlockProps) => {
    const { badge, title, buttonText, image } = data.content
    const { accentColor = '#00F0FF' } = data.styles

    return (
        <section className="relative pt-32 pb-10 px-6 bg-[#050505] overflow-hidden">
            <HexPattern />
            <div className="max-w-6xl mx-auto relative z-10 flex flex-col md:flex-row items-center gap-20">
                <div className="flex-1">
                    {badge && (
                        <Deletable isEditing={!!isEditing} onDelete={() => onEdit?.(data.id, 'badge', null)}>
                            <span className="text-[#00F0FF] text-[10px] font-black uppercase tracking-[0.3em] mb-6 block">
                                {badge}
                            </span>
                        </Deletable>
                    )}
                    <h2
                        className="text-2xl md:text-3xl font-black mb-12 tracking-tight uppercase leading-[1.3]"
                        contentEditable={isEditing}
                        onBlur={(e) => isEditing && onEdit?.(data.id, 'title', e.currentTarget.innerText)}
                        suppressContentEditableWarning
                    >
                        {title}
                    </h2>
                    <EditableButton
                        text={buttonText}
                        url={data.content.buttonUrl}
                        isEditing={!!isEditing}
                        onUpdate={(text, url) => {
                            onEdit?.(data.id, 'buttonText', text)
                            onEdit?.(data.id, 'buttonUrl', url)
                        }}
                        styleClass="relative bg-[#00F0FF] text-black px-12 py-6 rounded-lg font-black text-sm uppercase tracking-widest shadow-[0_0_50px_rgba(0,240,255,0.3)] hover:scale-105 transition-all"
                        className="relative group"
                    />
                </div>

                <div className="flex-1 relative w-full max-w-[500px]">
                    <div className="absolute -inset-10 bg-[#00F0FF]/10 blur-3xl rounded-full" />
                    {image && (
                        <Deletable isEditing={!!isEditing} onDelete={() => onEdit?.(data.id, 'image', null)}>
                            <EditableImage
                                src={image}
                                alt="Expert"
                                className="relative z-10 w-full rounded-2xl grayscale contrast-125"
                                isEditing={!!isEditing}
                                onUpload={(url) => onEdit?.(data.id, 'image', url)}
                            />
                        </Deletable>
                    )}

                    {/* Glass Chat Overlay */}
                    <Deletable isEditing={!!isEditing} onDelete={() => onEdit?.(data.id, 'showChat', false)} className="absolute bottom-10 left-[-40px] z-20">
                        <div className="w-72 bg-white/[0.03] backdrop-blur-3xl border border-white/10 p-6 rounded-[32px] shadow-2xl animate-in slide-in-from-left-4 duration-1000">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20" />
                                <div className="h-2 w-20 bg-white/20 rounded-full" />
                            </div>
                            <div className="space-y-2">
                                <div className="h-2 w-full bg-[#00F0FF]/40 rounded-full" />
                                <div className="h-2 w-2/3 bg-white/10 rounded-full" />
                            </div>
                        </div>
                    </Deletable>
                </div>
            </div>
        </section>
    )
}

// ── Raw HTML Block ─────────────────────────────────────────────────────────
function RawHtmlBlock({ data, isEditing }: BlockProps) {
    const html = data.content?.html as string || ''
    return (
        <div style={{ position: 'relative' }}>
            {isEditing && (
                <div style={{
                    position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(210,3,221,0.12)', border: '1px solid rgba(210,3,221,0.3)',
                    borderRadius: 9999, padding: '4px 16px', fontSize: 11, fontWeight: 700,
                    color: '#D203DD', letterSpacing: '0.1em', zIndex: 10, whiteSpace: 'nowrap',
                }}>
                    📄 Página HTML personalizada — edita el código en el panel lateral
                </div>
            )}
            <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
    )
}

const blockComponents: Record<string, React.FC<BlockProps>> = {
    hero: HeroBlock,
    logos: LogoCloudBlock,
    features: FeaturesBlock,
    team: TeamBlock,
    pricing: PricingBlock,
    faq: FaqBlock,
    // underscore variants (canonical)
    ndt_hero: NDTHeroBlock,
    ndt_results: NDTResultsBlock,
    ndt_features: NDTFeaturesBlock,
    ndt_skin: NDTSkinBlock,
    // dash variants (GPT sometimes generates these)
    'ndt-hero': NDTHeroBlock,
    'ndt-results': NDTResultsBlock,
    'ndt-features': NDTFeaturesBlock,
    'ndt-skin': NDTSkinBlock,
    // raw HTML
    raw_html: RawHtmlBlock,
}

export const BlocksRenderer = ({ blocks, isEditing, onEdit }: { blocks: BlockData[], isEditing?: boolean, onEdit?: (id: string, field: string, value: any) => void }) => {
    return (
        <div className="w-full bg-[#050505]">
            {blocks.map((block) => {
                const BlockComponent = blockComponents[block.type]
                if (!BlockComponent) return null

                return (
                    <div key={block.id} className="relative group/wrapper">
                        <BlockComponent data={block} isEditing={isEditing} onEdit={onEdit} />
                    </div>
                )
            })}
        </div>
    )
}
