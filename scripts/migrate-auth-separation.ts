/**
 * Migration script to separate authentication credentials from user profile data
 * 
 * This script:
 * 1. Reads all existing Users with passwordHash
 * 2. Creates Auth records for each user with email and passwordHash
 * 3. Removes passwordHash from User records
 * 
 * Usage:
 *   npx ts-node backend/scripts/migrate-auth-separation.ts
 * 
 * The script is idempotent - safe to run multiple times
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { resolve, join } from 'path'
import { UserModel } from '../src/modules/users/user.model'
import { AuthModel } from '../src/modules/auth/auth.model'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') })

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/kooyahq'

interface OldUserDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId
  email: string
  name: string
  passwordHash: string
  isAdmin?: boolean
  profilePic?: string
  banner?: string
  bio?: string
  createdAt: Date
  updatedAt: Date
}

async function migrateAuthSeparation() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(MONGO_URI)
    console.log('✅ Connected to MongoDB\n')

    // Use the raw collection to access passwordHash directly
    const userCollection = mongoose.connection.db?.collection('users')
    if (!userCollection) {
      throw new Error('Could not access users collection')
    }

    console.log('📖 Reading all users...')
    const users = await userCollection.find({ passwordHash: { $exists: true } }).toArray()
    console.log(`Found ${users.length} users with passwordHash\n`)

    if (users.length === 0) {
      console.log('✅ No users to migrate. Migration already complete or no users exist.')
      await mongoose.disconnect()
      process.exit(0)
    }

    let migrated = 0
    let skipped = 0
    let errors = 0

    for (const user of users) {
      try {
        const userId = user._id.toString()
        const email = user.email?.toLowerCase().trim()

        if (!email || !user.passwordHash) {
          console.log(`⚠️  Skipping user ${userId}: missing email or passwordHash`)
          skipped++
          continue
        }

        // Check if Auth record already exists
        const existingAuth = await AuthModel.findOne({ userId }).exec()
        if (existingAuth) {
          console.log(`⏭️  Skipping user ${userId} (${email}): Auth record already exists`)
          skipped++
          continue
        }

        // Check if email is already in Auth collection (duplicate check)
        const emailExists = await AuthModel.findOne({ email }).exec()
        if (emailExists) {
          console.log(`⚠️  Warning: Email ${email} already exists in Auth collection. Skipping user ${userId}`)
          skipped++
          continue
        }

        // Create Auth record
        await AuthModel.create({
          email,
          passwordHash: user.passwordHash,
          userId: user._id,
        })

        // Remove passwordHash from User document using $unset
        await userCollection.updateOne(
          { _id: user._id },
          { $unset: { passwordHash: '' } }
        )

        migrated++
        console.log(`✅ Migrated user ${userId} (${email})`)
      } catch (error) {
        errors++
        const userId = user._id?.toString() || 'unknown'
        console.error(`❌ Error migrating user ${userId}:`, error instanceof Error ? error.message : error)
      }
    }

    console.log('\n📊 Migration Summary:')
    console.log(`   ✅ Migrated: ${migrated}`)
    console.log(`   ⏭️  Skipped: ${skipped}`)
    console.log(`   ❌ Errors: ${errors}`)

    // Verify migration
    const remainingWithPassword = await userCollection.countDocuments({ passwordHash: { $exists: true } })
    const authCount = await AuthModel.countDocuments().exec()

    console.log('\n🔍 Verification:')
    console.log(`   Users still with passwordHash: ${remainingWithPassword}`)
    console.log(`   Total Auth records: ${authCount}`)

    if (remainingWithPassword === 0 && authCount > 0) {
      console.log('\n✅ Migration completed successfully!')
    } else if (remainingWithPassword > 0) {
      console.log('\n⚠️  Some users still have passwordHash. You may need to run this script again.')
    }

    await mongoose.disconnect()
    console.log('\n👋 Disconnected from MongoDB')
    process.exit(errors > 0 ? 1 : 0)
  } catch (error) {
    console.error('❌ Fatal error:', error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

migrateAuthSeparation()

