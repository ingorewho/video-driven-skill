import { useEffect, useRef, useState } from 'react'
import useAppStore from '../store/useAppStore.js'
import { generateSkill } from '../api/client.js'

export default function AIProcessor() {
  const videoId = useAppStore(s => s.videoId)
  const frames = useAppStore(s => s.frames)
  const requirement = useAppStore(s => s.requirement)
  const isGenerating = useAppStore(s => s.isGenerating)
  const setIsGenerating = useAppStore(s => s.setIsGenerating)
  const setSkill = useAppStore(s => s.setSkill)
  const setActiveTab = useAppStore(s => s.setActiveTab)

  const [logs, setLogs] = useState([])
  const [error, setError] = useState(null)
  const [showModelConfig, setShowModelConfig] = useState(false)
  const [aiBaseUrl, setAiBaseUrl] = useState('')
  const [aiModel, setAiModel] = useState('')
  const [aiApiKey, setAiApiKey] = useState('')
  const esRef = useRef(null)

  const canGenerate = frames.length > 0 && requirement.trim().length > 0 && !isGenerating

  useEffect(() => {
    setAiBaseUrl(localStorage.getItem('vds.aiBaseUrl') || '')
    setAiModel(localStorage.getItem('vds.aiModel') || '')
  }, [])

  useEffect(() => {
    if (aiBaseUrl.trim()) localStorage.setItem('vds.aiBaseUrl', aiBaseUrl.trim())
    else localStorage.removeItem('vds.aiBaseUrl')
  }, [aiBaseUrl])

  useEffect(() => {
    if (aiModel.trim()) localStorage.setItem('vds.aiModel', aiModel.trim())
    else localStorage.removeItem('vds.aiModel')
  }, [aiModel])

  const handleGenerate = async () => {
    if (!canGenerate) return
    setError(null)
    setLogs([])
    setIsGenerating(true)

    // 生成 sessionId，先建立 SSE 连接
    const sessionId = crypto.randomUUID()

    await new Promise((resolve) => {
      const es = new EventSource(`/api/skills/logs/${sessionId}`)
      esRef.current = es

      es.onopen = () => resolve()  // SSE 连接建立后再发请求

      es.onmessage = (e) => {
        setLogs(prev => [...prev, e.data])
      }

      es.onerror = () => {
        es.close()
        resolve()  // 出错也继续
      }

      // 兜底：500ms 后也继续
      setTimeout(resolve, 500)
    })

    try {
      const skill = await generateSkill({
        videoId,
        requirement,
        sessionId,
        aiConfig: {
          baseUrl: aiBaseUrl.trim(),
          model: aiModel.trim(),
          apiKey: aiApiKey.trim(),
        },
        frames: frames.map(f => ({
          frameId: f.frameId,
          timestamp: f.timestamp,
          base64Image: f.base64Image,
          description: f.description || '',
          annotationJson: f.annotationJson || '',
        })),
      })
      setSkill(skill.skillId, skill.skillName, skill.files, skill.variables)
      setActiveTab('skill')
    } catch (e) {
      setError(e.message)
    } finally {
      setIsGenerating(false)
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
    }
  }

  return (
    <div className='space-y-3'>
      <div className='rounded-2xl border border-ink-900/8 bg-paper-100/60 p-3'>
        <button
          type='button'
          onClick={() => setShowModelConfig(v => !v)}
          className='flex w-full items-center justify-between text-left'
        >
          <span>
            <span className='eyebrow block'>视觉模型配置</span>
            <span className='mt-1 block text-xs text-ink-400'>
              {aiModel.trim() || '使用后端默认模型'}
            </span>
          </span>
          <span className='rounded-full border border-ink-900/10 px-2.5 py-1 text-xs text-ink-500'>
            {showModelConfig ? '收起' : '配置'}
          </span>
        </button>

        {showModelConfig && (
          <div className='mt-3 space-y-2 border-t border-ink-900/8 pt-3'>
            <label className='block'>
              <span className='mb-1 block text-xs text-ink-500'>Base URL</span>
              <input
                value={aiBaseUrl}
                onChange={e => setAiBaseUrl(e.target.value)}
                placeholder='https://dashscope.aliyuncs.com/compatible-mode/v1'
                className='w-full rounded-xl border border-ink-900/10 bg-paper-50 px-3 py-2 font-mono text-xs text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-umber-400'
              />
            </label>
            <label className='block'>
              <span className='mb-1 block text-xs text-ink-500'>视觉模型</span>
              <input
                value={aiModel}
                onChange={e => setAiModel(e.target.value)}
                placeholder='qwen3-vl-plus'
                className='w-full rounded-xl border border-ink-900/10 bg-paper-50 px-3 py-2 font-mono text-xs text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-umber-400'
              />
            </label>
            <label className='block'>
              <span className='mb-1 block text-xs text-ink-500'>API Key</span>
              <input
                value={aiApiKey}
                onChange={e => setAiApiKey(e.target.value)}
                placeholder='不填写则使用后端 .env 的 AI_API_KEY'
                type='password'
                autoComplete='off'
                className='w-full rounded-xl border border-ink-900/10 bg-paper-50 px-3 py-2 font-mono text-xs text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-umber-400'
              />
            </label>
            <p className='text-[11px] leading-relaxed text-ink-400'>
              Base URL 和模型名会保存在本机浏览器；API Key 只在本次页面会话中保存，并随生成请求发送到本地后端。
            </p>
          </div>
        )}
      </div>

      <button
        onClick={handleGenerate}
        disabled={!canGenerate}
        className={`w-full rounded-2xl py-3.5 text-base font-semibold transition-all
          ${canGenerate
            ? 'cursor-pointer bg-ink-900 text-paper-50 shadow-soft hover:-translate-y-0.5 hover:bg-umber-600 hover:shadow-ember-glow'
            : 'cursor-not-allowed bg-paper-200/70 text-ink-400'}`}
      >
        {isGenerating ? (
          <span className='flex items-center justify-center gap-2'>
            <span className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
            AI 正在分析...
          </span>
        ) : '生成 Skill'}
      </button>

      {!frames.length && (
        <p className='text-center text-xs text-ink-400'>请先提取帧</p>
      )}
      {frames.length > 0 && !requirement.trim() && (
        <p className='text-center text-xs text-ink-400'>请填写用户诉求</p>
      )}

      {/* 日志输出区 */}
      {(logs.length > 0 || isGenerating) && (
        <div className='max-h-48 space-y-1 overflow-y-auto rounded-2xl border border-ink-900/10 bg-ink-900 p-3'>
          {logs.map((line, i) => (
            <div key={i} className='font-mono text-xs leading-relaxed text-paper-200'>
              {line}
            </div>
          ))}
          {isGenerating && (
            <div className='font-mono text-xs text-paper-400 animate-pulse'>▌</div>
          )}
        </div>
      )}

      {error && (
        <div className='rounded-xl border border-clay-500/30 bg-clay-500/10 px-3 py-2 text-sm text-clay-700'>
          {error}
        </div>
      )}
    </div>
  )
}
