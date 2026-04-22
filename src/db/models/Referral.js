const pool = require('../pool');

class ReferralModel {
  // Создание реферальной связи
  static async create(referrerId, referredId) {
    const result = await pool.query(
      `INSERT INTO referrals (referrer_id, referred_id)
       VALUES ($1, $2)
       RETURNING *`,
      [referrerId, referredId]
    );
    return result.rows[0];
  }

  // Проверка существования реферальной связи
  static async exists(referredId) {
    const result = await pool.query(
      'SELECT * FROM referrals WHERE referred_id = $1',
      [referredId]
    );
    return result.rows.length > 0;
  }

  // Получить реферера пользователя
  static async getReferrer(referredId) {
    const result = await pool.query(
      `SELECT r.*, u.max_user_id, u.username 
       FROM referrals r
       JOIN users u ON r.referrer_id = u.id
       WHERE r.referred_id = $1`,
      [referredId]
    );
    return result.rows[0];
  }

  // Получить статистику рефералов
  static async getStats(referrerId) {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_invited,
        COUNT(CASE WHEN r.reward_issued = TRUE THEN 1 END) as paid_count
       FROM referrals r
       WHERE r.referrer_id = $1`,
      [referrerId]
    );
    return result.rows[0];
  }

  // Отметить выдачу награды
  static async markRewardIssued(referralId) {
    const result = await pool.query(
      `UPDATE referrals 
       SET reward_issued = TRUE
       WHERE id = $1 
       RETURNING *`,
      [referralId]
    );
    return result.rows[0];
  }

  // Получить рефералов без награды
  static async getUnrewardedReferrals(referrerId) {
    const result = await pool.query(
      `SELECT r.*, u.max_user_id 
       FROM referrals r
       JOIN users u ON r.referred_id = u.id
       WHERE r.referrer_id = $1 AND r.reward_issued = FALSE`,
      [referrerId]
    );
    return result.rows;
  }
}

module.exports = ReferralModel;
