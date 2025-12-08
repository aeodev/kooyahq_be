import { BoardFavoriteModel, toBoardFavorite, type BoardFavorite } from './board-favorite.model'

export class BoardFavoriteService {
  async toggleFavorite(userId: string, boardId: string): Promise<{ isFavorite: boolean }> {
    const existing = await BoardFavoriteModel.findOne({ userId, boardId })

    if (existing) {
      // Unfavorite
      await BoardFavoriteModel.deleteOne({ userId, boardId })
      return { isFavorite: false }
    } else {
      // Favorite
      await BoardFavoriteModel.create({ userId, boardId })
      return { isFavorite: true }
    }
  }

  async isFavorite(userId: string, boardId: string): Promise<boolean> {
    const favorite = await BoardFavoriteModel.findOne({ userId, boardId })
    return !!favorite
  }

  async getFavoriteBoardIds(userId: string): Promise<string[]> {
    const favorites = await BoardFavoriteModel.find({ userId }).select('boardId')
    return favorites.map((f) => f.boardId)
  }

  async getFavoritesByUser(userId: string): Promise<BoardFavorite[]> {
    const favorites = await BoardFavoriteModel.find({ userId }).sort({ createdAt: -1 })
    return favorites.map(toBoardFavorite)
  }
}

export const boardFavoriteService = new BoardFavoriteService()

