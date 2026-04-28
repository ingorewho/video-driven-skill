import useAppStore from '../store/useAppStore.js'

export default function RequirementInput() {
  const requirement = useAppStore(s => s.requirement)
  const setRequirement = useAppStore(s => s.setRequirement)

  return (
    <div className='space-y-2'>
      <label className='text-slate-300 text-sm font-medium'>用户诉求</label>
      <textarea
        value={requirement}
        onChange={(e) => setRequirement(e.target.value)}
        placeholder='描述你想自动化的操作，例如：从公开演示站点收集商品标题并导出表格'
        rows={3}
        className='w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm
          placeholder-slate-500 outline-none focus:border-blue-500 transition-colors resize-none'
      />
    </div>
  )
}
