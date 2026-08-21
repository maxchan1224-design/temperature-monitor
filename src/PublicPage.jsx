import { useEffect, useState } from 'react'
import { addDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import RecordTable from './RecordTable'
import { db, firebaseConfigured } from './firebase'
import { parts, recordsCollection, subscribeToRecords } from './records'

const blank = { location: '', temperature: '', inputBy: '', remark: '' }
const EDIT_WINDOW_MS = 10 * 60 * 1000

function getDeviceId() {
  const key = 'temperature-records-device-id'
  let value = localStorage.getItem(key)
  if (!value) {
    value = crypto.randomUUID()
    localStorage.setItem(key, value)
  }
  return value
}

export default function PublicPage() {
  const [form, setForm] = useState(blank)
  const [records, setRecords] = useState([])
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)
  const [now, setNow] = useState(0)
  const [deviceId] = useState(getDeviceId)

  useEffect(() => {
    if (!firebaseConfigured) return
    return subscribeToRecords(setRecords, () => setStatus('Unable to load records.'))
  }, [])
  useEffect(() => {
    const update = () => setNow(Date.now())
    const initial = window.setTimeout(update, 0)
    const timer = window.setInterval(update, 15000)
    return () => { window.clearTimeout(initial); window.clearInterval(timer) }
  }, [])

  const change = ({ target }) => setForm((current) => ({ ...current, [target.name]: target.value }))
  async function submit(event) {
    event.preventDefault()
    const temperature = Number(form.temperature)
    if (!Number.isFinite(temperature) || temperature < 30 || temperature > 45) {
      setStatus('Enter a temperature between 30.0 and 45.0 °C.')
      return
    }
    setSaving(true); setStatus('')
    try {
      await addDoc(recordsCollection, {
        location: form.location.trim(), temperature, inputBy: form.inputBy.trim(),
        remark: form.remark.trim(), ownerId: deviceId,
        createdAt: serverTimestamp(), updatedAt: null,
      })
      setForm(blank); setStatus('Temperature recorded.')
    } catch { setStatus('Could not save the record. Please try again.') }
    finally { setSaving(false) }
  }

  function canEdit(record) {
    const created = record.createdAt?.toMillis?.()
    return record.ownerId === deviceId && created && now - created < EDIT_WINDOW_MS
  }

  async function saveEdit(event) {
    event.preventDefault()
    if (!canEdit(editing)) { setEditing(null); setStatus('The 10-minute edit window has expired.'); return }
    const data = new FormData(event.currentTarget)
    const temperature = Number(data.get('temperature'))
    if (!Number.isFinite(temperature) || temperature < 30 || temperature > 45) return setStatus('Enter a temperature between 30.0 and 45.0 °C.')
    try {
      await updateDoc(doc(db, 'temperature_records', editing.id), {
        location: data.get('location').trim(), temperature,
        inputBy: data.get('inputBy').trim(), remark: data.get('remark').trim(),
        updatedAt: serverTimestamp(),
      })
      setEditing(null); setStatus('Record updated.')
    } catch { setStatus('Could not update the record. The edit window may have expired.') }
  }

  async function exportExcel() {
    const XLSX = await import('xlsx')
    const rows = records.map((record) => {
      const { date, time } = parts(record.createdAt)
      return {
        Date: date,
        'Original submission time': time,
        Location: record.location,
        'Temperature (°C)': record.temperature,
        'Input By': record.inputBy,
        Remark: record.remark || '',
        'Last Edited At': record.updatedAt?.toDate?.() || '',
      }
    })
    const sheet = XLSX.utils.json_to_sheet(rows)
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, 'Temperature Records')
    XLSX.writeFile(book, `temperature-records-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return <main>
    <header><div><h1>Temperature Records</h1><p>Submit and view shared site records.</p></div></header>
    {!firebaseConfigured && <p className="notice error">Firebase is not configured. Add the required values to your .env file.</p>}
    <section className="card"><h2>New record</h2>
      <form onSubmit={submit}>
        <label>Location<input name="location" value={form.location} onChange={change} required maxLength="100" /></label>
        <label>Temperature °C<input name="temperature" value={form.temperature} onChange={change} required type="number" min="30" max="45" step="0.1" inputMode="decimal" /></label>
        <label>Input By<input name="inputBy" value={form.inputBy} onChange={change} required maxLength="100" /></label>
        <label>Remark (optional)<input name="remark" value={form.remark} onChange={change} maxLength="500" /></label>
        <button type="submit" disabled={saving || !firebaseConfigured}>{saving ? 'Saving…' : 'Submit'}</button>
      </form>{status && <p className="notice" role="status">{status}</p>}
    </section>
    <section><div className="section-heading"><h2>Records</h2><button onClick={exportExcel} disabled={!records.length}>Export .xlsx</button></div><RecordTable records={records} canEdit={canEdit} onEdit={setEditing} /></section>
    {editing && <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-title"><h2 id="edit-title">Edit record</h2><form onSubmit={saveEdit}>
      <label>Location<input name="location" defaultValue={editing.location} required maxLength="100" /></label>
      <label>Temperature °C<input name="temperature" defaultValue={editing.temperature} type="number" min="30" max="45" step="0.1" required /></label>
      <label>Input By<input name="inputBy" defaultValue={editing.inputBy} required maxLength="100" /></label>
      <label>Remark (optional)<input name="remark" defaultValue={editing.remark} maxLength="500" /></label>
      <div className="actions"><button type="button" className="secondary" onClick={() => setEditing(null)}>Cancel</button><button>Save changes</button></div>
    </form></section></div>}
  </main>
}
