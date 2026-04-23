const pool = require('../pool');

class PaymentModel {
  // Создание платежа
  static async create(userId, tariffDays, originalPrice, discountPercent, finalPrice, receiptMessageId = null) {
    const result = await pool.query(
      `INSERT INTO payments (user_id, tariff_days, amount, receipt_message_id, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [userId, tariffDays, finalPrice, receiptMessageId]
    );
    return result.rows[0];
  }
  
  // Поиск платежа по ID
  static async findById(paymentId) {
    const result = await pool.query('SELECT * FROM payments WHERE id = $1', [paymentId]);
    return result.rows[0];
  }

  // Получить все pending платежи
  static async getPendingPayments() {
    const result = await pool.query(
      `SELECT p.*, u.max_user_id, u.username 
       FROM payments p
       JOIN users u ON p.user_id = u.id
       WHERE p.status = 'pending'
       ORDER BY p.created_at DESC`
    );
    return result.rows;
  }

  // Обновление статуса платежа
  static async updateStatus(paymentId, status, adminId = null) {
    const result = await pool.query(
      `UPDATE payments 
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
      'SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }
}

module.exports = PaymentModel;
