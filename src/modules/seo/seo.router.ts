import { Router } from 'express'
import { getSeoMeta } from './seo.controller'

const router = Router()

router.get('/', getSeoMeta)

export { router as seoRouter }
