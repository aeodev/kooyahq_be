import type { Request, Response, NextFunction } from 'express'
import { createHttpError } from '../../utils/http-error'
import { projectService } from './project.service'

export async function createProject(req: Request, res: Response, next: NextFunction) {
  const { name } = req.body

  if (!name || !name.trim()) {
    return next(createHttpError(400, 'Project name is required'))
  }

  try {
    const project = await projectService.create({
      name: name.trim(),
    })

    res.status(201).json({
      status: 'success',
      data: project,
    })
  } catch (error: any) {
    if (error.code === 11000 || error.message?.includes('duplicate')) {
      return next(createHttpError(409, 'Project with this name already exists'))
    }
    next(error)
  }
}

export async function getProjects(req: Request, res: Response, next: NextFunction) {
  try {
    const projects = await projectService.findAll()

    res.json({
      status: 'success',
      data: projects,
    })
  } catch (error) {
    next(error)
  }
}

export async function getProject(req: Request, res: Response, next: NextFunction) {
  const id = req.params.id

  try {
    const project = await projectService.findById(id)

    if (!project) {
      return next(createHttpError(404, 'Project not found'))
    }

    res.json({
      status: 'success',
      data: project,
    })
  } catch (error) {
    next(error)
  }
}

export async function updateProject(req: Request, res: Response, next: NextFunction) {
  const id = req.params.id
  const { name } = req.body

  if (name !== undefined && !name.trim()) {
    return next(createHttpError(400, 'Project name cannot be empty'))
  }

  try {
    const updates: any = {}
    if (name !== undefined) {
      updates.name = name.trim()
    }

    const project = await projectService.update(id, updates)

    if (!project) {
      return next(createHttpError(404, 'Project not found'))
    }

    res.json({
      status: 'success',
      data: project,
    })
  } catch (error: any) {
    if (error.code === 11000 || error.message?.includes('duplicate')) {
      return next(createHttpError(409, 'Project with this name already exists'))
    }
    next(error)
  }
}

export async function deleteProject(req: Request, res: Response, next: NextFunction) {
  const id = req.params.id

  try {
    const deleted = await projectService.delete(id)

    if (!deleted) {
      return next(createHttpError(404, 'Project not found'))
    }

    res.json({
      status: 'success',
      message: 'Project deleted',
    })
  } catch (error) {
    next(error)
  }
}





