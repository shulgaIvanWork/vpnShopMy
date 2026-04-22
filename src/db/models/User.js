const pool = require('../pool');

class UserModel {
  // Создание или получение пользователя
  static async findOrCreate(maxUserId, username = null) {
    const result = await pool.query(
      `INSERT INTO users (max_user_id, username) 
       VALUES ($1, $2) 
       ON CONFLICT (max_user_id) 
       DO UPDATE SET username = COALESCE(EXCLUDED.username, users.username)
       RETURNING *`,
      [maxUserId, username]
    );
    return result.rows[0];
  }

  // Поиск пользователя по ID
  static async findById(userId) {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    return result.rows[0];
  }

  // Поиск пользователя по max_user_id
  static async findByMaxUserId(maxUserId) {
    const result = await pool.query('SELECT * FROM users WHERE max_user_id = $1', [maxUserId]);
    return result.rows[0];
  }

  // Обновление подписки
  static async updateSubscription(userId, subscriptionEnd, uuid) {
    const result = await pool.query(
      `UPDATE users 
       SET subscription_end = $1, uuid = $2 
       WHERE id = $3 
       RETURNING *`,
      [subscriptionEnd, uuid, userId]
    );
    return result.rows[0];
  }

  // Получить пользователей с истекающей подпиской
  static async getExpiringSubscriptions(daysBefore) {
    const result = await pool.query(
      `SELECT * FROM users 
       WHERE subscription_end IS NOT NULL 
       AND subscription_end <= NOW() + INTERVAL '${daysBefore} days'
       AND subscription_end > NOW()`,
      []
    );
    return result.rows;
  }

  // Получить пользователей с истекшей подпиской
  static async getExpiredSubscriptions() {
    const result = await pool.query(
      `SELECT * FROM users 
       WHERE subscription_end IS NOT NULL 
       AND subscription_end < NOW()`,
      []
    );
    return result.rows;
  }
}

module.exports = UserModel;
