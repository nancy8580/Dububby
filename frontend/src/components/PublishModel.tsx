import React, { useMemo, useState } from 'react'
import { api } from '../utils/api'

type Props = { onPublished?: (modelName: string) => void }

export default function PublishModel({ onPublished }: Props){
  const [name, setName] = useState('')
  const [fieldsJson, setFieldsJson] = useState('[{"name":"title","type":"string","required":true}]')
  const [ownerField, setOwnerField] = useState('ownerId')
  const [role, setRole] = useState('Admin')
  const [userId, setUserId] = useState('user-1')
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fieldsIsValid = useMemo(()=>{
    try { JSON.parse(fieldsJson); return true } catch { return false }
  }, [fieldsJson])

  const makeToken = async () => {
    try{
      setLoading(true)
      // backend sets a session cookie for the user/role
      await api.post('/admin/login', { userId, role })
      setToken('session-set')
      alert('Session created for ' + userId + ' as ' + role)
    }catch(e){
      alert('Failed to set session')
    }finally{ setLoading(false) }
  }

  const publish = async () => {
    try{
      setError(null)
      const fields = JSON.parse(fieldsJson)
      const payload = { name, fields, ownerField, rbac: { Admin: ['all'], Manager: ['create','read','update'], Viewer: ['read'] } }
      setLoading(true)
      await api.post('/admin/models/publish', payload)
      alert('Published model ' + name)
      onPublished?.(name)
      setName('')
    }catch(err:any){
      const msg = (err?.response?.data?.error || err?.message || err)
      setError(String(msg))
      alert('Publish failed: ' + msg)
    }finally{ setLoading(false) }
  }

  return (
    <div className="card mb-6">
      <h4 className="text-lg font-semibold">Publish Model</h4>
      {error && <div className="mt-2 text-sm rounded-md px-3 py-2 bg-red-50 text-red-700 border border-red-200">{error}</div>}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-xs mb-1 text-gray-600">Model name</span>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Product" className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
        </label>
        <label className="block">
          <span className="block text-xs mb-1 text-gray-600">Owner field (optional)</span>
          <input value={ownerField} onChange={e=>setOwnerField(e.target.value)} placeholder="ownerId" className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
        </label>
        <label className="block md:col-span-2">
          <div className="flex items-center justify-between">
            <span className="block text-xs mb-1 text-gray-600">Fields JSON</span>
            {!fieldsIsValid && <span className="text-xs text-red-600">Invalid JSON</span>}
          </div>
          <textarea value={fieldsJson} onChange={e=>setFieldsJson(e.target.value)} className="h-36 w-full border rounded-md px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
        </label>

        <div className="md:col-span-2">
          <div className="flex flex-wrap gap-2 items-center">
            <input value={userId} onChange={e=>setUserId(e.target.value)} className="border px-3 py-2 rounded-md" placeholder="session userId" />
            <select value={role} onChange={e=>setRole(e.target.value)} className="border px-3 py-2 rounded-md">
              <option>Admin</option>
              <option>Manager</option>
              <option>Viewer</option>
            </select>
            <button onClick={makeToken} className="btn" disabled={loading}>{loading ? '...' : 'Set Session'}</button>
            <div className="text-xs break-all muted">{token}</div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Set a session to authenticate API calls. Use Admin to publish models.</p>
        </div>

        <div className="md:col-span-2 flex justify-end gap-2">
          <button onClick={publish} className="btn disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading || !name || !fieldsIsValid}>Publish</button>
        </div>
      </div>
    </div>
  )
}
