import React, { useState } from 'react'
import axios from 'axios'

type Props = { onPublished?: (modelName: string) => void }

export default function PublishModel({ onPublished }: Props){
  const [name, setName] = useState('')
  const [fieldsJson, setFieldsJson] = useState('[{"name":"title","type":"string","required":true}]')
  const [ownerField, setOwnerField] = useState('ownerId')
  const [role, setRole] = useState('Admin')
  const [userId, setUserId] = useState('user-1')
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)

  const makeToken = async () => {
    try{
      setLoading(true)
      // backend sets a session cookie for the user/role
      await axios.post('/admin/login', { userId, role }, { withCredentials: true })
      setToken('session-set')
      alert('Session created for ' + userId + ' as ' + role)
    }catch(e){
      alert('Failed to set session')
    }finally{ setLoading(false) }
  }

  const publish = async () => {
    try{
      const fields = JSON.parse(fieldsJson)
      const payload = { name, fields, ownerField, rbac: { Admin: ['all'], Manager: ['create','read','update'], Viewer: ['read'] } }
      setLoading(true)
      await axios.post('/admin/models/publish', payload, { withCredentials: true })
      alert('Published model ' + name)
      onPublished?.(name)
      setName('')
    }catch(err:any){
      alert('Publish failed: ' + (err?.response?.data?.error || err?.message || err))
    }finally{ setLoading(false) }
  }

  return (
    <div className="card mb-4">
      <h4 className="text-lg font-semibold">Publish Model</h4>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Model name" className="w-full" />
        <input value={ownerField} onChange={e=>setOwnerField(e.target.value)} placeholder="ownerField (optional)" className="w-full" />
        <textarea value={fieldsJson} onChange={e=>setFieldsJson(e.target.value)} className="col-span-1 md:col-span-2 h-36 w-full" />

        <div className="flex gap-2 items-center col-span-1 md:col-span-2">
          <input value={userId} onChange={e=>setUserId(e.target.value)} className="border px-2 py-1 rounded" placeholder="session userId" />
          <select value={role} onChange={e=>setRole(e.target.value)} className="border px-2 py-1 rounded">
            <option>Admin</option>
            <option>Manager</option>
            <option>Viewer</option>
          </select>
          <button onClick={makeToken} className="btn" disabled={loading}>{loading ? '...' : 'Set Session'}</button>
          <div className="text-sm break-all muted">{token}</div>
        </div>

        <div className="col-span-1 md:col-span-2 flex justify-end gap-2">
          <button onClick={publish} className="btn" disabled={loading || !name}>Publish</button>
        </div>
      </div>
    </div>
  )
}
