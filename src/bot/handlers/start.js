const UserModel = require('../../db/models/User');
const InlineKeyboards = require('../keyboards/inline');

async function startHandler(bot) {
  console.log('[Start Handler] Registering /start command');
  
  bot.command('start', async (ctx) => {
    console.log('[Start Handler] /start command received from:', ctx.user?.user_id);
    console.log('[Start Handler] Payload:', ctx.payload);
    console.log('[Start Handler] Message:', ctx.message?.body?.text);
    
    try {
      const maxUserId = ctx.user?.user_id;
      const username = ctx.user?.username;
      const startParam = ctx.payload?.deep_link || ctx.message?.body?.text?.replace('/start', '').trim();

      console.log('[Start Handler] Start param:', startParam);

      // Создаём или получаем пользователя
      const user = await UserModel.findOrCreate(maxUserId, username);
      console.log('[Start Handler] User created/found:', user.id);

      const welcomeText = '🚀 Добро пожаловать в MAX VPN Bot!\n\n' +
        'Автоматизированная продажа VPN-подписок\n' +
        '✅ Быстрое подключение\n' +
        '✅ Безлимитный трафик\n' +
        '✅ Поддержка 24/7\n\n' +
        'Используйте меню ниже для навигации:';

      console.log('[Start Handler] Sending welcome message');
      await ctx.reply(welcomeText, {
        attachments: [InlineKeyboards.mainMenu()],
        format: 'markdown',
      });
      console.log('[Start Handler] Welcome message sent successfully');
    } catch (error) {
      console.error('[Start Handler] Error:', error);
      await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
  });
}

module.exports = startHandler;
