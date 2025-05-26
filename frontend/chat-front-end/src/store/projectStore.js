import { create } from 'zustand'

export const useProjectStore = create((set, get) => ({
  project: {
    name: 'Sample Project',
    milestones: [],
    progress: 0,
  },

  addMilestone: (milestone) => {
    const project = get().project
    const updatedMilestones = [...project.milestones, milestone]
    const completed = updatedMilestones.filter(m => m.completed).length
    const progress = Math.round((completed / updatedMilestones.length) * 100)

    set({
      project: {
        ...project,
        milestones: updatedMilestones,
        progress,
      }
    })
  },

  toggleMilestone: (id) => {
    const project = get().project
    const updatedMilestones = project.milestones.map((m) =>
      m.id === id ? { ...m, completed: !m.completed } : m
    )
    const completed = updatedMilestones.filter(m => m.completed).length
    const progress = Math.round((completed / updatedMilestones.length) * 100)

    set({
      project: {
        ...project,
        milestones: updatedMilestones,
        progress,
      }
    })
  }
}))
