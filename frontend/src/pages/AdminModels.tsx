import React, {useEffect, useState} from 'react'
import { api } from '../utils/api'
import DynamicForm from '../components/DynamicForm'
import DynamicTable from '../components/DynamicTable'
import PublishModel from '../components/PublishModel'

type ModelDef = any

export default function AdminModels(){
  const [models, setModels] = useState<ModelDef[]>([])
  const [selected, setSelected] = useState<ModelDef | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadModels = async()=>{
    setLoading(true)
    setError(null)
    try{
      const r = await api.get('/admin/models/list')
      const list = r.data.models || []
      setModels(list)
      if (list.length && !selected) setSelected(list[0])
    }catch(err:any){
      setError(err?.response?.data?.error || err?.message || 'Failed to load models')
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{ loadModels() }, [])

  return (
    <div>
      <PublishModel onPublished={()=>{ loadModels() }} />

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-3">
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-600">Models</h2>
            {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
            <div className="mt-3 flex flex-wrap gap-2">
              {loading ? (
                <div className="text-sm text-gray-500">Loading…</div>
              ) : models.length ? (
                models.map((m)=> (
                  <button
                    key={m.name}
                    className={`px-3 py-1 rounded-md text-sm border ${selected?.name===m.name? 'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-slate-50 hover:bg-slate-100 border-slate-200'}`}
                    onClick={()=>setSelected(m)}
                  >
                    {m.name}
                  </button>
                ))
              ) : (
                <p className="text-sm text-gray-500">No models yet. Publish one above.</p>
              )}
            </div>
          </div>
        </aside>

        <section className="lg:col-span-9">
          {selected ? (
            <>
              <div className="flex items-end justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{selected.name}</h3>
                  <p className="text-sm text-gray-500">Create new records and manage existing ones.</p>
                </div>
              </div>
              <DynamicForm model={selected} />
              <DynamicTable model={selected} />
            </>
          ) : (
            <div className="card"><p className="text-sm text-gray-600">Select a model to manage records.</p></div>
          )}
        </section>
      </section>
    </div>
  )
}
