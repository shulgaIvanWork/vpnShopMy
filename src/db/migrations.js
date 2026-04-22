const pool = require('./pool');

async function runMigrations() {
  console.log('[Migration] Running database migrations...');
  
  try {
    // 1. Добавляем колонку referral_code если её нет
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20)
    `);
    console.log('[Migration] ✓ Column referral_code added');
    
    // 2. Создаем индекс для быстрого поиска
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_referral_code 
      ON users(referral_code)
    `);
    console.log('[Migration] ✓ Index idx_users_referral_code created');
    
    // 3. Генерируем referral_code для существующих пользователей у которых его нет
    const result = await pool.query(`
      SELECT id FROM users WHERE referral_code IS NULL
    `);
    
    if (result.rows.length > 0) {
      console.log(`[Migration] Generating codes for ${result.rows.length} existing users...`);
      
      for (const row of result.rows) {
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        const code = `VPN${row.id}${random}`;
        
        await pool.query(`
          UPDATE users SET referral_code = $1 WHERE id = $2
        `, [code, row.id]);
      }
      
      console.log(`[Migration] ✓ Generated codes for ${result.rows.length} users`);
    }
    
    console.log('[Migration] All migrations completed successfully');
  } catch (error) {
    console.error('[Migration] Error:', error.message);
    throw error;
  }
}

module.exports = { runMigrations };
