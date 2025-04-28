import { db } from './db';
import * as schema from '../shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { z } from 'zod';

// Validation schemas
export const registerSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(6),
  displayName: z.string().optional()
});

export const loginSchema = z.object({
  username: z.string(),
  password: z.string()
});

// User registration
export async function registerUser(data: z.infer<typeof registerSchema>) {
  try {
    // Check if username already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.username, data.username)
    });

    if (existingUser) {
      throw new Error('Username already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user
    const [user] = await db.insert(schema.users).values({
      username: data.username,
      password: hashedPassword,
      displayName: data.displayName || data.username,
      avatarColor: '#' + Math.floor(Math.random()*16777215).toString(16)
    }).returning();

    return user;
  } catch (error) {
    throw error;
  }
}

// User login
export async function loginUser(data: z.infer<typeof loginSchema>) {
  try {
    // Find user
    const user = await db.query.users.findFirst({
      where: eq(schema.users.username, data.username)
    });

    if (!user) {
      throw new Error('Invalid username or password');
    }

    // Verify password
    const isValid = await bcrypt.compare(data.password, user.password);
    if (!isValid) {
      throw new Error('Invalid username or password');
    }

    return user;
  } catch (error) {
    throw error;
  }
}

// Get user by ID
export async function getUserById(id: number) {
  try {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, id)
    });
    return user;
  } catch (error) {
    throw error;
  }
} 