import type { AuthenticatedSocket } from '../../../lib/socket'
import { hasPermission, type Permission } from './permissions'

export function socketHasPermission(socket: AuthenticatedSocket, ...required: Permission[]) {
  if (!socket.authUser) return false
  return required.some((perm) => hasPermission(socket.authUser!, perm))
}

export function requireSocketPermission(socket: AuthenticatedSocket, ...required: Permission[]) {
  const allowed = socketHasPermission(socket, ...required)
  if (!allowed) {
    socket.emit('error', { message: 'Forbidden' })
  }
  return allowed
}
