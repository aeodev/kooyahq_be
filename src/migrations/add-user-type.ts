import { connectDB } from '../config/database'
import { UserModel } from '../modules/users/user.model'

/**
 * Migration script to add userType field to existing users
 * Sets all existing users to 'employee' type
 * Safe to run multiple times (only updates users without userType)
 */
async function migrateUserTypes() {
  try {
    await connectDB()
    console.log('Connected to database')

    const result = await UserModel.updateMany(
      { userType: { $exists: false } },
      { $set: { userType: 'employee' } }
    )

    console.log(`Migration completed: ${result.modifiedCount} user(s) updated with userType 'employee'`)
    
    // Verify migration
    const usersWithoutType = await UserModel.countDocuments({ userType: { $exists: false } })
    if (usersWithoutType > 0) {
      console.warn(`Warning: ${usersWithoutType} user(s) still missing userType field`)
    } else {
      console.log('All users now have userType field')
    }

    process.exit(0)
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

// Run migration if script is executed directly
if (require.main === module) {
  migrateUserTypes()
}

export { migrateUserTypes }

