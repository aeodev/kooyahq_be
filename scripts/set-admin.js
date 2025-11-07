/**
 * Script to set a user as admin
 * 
 * Usage:
 *   node scripts/set-admin.js <user-email>
 * 
 * Example:
 *   node scripts/set-admin.js admin@example.com
 */

const mongoose = require('mongoose')
require('dotenv').config()

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/kooyahq'

const userSchema = new mongoose.Schema({
  email: String,
  name: String,
  passwordHash: String,
  isAdmin: { type: Boolean, default: false },
}, { timestamps: true })

const User = mongoose.models.User || mongoose.model('User', userSchema)

async function setAdmin(email) {
  try {
    await mongoose.connect(MONGO_URI)
    console.log('Connected to MongoDB')

    const user = await User.findOne({ email: email.toLowerCase() })
    
    if (!user) {
      console.error(`User with email "${email}" not found`)
      process.exit(1)
    }

    if (user.isAdmin) {
      console.log(`User "${email}" is already an admin`)
    } else {
      user.isAdmin = true
      await user.save()
      console.log(`✅ Successfully set "${email}" as admin`)
    }

    await mongoose.disconnect()
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

const email = process.argv[2]

if (!email) {
  console.error('Usage: node scripts/set-admin.js <user-email>')
  process.exit(1)
}

setAdmin(email)

