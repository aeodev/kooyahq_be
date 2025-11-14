import { ProjectModel, toProject, type Project } from './project.model'

export type CreateProjectInput = {
  name: string
}

export type UpdateProjectInput = {
  name?: string
}

export const projectRepository = {
  async create(input: CreateProjectInput): Promise<Project> {
    const doc = await ProjectModel.create({
      name: input.name.trim(),
    })
    return toProject(doc)
  },

  async findAll(): Promise<Project[]> {
    const docs = await ProjectModel.find().sort({ name: 1 }).exec()
    return docs.map(toProject)
  },

  async findById(id: string): Promise<Project | undefined> {
    const doc = await ProjectModel.findById(id).exec()
    return doc ? toProject(doc) : undefined
  },

  async update(id: string, updates: UpdateProjectInput): Promise<Project | undefined> {
    const updateData: any = {}
    if (updates.name !== undefined) {
      updateData.name = updates.name.trim()
    }
    const doc = await ProjectModel.findByIdAndUpdate(id, updateData, { new: true }).exec()
    return doc ? toProject(doc) : undefined
  },

  async delete(id: string): Promise<boolean> {
    const result = await ProjectModel.deleteOne({ _id: id }).exec()
    return result.deletedCount > 0
  },
}


