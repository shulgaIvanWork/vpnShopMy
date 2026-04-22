const config = require('../config');

class PaymentService {
  // Расчёт финальной цены с учётом скидки
  static calculateFinalPrice(basePrice, discountPercent = 0) {
    return Math.round(basePrice * (1 - discountPercent / 100));
  }

  // Генерация ссылки для оплаты через Сбер
  static generateSberLink(phone, sum) {
    return `https://www.sberbank.ru/ru/choise_bank?requisiteNumber=${phone}&bankCode=100000000111&sum=${sum}`;
  }

  // Получение информации о тарифе
  static getTariffInfo(days) {
    return config.tariffs.find(t => t.days === days);
  }

  // Форматирование цены
  static formatPrice(price) {
    return `${price}₽`;
  }
}

module.exports = PaymentService;
