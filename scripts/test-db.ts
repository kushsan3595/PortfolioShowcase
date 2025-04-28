import { db } from '../server/db';
import * as schema from '../shared/schema';
import { eq } from 'drizzle-orm';

async function testConnection() {
  try {
    // Test the connection by querying the users table
    const result = await db.execute('SELECT 1 as test');
    console.log('Database connection successful!');
    console.log('Test query result:', result);
    
    // Test inserting a sample game
    const game = await db.insert(schema.games).values({
      name: 'Test Game',
      description: 'A test game',
      maxPlayers: 2,
      imageUrl: 'https://example.com/game.png'
    }).returning();
    
    console.log('Successfully inserted test game:', game);
    
    // Clean up
    await db.delete(schema.games).where(eq(schema.games.id, game[0].id));
    console.log('Cleaned up test data');
    
    process.exit(0);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

testConnection(); 