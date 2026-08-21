import { parts } from './records'

export default function RecordTable({ records, canEdit, onEdit }) {
  if (!records.length) return <p className="empty">No records yet.</p>

  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Date</th><th>Time</th><th>Location</th><th>Temperature</th><th>Input By</th><th>Remark</th><th></th></tr></thead>
        <tbody>
          {records.map((record) => {
            const { date, time } = parts(record.createdAt)
            const edited = record.updatedAt ? parts(record.updatedAt) : null
            return <tr key={record.id}>
              <td>{date}</td><td><span>{time}</span>{edited && <small className="edited"><strong>Edited</strong> {edited.date} {edited.time}</small>}</td><td>{record.location}</td>
              <td>{Number(record.temperature).toFixed(1)} °C</td><td>{record.inputBy}</td><td>{record.remark || '—'}</td>
              <td>{canEdit(record) && <button className="link" onClick={() => onEdit(record)}>Edit</button>}</td>
            </tr>
          })}
        </tbody>
      </table>
    </div>
  )
}
