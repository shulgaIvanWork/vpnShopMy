const { Keyboard } = require('@maxhub/max-bot-api');
const config = require('../../config');

class InlineKeyboards {
  // Главное меню
  static mainMenu() {
    return Keyboard.inlineKeyboard([
      [Keyboard.button.callback('📱 Личный кабинет', 'menu_dashboard')],
      [Keyboard.button.callback('🛒 Купить подписку', 'menu_subscription')],
      [Keyboard.button.callback('👥 Реферальная программа', 'menu_referral')],
      [Keyboard.button.callback('🆘 Поддержка', 'menu_support')],
      [Keyboard.button.callback('🏢 Для бизнеса', 'menu_corporate')],
    ]);
  }

  // Меню тарифов
  static tariffSelection() {
    const buttons = config.tariffs.map(tariff => [
      Keyboard.button.callback(
        `${tariff.label} - ${tariff.price}₽`,
        `tariff_${tariff.days}`
      )
    ]);
    
    buttons.push([
      Keyboard.button.callback('« Назад', 'menu_main')
    ]);
    
    return Keyboard.inlineKeyboard(buttons);
  }

  // Меню личного кабинета
  static dashboardMenu() {
    return Keyboard.inlineKeyboard([
      [Keyboard.button.callback('📖 Инструкция по подключению', 'menu_instruction')],
      [Keyboard.button.callback('🔄 Обновить', 'menu_dashboard')],
      [Keyboard.button.callback('« Главное меню', 'menu_main')],
    ]);
  }

  // Меню реферальной программы
  static referralMenu() {
    return Keyboard.inlineKeyboard([
      [Keyboard.button.callback('📋 Скопировать ссылку', 'referral_copy_link')],
      [Keyboard.button.callback('« Главное меню', 'menu_main')],
    ]);
  }

  // Меню поддержки
  static supportMenu() {
    return Keyboard.inlineKeyboard([
      [Keyboard.button.callback('👨‍💼 Связаться с основателем', 'support_escalate')],
      [Keyboard.button.callback('« Главное меню', 'menu_main')],
    ]);
  }

  // Подтверждение оплаты (для админа)
  static paymentActions(paymentId) {
    return Keyboard.inlineKeyboard([
      [
        Keyboard.button.callback('✅ Одобрить', `admin_approve_${paymentId}`, { intent: 'positive' }),
        Keyboard.button.callback('❌ Отклонить', `admin_reject_${paymentId}`, { intent: 'negative' }),
      ],
    ]);
  }
}

module.exports = InlineKeyboards;
