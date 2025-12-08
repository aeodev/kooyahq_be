/**
 * Seed script to create a default workspace with all users as admin members
 * and populate with mock boards
 * 
 * Usage:
 *   npx ts-node scripts/seed-workspace.ts
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { resolve } from 'path'
import { UserModel } from '../src/modules/users/user.model'
import { WorkspaceModel } from '../src/modules/workspace/workspace/workspace.model'
import { BoardModel } from '../src/modules/workspace/boards/board.model'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') })

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/kooyahq'

const DEFAULT_KANBAN_COLUMNS = [
  { id: 'col_todo', name: 'To Do', order: 0, isDoneColumn: false },
  { id: 'col_doing', name: 'Doing', order: 1, isDoneColumn: false },
  { id: 'col_done', name: 'Done', order: 2, isDoneColumn: true },
]

const DEFAULT_SPRINT_COLUMNS = [
  { id: 'col_backlog', name: 'Backlog', order: 0, isDoneColumn: false },
  { id: 'col_sprint', name: 'Sprint', order: 1, isDoneColumn: false },
  { id: 'col_review', name: 'Review', order: 2, isDoneColumn: false },
  { id: 'col_done', name: 'Done', order: 3, isDoneColumn: true },
]

const MOCK_BOARDS = [
  {
    name: 'Traderise QA Website',
    prefix: 'TQ',
    emoji: '🌐',
    type: 'kanban' as const,
    description: 'QA tracking for Traderise website',
  },
  {
    name: 'TalentTap Issues Tracker',
    prefix: 'TT',
    emoji: '🎪',
    type: 'kanban' as const,
    description: 'Issue tracking for TalentTap platform',
  },
  {
    name: 'Mobile App Development',
    prefix: 'MAD',
    emoji: '📱',
    type: 'sprint' as const,
    description: 'Sprint planning for mobile app',
  },
  {
    name: 'Design System',
    prefix: 'DS',
    emoji: '🎨',
    type: 'kanban' as const,
    description: 'Design system components and guidelines',
  },
  {
    name: 'Infrastructure',
    prefix: 'INFRA',
    emoji: '⚙️',
    type: 'kanban' as const,
    description: 'Infrastructure and DevOps tasks',
  },
]

async function seedWorkspace() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(MONGO_URI)
    console.log('✅ Connected to MongoDB\n')

    // Get all users
    console.log('📖 Fetching all users...')
    const users = await UserModel.find({}).exec()
    console.log(`Found ${users.length} users\n`)

    if (users.length === 0) {
      console.log('⚠️  No users found. Please create users first.')
      await mongoose.disconnect()
      process.exit(1)
    }

    // Check if default workspace already exists
    const existingWorkspace = await WorkspaceModel.findOne({ slug: 'default' }).exec()
    
    let workspace
    if (existingWorkspace) {
      console.log('📝 Found existing default workspace, updating members...')
      // Update members to include all users as admin
      workspace = await WorkspaceModel.findByIdAndUpdate(
        existingWorkspace._id,
        {
          members: users.map((user) => ({
            userId: user._id.toString(),
            role: 'admin' as const,
            joinedAt: new Date(),
          })),
        },
        { new: true }
      ).exec()
      console.log('✅ Updated workspace members\n')
    } else {
      console.log('🏗️  Creating default workspace...')
      // Create workspace with all users as admin
      workspace = await WorkspaceModel.create({
        name: 'Default Workspace',
        slug: 'default',
        members: users.map((user) => ({
          userId: user._id.toString(),
          role: 'admin' as const,
          joinedAt: new Date(),
        })),
      })
      console.log(`✅ Created workspace: ${workspace.name} (${workspace.slug})\n`)
    }

    if (!workspace) {
      throw new Error('Failed to create or update workspace')
    }

    const workspaceId = workspace._id.toString()
    const firstUser = users[0]

    // Clean up any documents with null prefix (legacy data)
    const db = mongoose.connection.db
    if (db) {
      const boardsCollection = db.collection('boards')
      const nullPrefixCount = await boardsCollection.countDocuments({ prefix: null })
      if (nullPrefixCount > 0) {
        console.log(`🧹 Cleaning up ${nullPrefixCount} board(s) with null prefix...`)
        await boardsCollection.deleteMany({ prefix: null })
        console.log('✅ Cleaned up legacy boards\n')
      }
    }

    // Create mock boards
    console.log('📋 Creating mock boards...')
    let createdBoards = 0
    let skippedBoards = 0

    for (const boardData of MOCK_BOARDS) {
      // Check if board with this prefix already exists
      const existingBoard = await BoardModel.findOne({
        workspaceId,
        prefix: boardData.prefix,
        deletedAt: { $exists: false },
      }).exec()

      if (existingBoard) {
        console.log(`⏭️  Skipping board ${boardData.prefix}: already exists`)
        skippedBoards++
        continue
      }

      const columns =
        boardData.type === 'kanban' ? DEFAULT_KANBAN_COLUMNS : DEFAULT_SPRINT_COLUMNS

      await BoardModel.create({
        workspaceId,
        name: boardData.name,
        prefix: boardData.prefix,
        emoji: boardData.emoji,
        type: boardData.type,
        description: boardData.description,
        columns,
        settings: {
          defaultView: 'board',
          showSwimlanes: false,
        },
        members: [
          {
            userId: firstUser._id.toString(),
            role: 'admin' as const,
            joinedAt: new Date(),
          },
        ],
        createdBy: firstUser._id.toString(),
      })

      console.log(`✅ Created board: ${boardData.name} (${boardData.prefix})`)
      createdBoards++
    }

    console.log('\n📊 Summary:')
    console.log(`   Workspace: ${workspace.name} (${workspace.slug})`)
    console.log(`   Members: ${workspace.members.length} (all admins)`)
    console.log(`   Boards created: ${createdBoards}`)
    console.log(`   Boards skipped: ${skippedBoards}`)

    await mongoose.disconnect()
    console.log('\n✅ Seeding complete!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error seeding workspace:', error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

void seedWorkspace()

