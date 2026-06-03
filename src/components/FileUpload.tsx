'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, FileText, Loader2 } from 'lucide-react'
import { cn, formatBytes } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const BUCKET = 'portal-jurua-files'
const MAX_SIZE = 50 * 1024 * 1024 // 50 MB

interface FileUploadProps {
  folder: string
  accept?: string
  label?: string
  onUploaded: (path: string, fileName: string, size: number) => void
  onError?: (msg: string) => void
  className?: string
}

export function FileUpload({
  folder,
  accept = '*/*',
  label = 'Clique ou arraste o arquivo aqui',
  onUploaded,
  onError,
  className,
}: FileUploadProps) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const validate = (f: File): string | null => {
    if (f.size > MAX_SIZE) return `Arquivo muito grande. Máximo permitido: 50 MB.`
    return null
  }

  const upload = useCallback(async (f: File) => {
    const err = validate(f)
    if (err) {
      onError?.(err)
      return
    }

    setFile(f)
    setUploading(true)
    setProgress(0)

    const supabase = createClient()
    const ext = f.name.split('.').pop()
    const uniqueName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const path = `${folder}/${uniqueName}`

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, f, {
        cacheControl: '3600',
        upsert: false,
      })

    setUploading(false)

    if (error) {
      setFile(null)
      onError?.(error.message)
      return
    }

    setProgress(100)
    onUploaded(path, f.name, f.size)
  }, [folder, onUploaded, onError])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) upload(f)
  }, [upload])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) upload(f)
  }

  const clear = () => {
    setFile(null)
    setProgress(0)
    if (inputRef.current) inputRef.current.value = ''
  }

  if (file && !uploading) {
    return (
      <div className={cn('flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3', className)}>
        <FileText className="h-5 w-5 shrink-0 text-green-600" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-green-800">{file.name}</p>
          <p className="text-xs text-green-600">{formatBytes(file.size)}</p>
        </div>
        <button onClick={clear} className="shrink-0 text-green-500 hover:text-green-700">
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div
      onClick={() => !uploading && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors',
        dragging
          ? 'border-blue-400 bg-blue-50'
          : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50',
        uploading && 'pointer-events-none opacity-70',
        className
      )}
    >
      {uploading ? (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-600">Enviando…</p>
        </>
      ) : (
        <>
          <Upload className="h-8 w-8 text-gray-400" />
          <p className="text-sm font-medium text-gray-700">{label}</p>
          <p className="text-xs text-gray-500">Máximo 50 MB</p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  )
}
