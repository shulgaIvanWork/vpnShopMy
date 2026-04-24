const { Bot } = require('@maxhub/max-bot-api');
const config = require('./src/config');
const authMiddleware = require('./src/bot/middleware/auth');
const cronService = require('./src/services/cron');
const { runMigrations } = require('./src/db/migrations');

// Импорт обработчиков
const startHandler = require('./src/bot/handlers/start');
const mainMenuHandler = require('./src/bot/handlers/main_menu');
const dashboardHandler = require('./src/bot/handlers/dashboard');
const subscriptionHandler = require('./src/bot/handlers/subscription');
const receiptHandler = require('./src/bot/handlers/receipt');
const appSelectionHandler = require('./src/bot/handlers/app_selection');
const referralHandler = require('./src/bot/handlers/referral');
const supportHandler = require('./src/bot/handlers/support');
const adminHandler = require('./src/bot/handlers/admin');
const corporateHandler = require('./src/bot/handlers/corporate');
const fallbackHandler = require('./src/bot/handlers/fallback');

async function main() {
  console.log('🚀 Запуск MAX VPN Bot...');

  // Выполняем миграции базы данных
  await runMigrations();

  // Создаём экземпляр бота
  const bot = new Bot(config.botToken);

  // Подключаем middleware
  bot.use(authMiddleware);

  // Общий обработчик для отладки - показывает все входящие сообщения
  bot.on('message_created', async (ctx, next) => {
    console.log('[DEBUG] Incoming message:', {
      userId: ctx.user?.user_id,
      text: ctx.message?.body?.text,
      hasPayload: !!ctx.payload,
      payload: ctx.payload,
      hasAttachments: !!ctx.message?.body?.attachments,
      attachmentCount: ctx.message?.body?.attachments?.length || 0,
      attachments: ctx.message?.body?.attachments?.map(a => ({
        type: a.type,
        hasPayload: !!a.payload,
        payloadKeys: a.payload ? Object.keys(a.payload) : []
      }))
    });
    return next();
  });

  // Регистрируем обработчики
  console.log('[Main] Registering handlers...');
  await startHandler(bot);
  await mainMenuHandler(bot);
  await dashboardHandler(bot);
  await subscriptionHandler(bot);
  await referralHandler(bot);
  await supportHandler(bot);
  await adminHandler(bot);
  await corporateHandler(bot);
  await receiptHandler(bot); // ДО fallback - чтобы обработать чеки
  await appSelectionHandler(bot); // Обработчик выбора приложения
  await fallbackHandler(bot); // Последний - обрабатывает все остальное
  console.log('[Main] All handlers registered');

  // Обработка ошибок
  bot.on('error', (error) => {
    console.error('Bot Error:', error);
  });

  // Запускаем бота
  console.log('[Main] Starting bot...');
  
  // Обработка первого открытия диалога
  bot.on('dialog_open', async (ctx) => {
    console.log('[Dialog Open] Event triggered!');
    console.log('[Dialog Open] Context:', {
      userId: ctx.user?.user_id,
      username: ctx.user?.username,
      hasReply: !!ctx.reply,
      hasApi: !!ctx.api
    });
    
    try {
      const maxUserId = ctx.user?.user_id;
      const username = ctx.user?.username;
      
      if (!maxUserId) {
        console.error('[Dialog Open] No user_id in context!');
        return;
      }
      
      console.log('[Dialog Open] Creating user:', maxUserId);
      
      // Создаем пользователя
      const UserModel = require('./src/db/models/User');
      const user = await UserModel.findOrCreate(maxUserId, username);
      console.log('[Dialog Open] User created/loaded:', user.id);
      
      // Отправляем приветствие
      const InlineKeyboards = require('./src/bot/keyboards/inline');
      console.log('[Dialog Open] Sending welcome message...');
      
      await ctx.reply(
        '🚀 Добро пожаловать в MAX VPN Bot!\n\n' +
        'Автоматизированная продажа VPN-подписок\n' +
        '✅ Быстрое подключение\n' +
        '✅ Безлимитный трафик\n' +
        '✅ Поддержка 24/7\n\n' +
        'Используйте меню ниже для навигации:',
        {
          attachments: [InlineKeyboards.mainMenu()],
          format: 'markdown'
        }
      );
      
      console.log('[Dialog Open] Welcome message sent successfully!');
    } catch (error) {
      console.error('[Dialog Open] Error:', error);
      console.error('[Dialog Open] Stack:', error.stack);
    }
  });
  
  // Обработка ошибок сети с автоматическим рестартом бота
  let isRestarting = false;
  
  process.on('uncaughtException', (error) => {
    // Сетевые ошибки - перезапускаем бота
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || 
        error.code === 'UND_ERR_SOCKET' || error.code === 'EAI_AGAIN' ||
        (error.cause && (error.cause.code === 'ECONNRESET' || error.cause.code === 'UND_ERR_SOCKET' || error.cause.code === 'EAI_AGAIN'))) {
      console.error('[Network] Critical connection error:', error.message);
      console.error('[Network] Restarting bot to recover connection...');
      
      if (!isRestarting) {
        isRestarting = true;
        // Даем 5 секунд на стабилизацию сети и перезапускаем процесс
        setTimeout(() => {
          console.error('[Network] Restarting process...');
          process.exit(1);  // Docker автоматически перезапустит контейнер
        }, 5000);
      }
    } else {
      console.error('[Uncaught Exception]', error);
      console.error('[Uncaught Exception] Stack:', error.stack);
      process.exit(1);
    }
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    // Сетевые ошибки - перезапускаем бота
    if (reason && (reason.code === 'ECONNRESET' || reason.code === 'UND_ERR_SOCKET' || reason.code === 'EAI_AGAIN' ||
        (reason.cause && (reason.cause.code === 'ECONNRESET' || reason.cause.code === 'UND_ERR_SOCKET' || reason.cause.code === 'EAI_AGAIN')))) {
      console.error('[Network] Unhandled rejection - connection error:', reason.message);
      console.error('[Network] Restarting bot to recover connection...');
      
      if (!isRestarting) {
        isRestarting = true;
        // Даем 5 секунд на стабилизацию сети и перезапускаем процесс
        setTimeout(() => {
          console.error('[Network] Restarting process...');
          process.exit(1);  // Docker автоматически перезапустит контейнер
        }, 5000);
      }
    } else {
      console.error('[Unhandled Rejection] at:', promise, 'reason:', reason);
      process.exit(1);
    }
  });
  
  bot.start();
  
  console.log('✅ Бот успешно запущен!');
  
  // Запускаем cron задачи
  cronService.start();
}

// Запуск с обработкой ошибок
main().catch((error) => {
  console.error('Failed to start bot:', error);
  process.exit(1);
});
