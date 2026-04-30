import { useState, useRef } from 'react'
import useAppStore from '../store/useAppStore.js'

export default function FrameList() {
  const frames = useAppStore(s => s.frames)
  const selectedFrameId = useAppStore(s => s.selectedFrameId)
  const setSelectedFrameId = useAppStore(s => s.setSelectedFrameId)
  const updateFrameDescription = useAppStore(s => s.updateFrameDescription)
  const removeFrame = useAppStore(s => s.removeFrame)
  const moveFrame = useAppStore(s => s.moveFrame)
  const reorderFrames = useAppStore(s => s.reorderFrames)

  const [deletingId, setDeletingId] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const dragItemRef = useRef(null)

  const fmt = (s) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const handleDelete = (e, frameId, index) => {
    e.stopPropagation()
    
    if (!confirm(`确定要删除第 ${index + 1} 帧吗？`)) {
      return
    }

    setDeletingId(frameId)
    removeFrame(frameId)
    setDeletingId(null)
  }

  const handleMove = (e, frameId, direction) => {
    e.stopPropagation()
    moveFrame(frameId, direction)
  }

  // Drag and Drop handlers
  const handleDragStart = (e, index) => {
    dragItemRef.current = index
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index)
    setTimeout(() => {
      e.target.classList.add('opacity-50')
    }, 0)
  }

  const handleDragEnd = (e) => {
    e.target.classList.remove('opacity-50')
    dragItemRef.current = null
    setDragOverIndex(null)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e, dropIndex) => {
    e.preventDefault()
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'))
    
    if (dragIndex === dropIndex || isNaN(dragIndex)) {
      setDragOverIndex(null)
      return
    }

    // Reorder frames
    const newFrames = [...frames]
    const [removed] = newFrames.splice(dragIndex, 1)
    newFrames.splice(dropIndex, 0, removed)
    reorderFrames(newFrames)
    
    setDragOverIndex(null)
  }

  if (frames.length === 0) {
    return (
      <div className='rounded-2xl border border-dashed border-ink-900/12 bg-paper-100/60 py-8 text-center text-sm text-ink-400'>
        暂无帧
      </div>
    )
  }

  return (
    <div className='max-h-[42vh] space-y-2 overflow-y-auto pr-1 scrollbar-thin'>
      {frames.map((frame, index) => (
        <div
          key={frame.frameId}
          draggable
          onDragStart={(e) => handleDragStart(e, index)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          className={`group flex cursor-move gap-3 rounded-2xl border p-2 transition-all
            ${selectedFrameId === frame.frameId
              ? 'border-umber-400 bg-umber-50/70 shadow-soft'
              : 'border-ink-900/8 bg-paper-100/50 hover:bg-paper-50 hover:border-ink-900/14'}
            ${dragOverIndex === index ? 'ring-2 ring-umber-400 ring-offset-2 ring-offset-paper-50' : ''}
            ${dragItemRef.current === index ? 'opacity-50' : ''}`}
          onClick={() => setSelectedFrameId(frame.frameId)}
          title={`第 ${index + 1} 帧 - 拖拽可调整顺序`}
        >
          {/* 序号和移动按钮 */}
          <div className='flex flex-col items-center justify-center gap-1'>
            <span className='w-6 rounded-full bg-ink-900/80 py-0.5 text-center font-mono text-[10px] text-paper-50'>{String(index + 1).padStart(2, '0')}</span>
            
            {/* 上移按钮 */}
            {index > 0 && (
              <button
                className='flex h-5 w-5 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-paper-200 hover:text-ink-900'
                onClick={(e) => handleMove(e, frame.frameId, 'left')}
                title='上移'
              >
                ↑
              </button>
            )}
            
            {/* 下移按钮 */}
            {index < frames.length - 1 && (
              <button
                className='flex h-5 w-5 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-paper-200 hover:text-ink-900'
                onClick={(e) => handleMove(e, frame.frameId, 'right')}
                title='下移'
              >
                ↓
              </button>
            )}
          </div>

          {/* Thumbnail */}
          <img
            src={`data:image/jpeg;base64,${frame.base64Image}`}
            alt={`Frame ${index + 1}`}
            className='h-12 w-20 flex-shrink-0 rounded-xl object-cover pointer-events-none ring-1 ring-ink-900/10'
            draggable={false}
          />

          {/* Info */}
          <div className='flex-1 min-w-0'>
            <div className='flex items-center justify-between mb-1'>
              <span className='font-mono text-[11px] text-ink-400'>{fmt(frame.timestamp)}</span>
              <button
                onClick={(e) => handleDelete(e, frame.frameId, index)}
                disabled={deletingId === frame.frameId}
                className={`rounded px-1 text-[11px] text-ink-400 transition-colors hover:text-clay-500
                  ${deletingId === frame.frameId ? 'opacity-50' : ''}`}
              >
                {deletingId === frame.frameId ? '删除中...' : '删除'}
              </button>
            </div>
            <input
              type='text'
              placeholder='添加描述（可选）...'
              value={frame.description || ''}
              onChange={(e) => updateFrameDescription(frame.frameId, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className='w-full border-b border-transparent bg-transparent text-xs text-ink-700 outline-none transition-colors placeholder:text-ink-400 focus:border-umber-400'
            />
          </div>
        </div>
      ))}
    </div>
  )
}
