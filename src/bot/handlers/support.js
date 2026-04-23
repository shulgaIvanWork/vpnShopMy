const InlineKeyboards = require('../keyboards/inline');
const config = require('../../config');
const { Keyboard } = require('@maxhub/max-bot-api');

async function supportHandler(bot) {
  // Меню поддержки - теперь только ссылка на основателя
  bot.action('menu_support', async (ctx) => {
    try {
      await ctx.reply(
        '24/7 работает AI ассистент, если есть вопросы сформулируйте ниже, он постарается ответить:\n\n' +
        '👨‍💼 Если это не помогло свяжитесь с основателем:\n' +
        'Напишите ему напрямую в личные сообщения.\n' +
        'https://max.ru/u/f9LHodD0cOIVTnPglVwxPknVtL1pMA1upbJBJrgd5ZI9GhD5PP3hkfBIjXo\n\n' +
        'Сайт основателя: https://shulga-ivan-dm.pro \n\n',
        {
          attachments: [
            Keyboard.inlineKeyboard([
              [Keyboard.button.callback('« Главное меню', 'menu_main')],
            ])
          ]
        }
      );
    } catch (error) {
      console.error('Support Menu Error:', error);
    }
  });
}

module.exports = supportHandler;
