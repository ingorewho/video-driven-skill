export function isScreenRecordingSupported() {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getDisplayMedia &&
    typeof MediaRecorder !== 'undefined'
  )
}

export function pickRecorderMimeType() {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ]
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || ''
}

export function blobToRecordingFile(blob, mimeType) {
  const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
  const name = `screen-recording-${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`
  return new File([blob], name, { type: blob.type || mimeType || 'video/webm' })
}

export function stopMediaStream(stream) {
  stream?.getTracks().forEach((track) => track.stop())
}

export function formatRecordingDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatRecordingSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let i = 0
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i += 1
  }
  return `${size.toFixed(1)} ${units[i]}`
}

export function recordingErrorMessage(error) {
  if (!error) return '录屏失败，请重试'
  if (error.name === 'NotAllowedError') return '未授予屏幕共享权限'
  if (error.name === 'NotFoundError') return '没有可用的屏幕或窗口'
  if (error.name === 'NotSupportedError') return '当前浏览器不支持该录屏方式'
  return error.message || '录屏失败，请重试'
}
