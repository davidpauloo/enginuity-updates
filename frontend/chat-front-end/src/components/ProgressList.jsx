import { useProjectStore } from '../store/projectStore'

const ProgressList = () => {
  const milestones = useProjectStore((state) => state.project?.milestones || [])
  const toggleMilestone = useProjectStore((state) => state.toggleMilestone)

  return (
    <ul className="space-y-2">
      {milestones.map((milestone) => (
        <li key={milestone.id} className="flex items-center justify-between p-2 border rounded">
          <div>
            <input
              type="checkbox"
              checked={milestone.completed}
              onChange={() => toggleMilestone(milestone.id)}
              className="mr-2"
            />
            <span>{milestone.title}</span>
            <span className="ml-4 text-sm text-gray-500">({milestone.dueDate})</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default ProgressList;
