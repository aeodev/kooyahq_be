import type { AITool } from '../../ai-assistant.types'
import { PERMISSIONS } from '../../../auth/rbac/permissions'
import { announcementService } from '../../../announcements/announcement.service'
import { notificationService } from '../../../notifications/notification.service'
import { emailService } from '../../../email/email.service'
import { userService } from '../../../users/user.service'
import { SocketEmitter } from '../../../../utils/socket-emitter'
import { cleanHtml } from '../../../../utils/text.utils'

export const createAnnouncementTool: AITool = {
  name: 'create_announcement',
  description: 'Create a new announcement that will be displayed to all users. Announcements can include a title, content, and optional expiration time in hours from now. Active announcements will automatically send notifications and emails to all users.',
  requiredPermission: [PERMISSIONS.ANNOUNCEMENT_CREATE, PERMISSIONS.ANNOUNCEMENT_FULL_ACCESS],
  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'The title of the announcement',
      },
      content: {
        type: 'string',
        description: 'The content/body of the announcement',
      },
      isActive: {
        type: 'boolean',
        description: 'Whether the announcement should be active immediately (defaults to true). Active announcements send notifications and emails.',
      },
      expiresInHours: {
        type: 'number',
        description: 'Optional number of hours from now when the announcement should expire. If not provided, the announcement will not expire.',
      },
    },
    required: ['title', 'content'],
  },
  execute: async (params, user) => {
    const { title, content, isActive, expiresInHours } = params as {
      title: string
      content: string
      isActive?: boolean
      expiresInHours?: number | null
    }

    // Validate required fields
    if (!title || !title.trim()) {
      return {
        success: false,
        error: 'Title is required',
      }
    }

    if (!content || !content.trim()) {
      return {
        success: false,
        error: 'Content is required',
      }
    }

    // Calculate expiration date from hours if provided
    let parsedExpiresAt: Date | null = null
    if (expiresInHours !== undefined && expiresInHours !== null) {
      if (typeof expiresInHours !== 'number' || expiresInHours <= 0) {
        return {
          success: false,
          error: 'expiresInHours must be a positive number',
        }
      }
      // Calculate expiration date: current time + hours
      const now = new Date()
      parsedExpiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000)
    }

    try {
      const summary = cleanHtml(content.trim()).slice(0, 160)
      const announcement = await announcementService.create({
        title: title.trim(),
        content: content.trim(),
        authorId: user.id,
        isActive: isActive !== false,
        expiresAt: parsedExpiresAt ?? null,
      })

      // Broadcast system notification and send emails if announcement is active
      if (announcement.isActive) {
        try {
          await notificationService.createSystemNotificationBroadcast(announcement.title, {
            summary,
            announcementId: announcement.id,
            authorName: announcement.author.name,
            expiresAt: announcement.expiresAt,
          })
        } catch (notifError) {
          console.error('Failed to create system notification broadcast:', notifError)
        }

        // Send email notification to all users
        try {
          const users = await userService.findAll()
          const userEmails = users.map((user) => user.email).filter(Boolean)
          
          if (userEmails.length > 0) {
            await emailService.sendAnnouncementEmail(userEmails, {
              title: announcement.title,
              content: announcement.content,
              authorName: announcement.author.name,
            })
          }
        } catch (emailError) {
          console.error('Failed to send announcement emails:', emailError)
          // Don't fail the request if email fails
        }
      }

      // Broadcast socket event for real-time updates
      try {
        SocketEmitter.emitToAll('announcement:created', {
          announcement,
          timestamp: new Date().toISOString(),
        })
      } catch (socketError) {
        console.error('Failed to emit announcement:created socket event:', socketError)
      }

      let expirationText = ' (no expiration)'
      if (announcement.expiresAt && expiresInHours) {
        const expirationDate = new Date(announcement.expiresAt)
        expirationText = ` (expires in ${expiresInHours} hour${expiresInHours !== 1 ? 's' : ''} at ${expirationDate.toLocaleString()})`
      }

      return {
        success: true,
        message: `Announcement "${announcement.title}" created successfully${expirationText}. ${announcement.isActive ? 'Notifications and emails have been sent to all users.' : 'The announcement is inactive and will not be displayed until activated.'}`,
        announcement: {
          id: announcement.id,
          title: announcement.title,
          content: announcement.content,
          isActive: announcement.isActive,
          expiresAt: announcement.expiresAt,
          createdAt: announcement.createdAt,
          author: announcement.author.name,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create announcement',
      }
    }
  },
}
