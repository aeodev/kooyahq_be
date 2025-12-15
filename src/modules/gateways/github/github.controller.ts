import type { NextFunction, Request, Response } from 'express'
import { githubGatewayService } from './github.service'

export async function handleGithubActionsWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const ticket = await githubGatewayService.processGithubAction(req.body || {})

    res.json({
      success: true,
      data: {
        ticket,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}
