const pool = require('../pool');
const crypto = require('crypto');

class CouponModel {
  // Генерация уникального кода купона
  static generateCode(prefix = 'SALE') {
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `${prefix}-${random}`;
  }

  // Создание купона
  static async create(userId, discountPercent, validUntil) {
    const code = this.generateCode();
    const result = await pool.query(
      `INSERT INTO coupons (code, user_id, discount_percent, valid_until)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [code, userId, discountPercent, validUntil]
    );
    return result.rows[0];
  }

  // Поиск купона по коду
  static async findByCode(code) {
    const result = await pool.query('SELECT * FROM coupons WHERE code = $1', [code]);
    return result.rows[0];
  }

  // Проверка валидности купона
  static async isValid(code) {
    const coupon = await this.findByCode(code);
    if (!coupon) return false;
    if (coupon.used) return false;
    if (new Date(coupon.valid_until) < new Date()) return false;
    return true;
  }

  // Использование купона
  static async useCoupon(code) {
    const result = await pool.query(
      `UPDATE coupons 
       SET used = TRUE, used_at = NOW()
       WHERE code = $1 
       RETURNING *`,
      [code]
    );
    return result.rows[0];
  }

  // Получить активные купоны пользователя
  static async getUserCoupons(userId) {
    const result = await pool.query(
      `SELECT * FROM coupons 
       WHERE user_id = $1 AND used = FALSE AND valid_until > NOW()
       ORDER BY valid_until ASC`,
      [userId]
    );
    return result.rows;
  }
}

module.exports = CouponModel;
