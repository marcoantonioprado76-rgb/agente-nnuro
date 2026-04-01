'use client'

import React, { useCallback, useRef, useState } from 'react'
import { ImagePlus, X, Loader2, Upload, GripVertical } from 'lucide-react'

interface ImageUploadProps {
  value: string[]
  onChange: (urls: string[]) => void
  max?: number
  bucket: 'store-products' | 'store-qr'
  label?: string
  className?: string
}

export function ImageUpload({
  value,
  onChange,
  max = 4,
  bucket,
  label,
  className = '',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      alert('Solo se permiten imágenes JPG, PNG, WebP o GIF')
      return null
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede exceder 5MB')
      return null
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', bucket)

    // Simulate progress
    setProgress(0)
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 15, 90))
    }, 200)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Error al subir imagen')
        return null
      }

      const data = await res.json()
      return data.url
    } catch {
      clearInterval(progressInterval)
      alert('Error de conexión al subir imagen')
      return null
    }
  }, [bucket])

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const available = max - value.length
    if (available <= 0) return
    const toUpload = fileArray.slice(0, available)

    for (let i = 0; i < toUpload.length; i++) {
      setUploading(value.length + i)
      setProgress(0)
      const url = await uploadFile(toUpload[i])
      if (url) {
        value = [...value, url]
        onChange(value)
      }
    }
    setUploading(null)
    setProgress(0)
  }, [value, max, onChange, uploadFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const handleReorder = (from: number, to: number) => {
    const newArr = [...value]
    const [moved] = newArr.splice(from, 1)
    newArr.splice(to, 0, moved)
    onChange(newArr)
  }

  const canAdd = value.length < max && uploading === null

  return (
    <div className={className}>
      {label && (
        <p className="text-sm text-gray-400 mb-2">{label}</p>
      )}

      {/* Preview grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {value.map((url, i) => (
            <div
              key={url + i}
              className="relative group aspect-square rounded-lg overflow-hidden border border-[#1a2744] bg-[#080d1a]"
            >
              <img
                src={url}
                alt={`Imagen ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {value.length > 1 && i > 0 && (
                  <button
                    type="button"
                    onClick={() => handleReorder(i, i - 1)}
                    className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
                    title="Mover antes"
                  >
                    <GripVertical className="h-3.5 w-3.5 text-white" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  className="h-7 w-7 rounded-full bg-red-500/80 flex items-center justify-center hover:bg-red-500"
                  title="Eliminar"
                >
                  <X className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
              {i === 0 && value.length > 1 && (
                <span className="absolute top-1 left-1 text-[9px] bg-cyan-500 text-black px-1.5 py-0.5 rounded font-bold">
                  PRINCIPAL
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      {canAdd && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            relative cursor-pointer rounded-xl border-2 border-dashed transition-all
            flex flex-col items-center justify-center py-8 px-4 text-center
            ${dragOver
              ? 'border-cyan-400 bg-cyan-400/10'
              : 'border-[#1a2744] bg-[#080d1a] hover:border-[#2a3f66] hover:bg-[#0c1425]'
            }
          `}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 mb-3">
            <ImagePlus className="h-6 w-6 text-cyan-400" />
          </div>
          <p className="text-sm text-gray-300 font-medium">
            {dragOver ? 'Suelta la imagen aquí' : 'Arrastra una imagen o haz clic para seleccionar'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            JPG, PNG, WebP o GIF • Max 5MB • {value.length}/{max}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple={max - value.length > 1}
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFiles(e.target.files)
                e.target.value = ''
              }
            }}
          />
        </div>
      )}

      {/* Upload progress */}
      {uploading !== null && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-cyan-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Subiendo imagen...</span>
          </div>
          <div className="h-2 rounded-full bg-[#1a2744] overflow-hidden">
            <div
              className="h-full bg-cyan-400 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Single image upload (for QR)
interface SingleImageUploadProps {
  value: string
  onChange: (url: string) => void
  bucket: 'store-products' | 'store-qr'
  label?: string
  className?: string
  placeholder?: string
}

export function SingleImageUpload({
  value,
  onChange,
  bucket,
  label,
  className = '',
  placeholder = 'Arrastra una imagen o haz clic para seleccionar',
}: SingleImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      alert('Solo se permiten imágenes JPG, PNG, WebP o GIF')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede exceder 5MB')
      return
    }

    setUploading(true)
    setProgress(0)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', bucket)

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 15, 90))
    }, 200)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Error al subir imagen')
        return
      }

      const data = await res.json()
      onChange(data.url)
    } catch {
      clearInterval(progressInterval)
      alert('Error de conexión al subir imagen')
    } finally {
      setTimeout(() => {
        setUploading(false)
        setProgress(0)
      }, 500)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  return (
    <div className={className}>
      {label && (
        <p className="text-sm text-gray-400 mb-2">{label}</p>
      )}

      {value ? (
        <div className="relative group rounded-lg overflow-hidden border border-[#1a2744] bg-[#080d1a] max-w-[200px]">
          <img
            src={value}
            alt="Preview"
            className="w-full aspect-square object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
              title="Cambiar"
            >
              <Upload className="h-4 w-4 text-white" />
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="h-8 w-8 rounded-full bg-red-500/80 flex items-center justify-center hover:bg-red-500"
              title="Eliminar"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            relative cursor-pointer rounded-xl border-2 border-dashed transition-all
            flex flex-col items-center justify-center py-6 px-4 text-center max-w-[200px]
            ${dragOver
              ? 'border-cyan-400 bg-cyan-400/10'
              : 'border-[#1a2744] bg-[#080d1a] hover:border-[#2a3f66] hover:bg-[#0c1425]'
            }
          `}
        >
          <ImagePlus className="h-8 w-8 text-gray-600 mb-2" />
          <p className="text-xs text-gray-400">{placeholder}</p>
          <p className="text-[10px] text-gray-600 mt-1">Max 5MB</p>
        </div>
      )}

      {uploading && (
        <div className="mt-2 max-w-[200px] space-y-1">
          <div className="flex items-center gap-2 text-xs text-cyan-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Subiendo...</span>
          </div>
          <div className="h-1.5 rounded-full bg-[#1a2744] overflow-hidden">
            <div
              className="h-full bg-cyan-400 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleFile(e.target.files[0])
            e.target.value = ''
          }
        }}
      />
    </div>
  )
}
