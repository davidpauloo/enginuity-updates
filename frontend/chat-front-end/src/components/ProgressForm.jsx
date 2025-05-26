import { useState } from 'react'
import { useProjectStore } from '../store/projectStore'
import { v4 as uuidv4 } from 'uuid'

const ProgressForm = () => {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const addMilestone = useProjectStore((state) => state.addMilestone)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title || !dueDate) return

    const newMilestone = {
      id: uuidv4(),
      title,
      dueDate,
      completed: false,
    }

    addMilestone(newMilestone)
    setTitle('')
    setDueDate('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        className="border rounded p-2 w-full"
        type="text"
        placeholder="Milestone Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        className="border rounded p-2 w-full"
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
      />
      <button className="bg-blue-500 text-white p-2 rounded" type="submit">
        Add Milestone
      </button>
    </form>
  )
}

export default ProgressForm;
