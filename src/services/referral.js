const config = require('../config');

class ReferralService {
  // Генерация уникального реферального кода
  static generateReferralCode(userId) {
    // Формат: VPN + userId + случайные символы
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `VPN${userId}${random}`;
  }

  // Проверка формата реферального кода
  static validateReferralCode(code) {
    if (!code) return null;
    
    // Формат: VPN{число}{4 символа}
    const match = code.match(/^VPN(\d+)[A-Z0-9]{4}$/);
    if (match) {
      return parseInt(match[1]);
    }
    return null;
  }
}

module.exports = ReferralService;
