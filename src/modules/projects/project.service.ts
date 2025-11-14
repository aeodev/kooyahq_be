import { projectRepository, type CreateProjectInput, type UpdateProjectInput } from './project.repository'
import type { Project } from './project.model'

export const projectService = {
  async create(input: CreateProjectInput): Promise<Project> {
    return projectRepository.create(input)
  },

  async findAll(): Promise<Project[]> {
    return projectRepository.findAll()
  },

  async findById(id: string): Promise<Project | undefined> {
    return projectRepository.findById(id)
  },

  async update(id: string, updates: UpdateProjectInput): Promise<Project | undefined> {
    return projectRepository.update(id, updates)
  },

  async delete(id: string): Promise<boolean> {
    return projectRepository.delete(id)
  },
}

