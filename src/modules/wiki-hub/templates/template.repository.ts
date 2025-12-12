import { TemplateModel, toTemplate, type Template } from './template.model'

export type CreateTemplateInput = {
  name: string
  workspaceId?: string
  fieldsStructure: Record<string, any>
  defaultContent: Record<string, any>
  category: 'sop' | 'meeting' | 'project' | 'bug' | 'strategy'
}

export type UpdateTemplateInput = {
  name?: string
  fieldsStructure?: Record<string, any>
  defaultContent?: Record<string, any>
  category?: 'sop' | 'meeting' | 'project' | 'bug' | 'strategy'
}

export class TemplateRepository {
  async create(input: CreateTemplateInput): Promise<Template> {
    const template = await TemplateModel.create({
      name: input.name,
      workspaceId: input.workspaceId,
      fieldsStructure: input.fieldsStructure,
      defaultContent: input.defaultContent,
      category: input.category,
    })
    return toTemplate(template)
  }

  async findById(id: string): Promise<Template | null> {
    const template = await TemplateModel.findById(id).exec()
    return template ? toTemplate(template) : null
  }

  async findByWorkspace(workspaceId: string): Promise<Template[]> {
    const templates = await TemplateModel.find({ workspaceId })
      .sort({ category: 1, name: 1 })
      .exec()
    return templates.map(toTemplate)
  }

  async findGlobal(): Promise<Template[]> {
    const templates = await TemplateModel.find({ workspaceId: { $exists: false } })
      .sort({ category: 1, name: 1 })
      .exec()
    return templates.map(toTemplate)
  }

  async findAll(workspaceId?: string): Promise<Template[]> {
    const query: any = {}
    if (workspaceId) {
      query.$or = [{ workspaceId }, { workspaceId: { $exists: false } }]
    } else {
      query.workspaceId = { $exists: false }
    }

    const templates = await TemplateModel.find(query)
      .sort({ category: 1, name: 1 })
      .exec()
    return templates.map(toTemplate)
  }

  async findByCategory(
    category: 'sop' | 'meeting' | 'project' | 'bug' | 'strategy',
    workspaceId?: string,
  ): Promise<Template[]> {
    const query: any = { category }
    if (workspaceId) {
      query.$or = [{ workspaceId }, { workspaceId: { $exists: false } }]
    } else {
      query.workspaceId = { $exists: false }
    }

    const templates = await TemplateModel.find(query)
      .sort({ name: 1 })
      .exec()
    return templates.map(toTemplate)
  }

  async update(id: string, updates: UpdateTemplateInput): Promise<Template | null> {
    const updateData: any = {}

    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.fieldsStructure !== undefined) updateData.fieldsStructure = updates.fieldsStructure
    if (updates.defaultContent !== undefined) updateData.defaultContent = updates.defaultContent
    if (updates.category !== undefined) updateData.category = updates.category

    const template = await TemplateModel.findByIdAndUpdate(id, updateData, { new: true }).exec()
    return template ? toTemplate(template) : null
  }

  async delete(id: string): Promise<boolean> {
    const result = await TemplateModel.findByIdAndDelete(id).exec()
    return !!result
  }
}

export const templateRepository = new TemplateRepository()
