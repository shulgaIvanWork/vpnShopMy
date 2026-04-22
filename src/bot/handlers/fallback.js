const InlineKeyboards = require('../keyboards/inline');
const stateManager = require('../states');

async function fallbackHandler(bot) {
  // Обработчик для всех сообщений, которые не попали в другие обработчики
  bot.on('message_created', async (ctx, next) => {
    const text = ctx.message?.body?.text?.trim();
    const hasAttachments = ctx.message?.body?.attachments?.length > 0;
    
    // Если это команда, пропускаем
    if (text && text.startsWith('/')) {
      return next();
    }

    // Проверяем, находимся ли мы в каком-то состоянии
    const state = stateManager.get(ctx.user?.user_id);
    
    // Если пользователь в состоянии ожидания чека, пропускаем - receipt handler должен обработать
    if (state?.state === 'waiting_receipt') {
      return next();
    }
    
    // Если пользователь в другом состоянии, другие обработчики должны это обработать
    if (state) {
      return next();
    }

    // ПЕРВОЕ СООБЩЕНИЕ от пользователя - показываем меню вместо AI
    const UserModel = require('../../db/models/User');
    const user = await UserModel.findByMaxUserId(ctx.user?.user_id);
    
    if (user && !user.subscription_end) {
      // Новый пользователь без подписки - показываем меню
      console.log('[Fallback] First message from new user, showing menu');
      const InlineKeyboards = require('../keyboards/inline');
      await ctx.reply(
        '👋 Добро пожаловать в MAX VPN!\n\n' +
        'Для начала введите /start',
      );
      return next();
    }

    // Если есть подписка и сообщение короткое/простое - не используем AI
    const simpleMessages = ['❤️', '👍', 'спасибо', 'ок', 'да', 'нет', 'привет', 'здравствуйте'];
    if (text && simpleMessages.some(msg => text.toLowerCase().includes(msg))) {
      console.log('[Fallback] Simple message, not using AI');
      return next();  // Просто игнорируем простые сообщения
    }

    // Если нет состояния и это не команда - отправляем в AI
    if (text || hasAttachments) {
      try {
        const aiService = require('../../services/ai');
        
        console.log('[Fallback] Sending to AI:', text || 'User sent attachment');
        const response = await aiService.ask(text || 'Пользователь отправил вложение');
        const confidence = aiService.estimateConfidence(response);
        
        console.log('[Fallback] AI confidence:', confidence);
        
        if (response === 'НЕ УВЕРЕН' || confidence < 0.5) {
          await ctx.reply(
            'Ниже находится базовое меню, используйте его для навигации\n\n' +
            'Если вопрос для поддержки, попробуйте перефразировать или выберите раздел в меню:',
            {
              attachments: [InlineKeyboards.mainMenu()]
            }
          );
        } else {
          await ctx.reply(response);
        }
      } catch (error) {
        console.error('[Fallback] AI Error:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
      }
    }
    
    return next();
  });
}

module.exports = fallbackHandler;
