const cron = require('node-cron');
const UserModel = require('../db/models/User');
const config = require('../config');

class CronService {
  constructor() {
    this.tasks = [];
  }

  // Запуск всех cron задач
  start() {
    console.log('⏰ Запуск планировщика задач...');

    // Ежедневная проверка истекающих подписок (в 10:00)
    this.tasks.push(
      cron.schedule('0 10 * * *', async () => {
        console.log('📅 Проверка истекающих подписок...');
        await this.checkExpiringSubscriptions();
      })
    );

    // Проверка истекших подписок каждый час
    this.tasks.push(
      cron.schedule('0 * * * *', async () => {
        console.log('🔒 Проверка истекших подписок...');
        await this.checkExpiredSubscriptions();
      })
    );

    // Очистка старых состояний каждый час
    this.tasks.push(
      cron.schedule('30 * * * *', async () => {
        const stateManager = require('./bot/states');
        stateManager.cleanup();
      })
    );

    console.log('✅ Планировщик задач запущен');
  }

  // Проверка подписок, истекающих через 7, 3 и 1 день
  async checkExpiringSubscriptions() {
    try {
      const XuiService = require('./xui');

      // Подписки через 7 дней
      const expiring7Days = await UserModel.getExpiringSubscriptions(7);
      for (const user of expiring7Days) {
        const daysLeft = Math.ceil((new Date(user.subscription_end) - new Date()) / (1000 * 60 * 60 * 24));
        
        // Отправляем уведомление
        await this.sendNotification(user.max_user_id,
          `ℹ️ Ваша подписка истекает через ${daysLeft} дней.\n\n` +
          `Дата окончания: ${new Date(user.subscription_end).toLocaleDateString('ru-RU')}\n\n` +
          `Продлите подписку заранее, чтобы не потерять доступ к VPN.\n\n` +
          `Нажмите /start → Купить подписку для продления.`
        );
      }

      // Подписки через 3 дня
      const expiring3Days = await UserModel.getExpiringSubscriptions(3);
      for (const user of expiring3Days) {
        const daysLeft = Math.ceil((new Date(user.subscription_end) - new Date()) / (1000 * 60 * 60 * 24));
        
        // Отправляем уведомление
        await this.sendNotification(user.max_user_id,
          `⚠️ Ваша подписка истекает через ${daysLeft} дн.\n\n` +
          `Дата окончания: ${new Date(user.subscription_end).toLocaleDateString('ru-RU')}\n\n` +
          `Продлите подписку, чтобы не потерять доступ к VPN.`
        );
      }

      // Подписки через 1 день
      const expiring1Day = await UserModel.getExpiringSubscriptions(1);
      for (const user of expiring1Day) {
        await this.sendNotification(user.max_user_id,
          `🚨 Ваша подписка истекает ЗАВТРА!\n\n` +
          `Дата окончания: ${new Date(user.subscription_end).toLocaleDateString('ru-RU')}\n\n` +
          `Не забудьте продлить подписку!`
        );
      }

      if (expiring7Days.length > 0 || expiring3Days.length > 0 || expiring1Day.length > 0) {
        console.log(`📨 Отправлено уведомлений: ${expiring7Days.length + expiring3Days.length + expiring1Day.length}`);
      }
    } catch (error) {
      console.error('Check Expiring Subscriptions Error:', error);
    }
  }

  // Проверка истекших подписок
  async checkExpiredSubscriptions() {
    try {
      const XuiService = require('./xui');
      const expiredUsers = await UserModel.getExpiredSubscriptions();

      for (const user of expiredUsers) {
        // Отключаем клиента в 3X-UI
        if (user.uuid) {
          try {
            await XuiService.deleteClient(config.xui.inboundId, user.uuid);
            console.log(`🔒 Отключён клиент: user_${user.id}`);
          } catch (error) {
            console.error(`Failed to delete client user_${user.id}:`, error.message);
          }
        }

        // Отправляем уведомление
        await this.sendNotification(user.max_user_id,
          `❌ Ваша подписка истекла.\n\n` +
          `Доступ к VPN заблокирован.\n\n` +
          `Для возобновления доступа приобретите новую подписку.`
        );
      }

      if (expiredUsers.length > 0) {
        console.log(`🔒 Отключено пользователей: ${expiredUsers.length}`);
      }
    } catch (error) {
      console.error('Check Expired Subscriptions Error:', error);
    }
  }

  // Отправка уведомления пользователю
  async sendNotification(maxUserId, message) {
    try {
      const { Bot } = require('@maxhub/max-bot-api');
      const bot = new Bot(config.botToken);
      
      await bot.api.sendMessageToUser(maxUserId, message);
    } catch (error) {
      console.error(`Failed to send notification to ${maxUserId}:`, error.message);
    }
  }

  // Остановка всех задач
  stop() {
    for (const task of this.tasks) {
      task.stop();
    }
    console.log('⏰ Планировщик задач остановлен');
  }
}

module.exports = new CronService();
