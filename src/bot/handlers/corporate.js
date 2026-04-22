const InlineKeyboards = require('../keyboards/inline');
const { Keyboard } = require('@maxhub/max-bot-api');

async function corporateHandler(bot) {
  bot.action('menu_corporate', async (ctx) => {
    try {
      const message = `🏢 Корпоративные тарифы\n\n` +
        `Решения для бизнеса любого масштаба:\n\n` +
        `**Стартовый** (100 слотов)\n` +
        `• До 100 одновременных подключений\n` +
        `• Выделенный сервер\n` +
        `• Приоритетная поддержка\n\n` +
        `**Бизнес** (500 слотов)\n` +
        `• До 500 одновременных подключений\n` +
        `• Выделенный сервер\n` +
        `• VIP поддержка 24/7\n\n` +
        `💡 Индивидуальная настройка под ваши задачи\n\n` +
        `Для подключения свяжитесь с основателем через раздел 🆘 Поддержка`;

      await ctx.reply(message, {
        attachments: [
          Keyboard.inlineKeyboard([
            [Keyboard.button.callback('🆘 Связаться с нами', 'menu_support')],
            [Keyboard.button.callback('« Главное меню', 'menu_main')],
          ])
        ],
        format: 'markdown',
      });
    } catch (error) {
      console.error('Corporate Handler Error:', error);
      await ctx.reply('❌ Ошибка при загрузке информации');
    }
  });
}

module.exports = corporateHandler;
