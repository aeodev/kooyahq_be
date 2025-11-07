import mongoose from 'mongoose'
import { env } from '../config/env'

let connected = false

export async function connectToDatabase() {
  if (connected) {
    return mongoose.connection
  }

  mongoose.set('strictQuery', true)

  await mongoose.connect(env.mongoUri)
  connected = true

  return mongoose.connection
}

export async function disconnectFromDatabase() {
  if (!connected) {
    return
  }

  await mongoose.disconnect()
  connected = false
}
