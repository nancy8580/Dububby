import React, {useEffect, useMemo, useState} from 'react'
import { api } from '../utils/api'

export default function DynamicTable({ model }: any){
  const [rows, setRows] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string| null>(null)

  const load = async ()=>{
    setLoading(true)
    setError(null)
    try{
      const r = await api.get('/api/' + model.name)
      setRows(r.data)
    }catch(err:any){
      setRows([])
      setError(err?.response?.data?.error || err?.message || 'Failed to load')
    }finally{
      setLoading(false)
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
      await api.put(`/api/${model.name}/${id}`, editForm)
      await load()
      cancelEdit()
    }catch(err:any){
      alert('Update failed: ' + (err?.response?.data?.error || err?.message || err))
    }
  }

  const removeRow = async(id:string)=>{
    if (!confirm('Delete this record?')) return
    try{
      await api.delete(`/api/${model.name}/${id}`)
      await load()
    }catch(err:any){
      alert('Delete failed: ' + (err?.response?.data?.error || err?.message || err))
    }
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">{model.name} Records</h4>
        <button className="btn" onClick={load} disabled={loading}>{loading? 'Refreshing…' : 'Refresh'}</button>
      </div>

      {error && (
        <div className="mt-3 text-sm rounded-md px-3 py-2 bg-red-50 text-red-700 border border-red-200">{error}</div>
      )}

      <div className="mt-3 border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {columns.map(k=> {
                  const hideOnSmall = ['id'].includes(k) || ['createdAt','updatedAt'].includes(k)
                  return (
                    <th key={k} className={`text-left font-medium text-gray-600 px-3 py-2 border-b ${hideOnSmall? 'hidden sm:table-cell':''}`}>{k}</th>
                  )
                })}
                <th className="text-left font-medium text-gray-600 px-3 py-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-3 py-3 text-gray-500" colSpan={columns.length+1}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-3 py-3 text-gray-500" colSpan={columns.length+1}>No records yet.</td></tr>
              ) : rows.map(r=> {
                const isEditing = editingId === r.id
                return (
                  <tr key={r.id} className="border-t odd:bg-white even:bg-gray-50 align-top">
                    {columns.map(k=> {
                      const readOnly = ['id','createdAt','updatedAt'].includes(k)
                      const hideOnSmall = ['id'].includes(k) || ['createdAt','updatedAt'].includes(k)
                      return (
                        <td key={k} className={`px-3 py-2 ${hideOnSmall? 'hidden sm:table-cell':''}`}>
                          {isEditing && !readOnly
                            ? <input value={editForm[k] ?? ''} onChange={e=> setEditForm((f:any)=> ({...f, [k]: e.target.value}))} className="border px-2 py-1 rounded w-full" />
                            : <span className="text-gray-800">{String(r[k] ?? '')}</span>}
                        </td>
                      )
                    })}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {!isEditing ? (
                        <div className="flex gap-2">
                          <button className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300" onClick={()=>startEdit(r)}>Edit</button>
                          <button className="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700" onClick={()=>removeRow(r.id)}>Delete</button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button className="px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700" onClick={()=>saveEdit(r.id)}>Save</button>
                          <button className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300" onClick={cancelEdit}>Cancel</button>
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
    </div>
  )
}
