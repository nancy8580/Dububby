import React, {useEffect, useState} from 'react'
import axios from 'axios'
import DynamicForm from '../components/DynamicForm'
import DynamicTable from '../components/DynamicTable'
import PublishModel from '../components/PublishModel'

type ModelDef = any

export default function AdminModels(){
  const [models, setModels] = useState<ModelDef[]>([])
  const [selected, setSelected] = useState<ModelDef | null>(null)

  const loadModels = async()=>{
    try{
      const r = await axios.get('/admin/models/list', { withCredentials: true })
      setModels(r.data.models || [])
    }catch{
      setModels([{ name: 'Product' }])
    }
  }

  useEffect(()=>{ loadModels() }, [])

  return (
    <div>
      <PublishModel onPublished={()=>{
        loadModels()
      }} />
      <section className="mb-6">
        <h2 className="text-xl font-semibold">Models</h2>
        <div className="mt-2 flex gap-2">
          {models.map(m=> (
            <button key={m.name} className="px-3 py-1 bg-slate-200 rounded" onClick={()=>setSelected(m)}>{m.name}</button>
          ))}
        </div>
      </section>

      <section>
        {selected ? (
          <>
            <h3 className="text-lg">{selected.name}</h3>
            <DynamicForm model={selected} />
            <DynamicTable model={selected} />
          </>
        ) : <div>Select a model</div>}
      </section>
    </div>
  )
}
