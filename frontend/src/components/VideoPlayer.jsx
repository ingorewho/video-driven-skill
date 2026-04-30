import { useRef, useState, useEffect } from 'react'
import { getVideoStreamUrl } from '../api/client.js'

export default function VideoPlayer({ videoId, duration, onTimeSelect }) {
  const videoRef = useRef()
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)

  const src = getVideoStreamUrl(videoId)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onTime = () => setCurrentTime(video.currentTime)
    video.addEventListener('timeupdate', onTime)
    return () => video.removeEventListener('timeupdate', onTime)
  }, [])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (playing) video.pause()
    else video.play()
    setPlaying(!playing)
  }

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    const time = ratio * duration
    if (videoRef.current) videoRef.current.currentTime = time
    setCurrentTime(time)
  }

  const handleCapture = () => {
    onTimeSelect && onTimeSelect(currentTime)
  }

  const fmt = (s) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className='overflow-hidden rounded-2xl border border-ink-900/10 bg-paper-100 shadow-inset-hair'>
      <div className='relative bg-[#18120b]'>
        <video
          ref={videoRef}
          src={src}
          className='mx-auto block max-h-[68vh] w-full bg-[#18120b] object-contain'
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
        <div className='pointer-events-none absolute inset-0 ring-1 ring-inset ring-paper-50/10' />
      </div>

      <div className='border-t border-ink-900/10 bg-paper-50/95 p-3'>
        <div
          className='relative mb-3 h-2 cursor-pointer overflow-hidden rounded-full bg-ink-900/10'
          onClick={handleSeek}
        >
          <div
            className='h-full rounded-full bg-gradient-to-r from-umber-400 to-umber-600 shadow-[0_0_18px_rgba(154,107,63,0.25)]'
            style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
          />
        </div>

        <div className='flex items-center gap-3'>
          <button
            onClick={togglePlay}
            className='flex h-9 w-9 items-center justify-center rounded-full bg-ink-900 text-paper-50 shadow-soft transition-all hover:-translate-y-0.5 hover:bg-umber-600'
            title={playing ? '暂停' : '播放'}
          >
            {playing ? 'Ⅱ' : '▶'}
          </button>

          <span className='font-mono text-[12px] tabular-nums text-ink-500'>
            {fmt(currentTime)} / {fmt(duration || 0)}
          </span>

          <button
            onClick={handleCapture}
            className='ml-auto rounded-full bg-umber-50 px-4 py-2 text-[13px] font-medium text-umber-700 ring-1 ring-umber-300/50 transition-all hover:-translate-y-0.5 hover:bg-umber-100 hover:ring-umber-400/60'
          >
            截取当前帧
          </button>
        </div>
      </div>
    </div>
  )
}
