import React, { useState } from 'react'
import axios from 'axios'

export default function DynamicForm({ model }: any){
  const [form, setForm] = useState<any>({})

  const submit = async()=>{
    try{
      const resp = await axios.post('/api/' + model.name, form, { withCredentials: true })
      alert('Created ' + JSON.stringify(resp.data))
    }catch(e){
      alert('Error creating')
    }
  }

  return (
    <div className="my-4">
      <h4 className="font-medium">Create {model.name}</h4>
      <div className="flex gap-2 mt-2">
        {(model.fields || []).map((f:any)=>(
          <input key={f.name} placeholder={f.name} onChange={e=>setForm({...form,[f.name]: e.target.value})} className="border px-2 py-1" />
        ))}
        <button onClick={submit} className="px-3 py-1 bg-blue-600 text-white rounded">Create</button>
      </div>
    </div>
  )
}
