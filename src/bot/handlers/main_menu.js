const InlineKeyboards = require('../keyboards/inline');
const stateManager = require('../states');

async function mainMenuHandler(bot) {
  console.log('[Main Menu Handler] Registering menu_main action');
  
  // Обработка кнопки "Главное меню"
  bot.action('menu_main', async (ctx) => {
    try {
      // Сбрасываем любые состояния ожидания ввода
      stateManager.delete(ctx.user?.user_id);
      
      await ctx.reply('🏠 Главное меню\n\nВыберите раздел:', {
        attachments: [InlineKeyboards.mainMenu()],
      });
    } catch (error) {
      console.error('[Main Menu Handler] Error:', error);
    }
  });
}

module.exports = mainMenuHandler;
