import { PageVersionModel, toPageVersion, type PageVersion } from './page-version.model'

export type CreatePageVersionInput = {
  pageId: string
  versionNumber: string
  content: Record<string, any>
  editorId: string
  changeSummary?: string
}

export class PageVersionRepository {
  async createVersion(input: CreatePageVersionInput): Promise<PageVersion> {
    const version = await PageVersionModel.create({
      pageId: input.pageId,
      versionNumber: input.versionNumber,
      content: input.content,
      editorId: input.editorId,
      changeSummary: input.changeSummary,
    })
    return toPageVersion(version)
  }

  async getVersions(pageId: string): Promise<PageVersion[]> {
    const versions = await PageVersionModel.find({ pageId })
      .sort({ createdAt: -1 })
      .exec()
    return versions.map(toPageVersion)
  }

  async getVersion(pageId: string, versionNumber: string): Promise<PageVersion | null> {
    const version = await PageVersionModel.findOne({ pageId, versionNumber }).exec()
    return version ? toPageVersion(version) : null
  }

  async getLatestVersion(pageId: string): Promise<PageVersion | null> {
    const version = await PageVersionModel.findOne({ pageId })
      .sort({ createdAt: -1 })
      .exec()
    return version ? toPageVersion(version) : null
  }

  async restoreVersion(pageId: string, versionId: string): Promise<PageVersion | null> {
    const version = await PageVersionModel.findById(versionId).exec()
    return version ? toPageVersion(version) : null
  }

  async compareVersions(
    pageId: string,
    versionNumber1: string,
    versionNumber2: string,
  ): Promise<{ version1: PageVersion | null; version2: PageVersion | null }> {
    const [version1, version2] = await Promise.all([
      this.getVersion(pageId, versionNumber1),
      this.getVersion(pageId, versionNumber2),
    ])
    return { version1, version2 }
  }
}

export const pageVersionRepository = new PageVersionRepository()
