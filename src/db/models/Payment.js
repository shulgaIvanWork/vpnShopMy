const pool = require('../pool');

class PaymentModel {
  // Создание платежа
  static async create(userId, tariffDays, originalPrice, discountPercent, finalPrice, receiptMessageId = null) {
    const result = await pool.query(
      `INSERT INTO manual_payments (user_id, tariff_days, original_price, discount_percent, final_price, receipt_message_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [userId, tariffDays, originalPrice, discountPercent, finalPrice, receiptMessageId]
    );
    return result.rows[0];
  }

  // Поиск платежа по ID
  static async findById(paymentId) {
    const result = await pool.query('SELECT * FROM manual_payments WHERE id = $1', [paymentId]);
    return result.rows[0];
  }

  // Получить все pending платежи
  static async getPendingPayments() {
    const result = await pool.query(
      `SELECT mp.*, u.max_user_id, u.username 
       FROM manual_payments mp
       JOIN users u ON mp.user_id = u.id
       WHERE mp.status = 'pending'
       ORDER BY mp.created_at DESC`
    );
    return result.rows;
  }

  // Обновление статуса платежа
  static async updateStatus(paymentId, status, adminId = null) {
    const result = await pool.query(
      `UPDATE manual_payments 
       SET status = $1, admin_id = $2, processed_at = NOW()
       WHERE id = $3 
       RETURNING *`,
      [status, adminId, paymentId]
    );
    return result.rows[0];
  }

  // Получить платежи пользователя
  static async getUserPayments(userId) {
    const result = await pool.query(
      'SELECT * FROM manual_payments WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }
}

module.exports = PaymentModel;
