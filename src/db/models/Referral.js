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
        COUNT(DISTINCT c.seq) as paid_count
       FROM referrals r
       LEFT JOIN coupons c ON c.user_id = r.referrer_id AND c.code LIKE 'SALE-%'
       WHERE r.referrer_id = $1`,
      [referrerId]
    );
    return result.rows[0];
  }

  // Получить рефералов без награды
  static async getUnrewardedReferrals(referrerId) {
    const result = await pool.query(
      `SELECT r.*, u.max_user_id 
       FROM referrals r
       JOIN users u ON r.referred_id = u.id
       LEFT JOIN coupons c ON c.user_id = r.referrer_id 
         AND c.code LIKE 'SALE-%'
         AND EXISTS (
           SELECT 1 FROM referrals r2 
           WHERE r2.referred_id = u.id 
           AND r2.referrer_id = r.referrer_id
         )
       WHERE r.referrer_id = $1 AND c.seq IS NULL`,
      [referrerId]
    );
    return result.rows;
  }
}

module.exports = ReferralModel;
