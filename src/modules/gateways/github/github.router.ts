import { Router } from 'express'
import { handleGithubActionsWebhook } from './github.controller'
import { verifyGithubGatewaySecret } from '../gateway-auth.middleware'

export const githubGatewayRouter = Router()

githubGatewayRouter.post(
  '/actions',
  verifyGithubGatewaySecret,
  handleGithubActionsWebhook,
)
