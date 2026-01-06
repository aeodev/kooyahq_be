import { RefreshTokenModel, type RefreshTokenDocument } from './refresh-token.model'

export const refreshTokenRepository = {
  async create(input: { userId: string; tokenHash: string; expiresAt: Date }) {
    return RefreshTokenModel.create({
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
    })
  },

  async findByTokenHash(tokenHash: string): Promise<RefreshTokenDocument | null> {
    return RefreshTokenModel.findOne({ tokenHash }).exec()
  },

  async revokeById(id: string) {
    await RefreshTokenModel.updateOne(
      { _id: id },
      { $set: { revokedAt: new Date() } },
    ).exec()
  },

  async revokeByTokenHash(tokenHash: string) {
    await RefreshTokenModel.updateOne(
      { tokenHash },
      { $set: { revokedAt: new Date() } },
    ).exec()
  },
}
