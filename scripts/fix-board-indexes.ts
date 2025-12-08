/**
 * Fix board collection indexes - remove old 'key' index and ensure correct indexes
 * 
 * Usage:
 *   npx ts-node scripts/fix-board-indexes.ts
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') })

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/kooyahq'

async function fixIndexes() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(MONGO_URI)
    console.log('✅ Connected to MongoDB\n')

    const db = mongoose.connection.db
    if (!db) {
      throw new Error('Database connection not available')
    }

    const boardsCollection = db.collection('boards')
    
    // Get current indexes
    console.log('📋 Checking current indexes...')
    const indexes = await boardsCollection.indexes()
    console.log('Current indexes:', indexes.map(idx => idx.name))
    console.log()

    // Drop old 'key' index if it exists
    try {
      const keyIndex = indexes.find(idx => idx.name === 'key_1')
      if (keyIndex) {
        console.log('🗑️  Dropping old "key_1" index...')
        await boardsCollection.dropIndex('key_1')
        console.log('✅ Dropped "key_1" index\n')
      } else {
        console.log('ℹ️  No "key_1" index found\n')
      }
    } catch (error: any) {
      if (error.codeName === 'IndexNotFound') {
        console.log('ℹ️  Index "key_1" does not exist\n')
      } else {
        throw error
      }
    }

    // Ensure correct compound index exists
    console.log('🔧 Ensuring correct indexes exist...')
    try {
      await boardsCollection.createIndex(
        { workspaceId: 1, prefix: 1 },
        { unique: true, name: 'workspaceId_1_prefix_1' }
      )
      console.log('✅ Created/verified compound index (workspaceId_1_prefix_1)\n')
    } catch (error: any) {
      if (error.code === 85) {
        // Index already exists with different options
        console.log('⚠️  Index already exists, dropping and recreating...')
        await boardsCollection.dropIndex('workspaceId_1_prefix_1').catch(() => {})
        await boardsCollection.createIndex(
          { workspaceId: 1, prefix: 1 },
          { unique: true, name: 'workspaceId_1_prefix_1' }
        )
        console.log('✅ Recreated compound index\n')
      } else {
        throw error
      }
    }

    // Clean up any documents with null prefix (if any)
    const nullPrefixCount = await boardsCollection.countDocuments({ prefix: null })
    if (nullPrefixCount > 0) {
      console.log(`⚠️  Found ${nullPrefixCount} documents with null prefix`)
      console.log('   These should be cleaned up manually if needed\n')
    }

    await mongoose.disconnect()
    console.log('✅ Index fix complete!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error fixing indexes:', error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

void fixIndexes()

