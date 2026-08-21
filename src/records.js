import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from './firebase'

export const recordsCollection = collection(db, 'temperature_records')

export function subscribeToRecords(onData, onError) {
  return onSnapshot(
    query(recordsCollection, orderBy('createdAt', 'desc')),
    (snapshot) => onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError,
  )
}

export function parts(timestamp) {
  if (!timestamp?.toDate) return { date: 'Pending', time: 'Pending' }
  const value = timestamp.toDate()
  return {
    date: value.toLocaleDateString(),
    time: value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
}
