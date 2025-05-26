import { useProjectStore } from '../store/projectStore'

const ProgressBar = () => {
  const progress = useProjectStore((state) => state.project?.progress || 0)

  return (
    <div className="text-center">
      <svg className="w-20 h-20 mx-auto">
        <circle
          cx="40"
          cy="40"
          r="35"
          stroke="#eee"
          strokeWidth="10"
          fill="none"
        />
        <circle
          cx="40"
          cy="40"
          r="35"
          stroke="#3b82f6"
          strokeWidth="10"
          fill="none"
          strokeDasharray={2 * Math.PI * 35}
          strokeDashoffset={(1 - progress / 100) * 2 * Math.PI * 35}
          transform="rotate(-90 40 40)"
        />
      </svg>
      <p className="mt-2 text-lg font-semibold">{progress}%</p>
    </div>
  )
}

export default ProgressBar;
