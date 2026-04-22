const UserModel = require('../../db/models/User');
const CouponModel = require('../../db/models/Coupon');
const ReferralModel = require('../../db/models/Referral');
const XuiService = require('../../services/xui');
const InlineKeyboards = require('../keyboards/inline');
const { Keyboard } = require('@maxhub/max-bot-api');

async function dashboardHandler(bot) {
  bot.action('menu_dashboard', async (ctx) => {
    try {
      const user = ctx.userState;
      if (!user) return;

      // Форматируем дату окончания подписки
      let subscriptionText = '❌ Неактивна';
      if (user.subscription_end) {
        const endDate = new Date(user.subscription_end);
        if (endDate > new Date()) {
          const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
          subscriptionText = `✅ Активна до ${endDate.toLocaleDateString('ru-RU')} (${daysLeft} дн.)`;
        }
      }

      // Получаем трафик
      let trafficText = '📊 Трафик: загружается...';
      if (user.uuid) {
        try {
          const traffic = await XuiService.getClientTraffic(`user_${user.id}`);
          if (traffic) {
            const totalGB = (traffic.total / (1024 * 1024 * 1024)).toFixed(2);
            trafficText = `📊 Трафик: ${totalGB} ГБ`;
          }
        } catch (error) {
          trafficText = '📊 Трафик: недоступно';
        }
      }

      // Получаем купоны
      const coupons = await CouponModel.getUserCoupons(user.id);
      let couponsText = '🎟️ Купоны: нет активных купонов';
      if (coupons.length > 0) {
        couponsText = '🎟️ Ваши купоны:\n' + coupons.map(c => 
          `• ${c.code} (${c.discount_percent}%, до ${new Date(c.valid_until).toLocaleDateString('ru-RU')})`
        ).join('\n');
      }

      // Получаем статистику рефералов
      const refStats = await ReferralModel.getStats(user.id);
      const referralText = `👥 Рефералы:\nПриглашено: ${refStats.total_invited}\nОплатили: ${refStats.paid_count}\nЗаработано купонов: ${refStats.paid_count}`;

      const message = `👤 Личный кабинет\n\n📅 Подписка: ${subscriptionText}\n${trafficText}\n\n${couponsText}\n\n${referralText}`;

      await ctx.reply(message, {
        attachments: [InlineKeyboards.dashboardMenu()],
      });
    } catch (error) {
      console.error('Dashboard Handler Error:', error);
      await ctx.reply('❌ Ошибка при загрузке данных');
    }
  });

  // Обработчик кнопки "Инструкция по подключению"
  bot.action('menu_instruction', async (ctx) => {
    try {
      // Показываем выбор приложения (как в admin.js)
      await ctx.reply(
        '📱 **Выберите приложение для подключения**\n\n' +
        'Для каждого приложения есть видео-инструкция:',
        {
          format: 'markdown',
          attachments: [
            Keyboard.inlineKeyboard([
              [Keyboard.button.callback('V2Ray (Windows/Mac)', 'app_select_v2ray')],
              [Keyboard.button.callback('oneXray (Mac/iOS)', 'app_select_onexray')],
              [Keyboard.button.callback('Hiddify (Android/iOS)', 'app_select_hiddify')],
              [Keyboard.button.callback('« Назад', 'menu_dashboard')],
            ])
          ]
        }
      );
    } catch (error) {
      console.error('[Instruction] Error:', error);
      await ctx.reply('❌ Ошибка при загрузке инструкции');
    }
  });
}

module.exports = dashboardHandler;
