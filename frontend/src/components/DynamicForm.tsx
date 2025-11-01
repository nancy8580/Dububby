import React, { useMemo, useState } from 'react'
import { api } from '../utils/api'

type Field = { name: string; type: string; required?: boolean }

export default function DynamicForm({ model }: any){
  const [form, setForm] = useState<any>({})
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{type:'success'|'error'; text:string}|null>(null)

  const fields: Field[] = useMemo(()=> (model?.fields || []) as Field[], [model])

  const onChange = (f: Field, value: any)=>{
    setForm((prev:any)=> ({...prev, [f.name]: value}))
  }

  const inputFor = (f: Field)=>{
    const common = 'w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50'
    switch(f.type){
      case 'number':
        return <input inputMode="decimal" type="number" className={common} placeholder={f.name} onChange={e=>onChange(f, e.target.value===''? '' : Number(e.target.value))} />
      case 'boolean':
        return (
          <div className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4" onChange={e=>onChange(f, e.target.checked)} />
            <span className="text-sm text-gray-700">{f.name}</span>
          </div>
        )
      case 'date':
        return <input type="date" className={common} onChange={e=>onChange(f, e.target.value)} />
      default:
        return <input type="text" className={common} placeholder={f.name} onChange={e=>onChange(f, e.target.value)} />
    }
  }

  const submit = async()=>{
    setMessage(null)
    setSubmitting(true)
    try{
      const resp = await api.post('/api/' + model.name, form)
      setMessage({type:'success', text: 'Created successfully'})
      setForm({})
    }catch(e:any){
      setMessage({type:'error', text: e?.response?.data?.error || e?.message || 'Error creating'})
    }finally{
      setSubmitting(false)
    }
  }

  return (
    <div className="my-4">
      <h4 className="font-semibold mb-2">Create {model.name}</h4>
      {message && (
        <div className={`mb-3 text-sm rounded-md px-3 py-2 ${message.type==='success'?'bg-emerald-50 text-emerald-800 border border-emerald-200':'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {fields.map((f)=> (
            <label key={f.name} className="block">
              {f.type !== 'boolean' && (
                <span className="block text-xs mb-1 text-gray-600">{f.name}{f.required && <span className="text-red-500"> *</span>}</span>
              )}
              {inputFor(f)}
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={submit} disabled={submitting} className="btn disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
