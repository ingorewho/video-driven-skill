import { useCallback, useEffect, useRef, useState } from 'react'
import {
  blobToRecordingFile,
  formatRecordingDuration,
  formatRecordingSize,
  isScreenRecordingSupported,
  pickRecorderMimeType,
  recordingErrorMessage,
  stopMediaStream,
} from '../utils/screenRecorder.js'

const PHASE = {
  CHECKING: 'checking',
  PICKING: 'picking',
  RECORDING: 'recording',
  PREVIEW: 'preview',
  UPLOADING: 'uploading',
  ERROR: 'error',
}

export default function ScreenRecorderModal({ open, onClose, onUpload }) {
  const [phase, setPhase] = useState(PHASE.CHECKING)
  const [error, setError] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [recordedBlob, setRecordedBlob] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const liveVideoRef = useRef(null)
  const mimeTypeRef = useRef('')
  const startedAtRef = useRef(0)
  const timerRef = useRef(null)
  const previewUrlRef = useRef(null)

  const revokePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setPreviewUrl(null)
  }, [])

  const cleanupCapture = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    recorderRef.current = null
    chunksRef.current = []
    stopMediaStream(streamRef.current)
    streamRef.current = null
    if (liveVideoRef.current) liveVideoRef.current.srcObject = null
    revokePreview()
    setRecordedBlob(null)
    setElapsed(0)
  }, [revokePreview])

  const resetModal = useCallback(() => {
    cleanupCapture()
    setError(null)
    setUploadProgress(0)
    setPhase(PHASE.CHECKING)
  }, [cleanupCapture])

  const handleClose = useCallback(() => {
    if (phase === PHASE.UPLOADING) return
    resetModal()
    onClose()
  }, [onClose, phase, resetModal])

  const finalizeRecording = useCallback(() => {
    const blob = new Blob(chunksRef.current, {
      type: mimeTypeRef.current || 'video/webm',
    })
    if (!blob.size) {
      setError('没有录到有效内容，请重试')
      setPhase(PHASE.ERROR)
      cleanupCapture()
      return
    }
    stopMediaStream(streamRef.current)
    streamRef.current = null
    if (liveVideoRef.current) liveVideoRef.current.srcObject = null
    const url = URL.createObjectURL(blob)
    previewUrlRef.current = url
    setRecordedBlob(blob)
    setPreviewUrl(url)
    setPhase(PHASE.PREVIEW)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [cleanupCapture])

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') return
    recorder.stop()
  }, [])

  const startCapture = useCallback(async () => {
    if (!isScreenRecordingSupported()) {
      setError('录屏需要在 HTTPS 或 localhost 下使用，且浏览器需支持屏幕共享')
      setPhase(PHASE.ERROR)
      return
    }

    cleanupCapture()
    setError(null)
    setPhase(PHASE.PICKING)

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      })
      streamRef.current = stream
      chunksRef.current = []

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream
        liveVideoRef.current.muted = true
        liveVideoRef.current.play().catch(() => {})
      }

      const mimeType = pickRecorderMimeType()
      mimeTypeRef.current = mimeType
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      recorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = finalizeRecording
      recorder.onerror = () => {
        setError('录制过程中出错，请重试')
        setPhase(PHASE.ERROR)
        cleanupCapture()
      }

      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.onended = () => {
          if (recorderRef.current?.state === 'recording') stopRecording()
        }
      }

      recorder.start(1000)
      startedAtRef.current = Date.now()
      setElapsed(0)
      setPhase(PHASE.RECORDING)
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000))
      }, 500)
    } catch (err) {
      if (err?.name === 'NotAllowedError') {
        onClose()
        resetModal()
        return
      }
      setError(recordingErrorMessage(err))
      setPhase(PHASE.ERROR)
      cleanupCapture()
    }
  }, [cleanupCapture, finalizeRecording, onClose, resetModal, stopRecording])

  useEffect(() => {
    if (!open) return undefined
    resetModal()
    startCapture()
    return () => cleanupCapture()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when opened
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape' && phase !== PHASE.UPLOADING) handleClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, phase, handleClose])

  const handleRetake = () => {
    cleanupCapture()
    startCapture()
  }

  const handleConfirmUpload = async () => {
    if (!recordedBlob || !onUpload) return
    const file = blobToRecordingFile(recordedBlob, mimeTypeRef.current)
    setPhase(PHASE.UPLOADING)
    setUploadProgress(0)
    setError(null)
    try {
      await onUpload(file, setUploadProgress)
      resetModal()
      onClose()
    } catch (err) {
      setError(err?.message || '上传失败，请重试')
      setPhase(PHASE.PREVIEW)
    }
  }

  if (!open) return null

  const titleByPhase = {
    [PHASE.PICKING]: '选择共享内容',
    [PHASE.RECORDING]: '正在录制',
    [PHASE.PREVIEW]: '预览录屏',
    [PHASE.UPLOADING]: '上传中',
    [PHASE.ERROR]: '无法录屏',
    [PHASE.CHECKING]: '准备录屏',
  }

  return (
    <div className='fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6'>
      <button
        type='button'
        aria-label='关闭'
        className='absolute inset-0 bg-ink-900/40 backdrop-blur-[4px] animate-fade-in'
        onClick={phase !== PHASE.UPLOADING ? handleClose : undefined}
      />
      <motionDiv
        role='dialog'
        aria-modal='true'
        aria-labelledby='screen-recorder-title'
        className='relative z-10 w-full max-w-[640px] card-paper corner-mark shadow-lift overflow-hidden px-6 py-6 sm:px-8 animate-fade-up'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex items-start justify-between gap-4 mb-5'>
          <div>
            <div className='eyebrow'>Step 01 · Record</div>
            <h2
              id='screen-recorder-title'
              className='font-display text-[26px] text-ink-900 mt-1'
              style={{ fontVariationSettings: "'opsz' 96" }}
            >
              {titleByPhase[phase] || '屏幕录制'}
            </h2>
          </div>
          {phase !== PHASE.UPLOADING && (
            <button
              type='button'
              aria-label='关闭'
              onClick={handleClose}
              className='shrink-0 w-9 h-9 rounded-full border hairline-strong text-ink-500 hover:text-ink-900 hover:bg-paper-200/80 transition-colors'
            >
              <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round'>
                <path d='M18 6L6 18M6 6l12 12' />
              </svg>
            </button>
          )}
        </div>

        {phase === PHASE.PICKING && (
          <div className='py-12 text-center'>
            <span className='inline-block w-8 h-8 rounded-full border-2 border-umber-500/30 border-t-umber-500 animate-spin mb-4' />
            <p className='text-ink-600 text-sm'>请在浏览器弹窗中选择要共享的屏幕、窗口或标签页…</p>
          </div>
        )}

        {phase === PHASE.RECORDING && (
          <RecordingBody liveVideoRef={liveVideoRef} elapsed={elapsed} onStop={stopRecording} />
        )}

        {phase === PHASE.PREVIEW && previewUrl && (
          <PreviewBody
            previewUrl={previewUrl}
            recordedBlob={recordedBlob}
            elapsed={elapsed}
            error={error}
            onRetake={handleRetake}
            onConfirm={handleConfirmUpload}
          />
        )}

        {phase === PHASE.UPLOADING && (
          <div className='py-10 text-center'>
            <RingProgress value={uploadProgress} />
            <div className='mt-4 font-display text-xl text-ink-900'>正在上传录屏</div>
            <p className='mt-1 font-mono text-[11px] text-ink-400 tracking-wider'>{uploadProgress}%</p>
          </div>
        )}

        {phase === PHASE.ERROR && (
          <div className='space-y-4'>
            <div className='rounded-xl border border-clay-500/25 bg-clay-500/10 px-4 py-3 text-sm text-clay-600'>
              {error}
            </div>
            <div className='flex justify-end gap-2'>
              <button type='button' onClick={handleClose} className='btn-ghost'>取消</button>
              <button type='button' onClick={startCapture} className='btn-primary'>重新选择屏幕</button>
            </div>
          </div>
        )}
      </motionDiv>
    </div>
  )
}

function RecordingBody({ liveVideoRef, elapsed, onStop }) {
  return (
    <div className='space-y-4'>
      <div className='relative overflow-hidden rounded-xl border hairline bg-ink-900'>
        <video ref={liveVideoRef} className='w-full max-h-[min(40vh,320px)] object-contain' playsInline />
        <motionDiv className='absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-ink-900/70 px-2.5 py-1 text-[11px] text-paper-50'>
          <span className='h-1.5 w-1.5 rounded-full bg-clay-400' />
          实时预览
        </motionDiv>
      </div>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <span className='relative flex h-2.5 w-2.5'>
            <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-clay-500 opacity-60' />
            <span className='relative inline-flex h-2.5 w-2.5 rounded-full bg-clay-500' />
          </span>
          <span className='font-mono text-sm text-ink-900 tabular-nums'>{formatRecordingDuration(elapsed)}</span>
          <span className='text-ink-400 text-xs'>录制中</span>
        </div>
        <button type='button' onClick={onStop} className='btn-primary'>
          <svg width='12' height='12' viewBox='0 0 24 24' fill='currentColor' aria-hidden>
            <rect x='6' y='6' width='12' height='12' rx='1' />
          </svg>
          <span>停止录制</span>
        </button>
      </div>
      <p className='text-[12px] text-ink-400 leading-relaxed'>
        在浏览器工具栏结束共享也会停止录制。录屏内容仅在您确认后才会上传。
      </p>
    </div>
  )
}

function PreviewBody({ previewUrl, recordedBlob, elapsed, error, onRetake, onConfirm }) {
  return (
    <div className='space-y-4'>
      <video
        src={previewUrl}
        controls
        playsInline
        className='w-full rounded-xl border hairline bg-ink-900/5 max-h-[min(52vh,420px)]'
      />
      <div className='flex flex-wrap gap-4 text-[12px] text-ink-500'>
        <span>时长约 {formatRecordingDuration(elapsed)}</span>
        <span>大小约 {formatRecordingSize(recordedBlob?.size)}</span>
        <span>格式 WebM（上传后由服务端处理）</span>
      </div>
      {error && (
        <div className='rounded-xl border border-clay-500/25 bg-clay-500/10 px-4 py-3 text-sm text-clay-600'>
          {error}
        </div>
      )}
      <div className='flex flex-wrap justify-end gap-2 pt-1'>
        <button type='button' onClick={onRetake} className='btn-ghost'>重新录制</button>
        <button type='button' onClick={onConfirm} className='btn-primary min-w-[140px] justify-center'>
          使用此视频
        </button>
      </div>
    </div>
  )
}

function motionDiv({ className, children, ...props }) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  )
}

function RingProgress({ value }) {
  const c = 2 * Math.PI * 26
  const offset = c - (c * value) / 100
  return (
    <svg width='68' height='68' viewBox='0 0 72 72' className='mx-auto'>
      <circle cx='36' cy='36' r='26' stroke='rgba(31,28,24,0.08)' strokeWidth='2' fill='none' />
      <circle
        cx='36'
        cy='36'
        r='26'
        stroke='var(--umber-500)'
        strokeWidth='2'
        fill='none'
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap='round'
        transform='rotate(-90 36 36)'
        style={{ transition: 'stroke-dashoffset 400ms ease' }}
      />
    </svg>
  )
}
