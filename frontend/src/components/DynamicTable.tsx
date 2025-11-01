import React, {useEffect, useMemo, useState} from 'react'
import axios from 'axios'

export default function DynamicTable({ model }: any){
  const [rows, setRows] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})

  const load = async ()=>{
    try{
      const r = await axios.get('/api/' + model.name, { withCredentials: true })
      setRows(r.data)
    }catch{
      setRows([])
    }
  }

  useEffect(()=>{ load() }, [model])

  const columns = useMemo(()=>{
    if (rows[0]) return Object.keys(rows[0])
    return ['id', ...(model?.fields?.map((f:any)=>f.name) || [])]
  }, [rows, model])

  const startEdit = (row:any)=>{
    setEditingId(row.id)
    const protectedFields = new Set(['id', 'createdAt', 'updatedAt'])
    const initial: any = {}
    Object.keys(row).forEach(k=>{
      if (!protectedFields.has(k)) initial[k] = row[k]
    })
    setEditForm(initial)
  }

  const cancelEdit = ()=>{
    setEditingId(null)
    setEditForm({})
  }

  const saveEdit = async (id:string)=>{
    try{
      await axios.put(`/api/${model.name}/${id}`, editForm, { withCredentials: true })
      await load()
      cancelEdit()
    }catch(err:any){
      alert('Update failed: ' + (err?.response?.data?.error || err?.message || err))
    }
  }

  const removeRow = async(id:string)=>{
    if (!confirm('Delete this record?')) return
    try{
      await axios.delete(`/api/${model.name}/${id}`, { withCredentials: true })
      await load()
    }catch(err:any){
      alert('Delete failed: ' + (err?.response?.data?.error || err?.message || err))
    }
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{model.name} Records</h4>
        <button className="btn" onClick={load}>Refresh</button>
      </div>
      <div className="mt-2 border rounded p-2 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {columns.map(k=> <th key={k} className="text-left pr-4">{k}</th>)}
              <th className="text-left pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=> {
              const isEditing = editingId === r.id
              return (
                <tr key={r.id} className="border-t align-top">
                  {columns.map(k=> (
                    <td key={k} className="pr-4">
                      {isEditing && !['id','createdAt','updatedAt'].includes(k)
                        ? <input value={editForm[k] ?? ''} onChange={e=> setEditForm((f:any)=> ({...f, [k]: e.target.value}))} className="border px-2 py-1 rounded w-full" />
                        : <span>{String(r[k] ?? '')}</span>}
                    </td>
                  ))}
                  <td className="pr-4 whitespace-nowrap">
                    {!isEditing ? (
                      <div className="flex gap-2">
                        <button className="px-2 py-1 rounded bg-slate-200" onClick={()=>startEdit(r)}>Edit</button>
                        <button className="px-2 py-1 rounded bg-red-600 text-white" onClick={()=>removeRow(r.id)}>Delete</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button className="px-2 py-1 rounded bg-emerald-600 text-white" onClick={()=>saveEdit(r.id)}>Save</button>
                        <button className="px-2 py-1 rounded bg-slate-200" onClick={cancelEdit}>Cancel</button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
