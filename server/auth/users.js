import fs from 'fs/promises'
import path from 'path'
import { hashPassword, generateUserId } from './auth.js'

const usersPath = path.join(process.cwd(), 'server', 'database', 'users.json')

async function loadUsers() {
  try {
    const raw = await fs.readFile(usersPath, 'utf8')
    return JSON.parse(raw)
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('users database load failed:', error.message)
    }
    return []
  }
}

async function saveUsers(users) {
  await fs.mkdir(path.dirname(usersPath), { recursive: true })
  await fs.writeFile(usersPath, JSON.stringify(users, null, 2), 'utf8')
}

export async function getUserByEmail(email) {
  const users = await loadUsers()
  return users.find(u => u.email.toLowerCase() === email.toLowerCase())
}

export async function getUserById(userId) {
  const users = await loadUsers()
  return users.find(u => u.id === userId)
}

export async function createUser(email, password, name) {
  const users = await loadUsers()
  
  // Check if user already exists
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('User already exists')
  }

  // Validate email format
  if (!email || !email.includes('@')) {
    throw new Error('Invalid email format')
  }

  // Validate password strength
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long')
  }

  const user = {
    id: generateUserId(),
    email: email.toLowerCase(),
    password_hash: hashPassword(password),
    name: name || email.split('@')[0],
    role: 'user',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  users.push(user)
  await saveUsers(users)

  // Return user without password
  const { password_hash, ...userWithoutPassword } = user
  return userWithoutPassword
}

export async function validateUserCredentials(email, password) {
  const user = await getUserByEmail(email)
  
  if (!user) {
    throw new Error('Invalid email or password')
  }

  if (!user.is_active) {
    throw new Error('User account is inactive')
  }

  const passwordHash = hashPassword(password)
  if (passwordHash !== user.password_hash) {
    throw new Error('Invalid email or password')
  }

  const { password_hash, ...userWithoutPassword } = user
  return userWithoutPassword
}

export async function updateUserLastLogin(userId) {
  const users = await loadUsers()
  const user = users.find(u => u.id === userId)
  
  if (user) {
    user.updated_at = new Date().toISOString()
    await saveUsers(users)
  }
}

export async function listUsers() {
  const users = await loadUsers()
  // Return users without password hashes
  return users.map(({ password_hash, ...user }) => user)
}
