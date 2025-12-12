import { Router } from 'express'

import { pageRouter } from './pages/page.router'
import { templateRouter } from './templates/template.router'
import { aiRouter } from './ai/ai.router'

export const wikiHubRouter = Router()

wikiHubRouter.use('/pages', pageRouter)
wikiHubRouter.use('/templates', templateRouter)
wikiHubRouter.use('/ai', aiRouter)
