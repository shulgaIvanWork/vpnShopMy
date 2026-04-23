const PaymentModel = require('../../db/models/Payment');
const UserModel = require('../../db/models/User');
const XuiService = require('../../services/xui');
const ReferralModel = require('../../db/models/Referral');
const CouponModel = require('../../db/models/Coupon');
const config = require('../../config');
const crypto = require('crypto');
const { Keyboard } = require('@maxhub/max-bot-api');

async function adminHandler(bot) {
  // Одобрение платежа
  bot.action(/admin_approve_(\d+)/, async (ctx) => {
    const maxUserId = ctx.user?.user_id;
    if (!config.botAdmins.includes(maxUserId)) {
      return ctx.reply('❌ У вас нет прав администратора');
    }

    try {
      const paymentId = parseInt(ctx.match[1]);
      const payment = await PaymentModel.findById(paymentId);

      if (!payment) {
        return ctx.reply('❌ Платёж не найден');
      }

      if (payment.status !== 'pending') {
        return ctx.reply('❌ Платёж уже обработан');
      }

      // Обновляем статус платежа
      await PaymentModel.updateStatus(paymentId, 'approved');

      // Активируем подписку
      const user = await UserModel.findById(payment.user_id);
      
      // ВАЖНО: Если подписка ещё активна, добавляем дни к текущей дате окончания
      // Если истекла или нет подписки - отсчитываем от текущего момента
      const now = new Date();
      let subscriptionEnd;
      
      if (user.subscription_end && new Date(user.subscription_end) > now) {
        // Продление - добавляем к текущей дате окончания
        subscriptionEnd = new Date(user.subscription_end);
        subscriptionEnd.setDate(subscriptionEnd.getDate() + payment.tariff_days);
        console.log('[Admin] Subscription renewal. Old end:', user.subscription_end, 'New end:', subscriptionEnd);
      } else {
        // Новая подписка - отсчитываем от сейчас
        subscriptionEnd = new Date();
        subscriptionEnd.setDate(subscriptionEnd.getDate() + payment.tariff_days);
        console.log('[Admin] New subscription. End date:', subscriptionEnd);
      }

      // Генерируем или используем существующий UUID
      let uuid = user.uuid || crypto.randomUUID();
      
      // Получаем первый сервер
      const server = config.xui.servers[0];
      
      // Формируем email БЕЗ connection name (xui.js добавит сам)
      const email = `user_${user.id}`;
      
      const isNewClient = !user.uuid;
      let vpnLink = null;
      
      console.log('[Admin] Server:', server ? server.name : 'default');
      console.log('[Admin] Connection name:', server ? server.name : 'Damirov_VPN_Turkey');
      console.log('[Admin] Email for 3X-UI (base):', email);

      // Работаем с 3X-UI
      try {
        if (isNewClient) {
          // Новый клиент - создаём
          console.log('[Admin] Creating new 3X-UI client:', email);
          console.log('[Admin] Server:', server.name);
          console.log('[Admin] Inbound ID:', server.inboundId || config.xui.inboundId);
          console.log('[Admin] UUID:', uuid);
          console.log('[Admin] Expiry:', subscriptionEnd.getTime(), '(', subscriptionEnd.toISOString(), ')');
          
          const addResult = await XuiService.addClient(
            server.inboundId || config.xui.inboundId,
            email,
            uuid,
            0, // limitIp
            subscriptionEnd.getTime()
          );
          
          console.log('[Admin] Add client result:', JSON.stringify(addResult, null, 2));
          
          // Обновляем пользователя в БД
          await UserModel.updateSubscription(user.id, subscriptionEnd, uuid);
          console.log('[Admin] New client saved to DB with UUID:', uuid);
        } else {
          // Продление - обновляем срок существующего клиента
          console.log('[Admin] ====== RENEWAL MODE ======');
          console.log('[Admin] Updating existing 3X-UI client:', email);
          console.log('[Admin] Server:', server.name);
          console.log('[Admin] DB UUID:', uuid);
          console.log('[Admin] Old expiry:', user.subscription_end);
          console.log('[Admin] New expiry:', subscriptionEnd.getTime(), '(', subscriptionEnd.toISOString(), ')');
          console.log('[Admin] Inbound ID:', server.inboundId || config.xui.inboundId);
          
          const updateResult = await XuiService.updateClient(
            server.inboundId || config.xui.inboundId,
            uuid,
            subscriptionEnd.getTime()
          );
          
          console.log('[Admin] Update client result:', JSON.stringify(updateResult, null, 2));
          
          // Если UUID на сервере отличается от БД, используем UUID сервера
          const correctUuid = updateResult.realUuid || uuid;
          
          if (updateResult.realUuid && updateResult.realUuid !== uuid) {
            console.log('[Admin] UUID mismatch! Server:', updateResult.realUuid, 'DB:', uuid);
            console.log('[Admin] Using server UUID for database update');
          }
          
          // Обновляем пользователя в БД с правильным UUID
          await UserModel.updateSubscription(user.id, subscriptionEnd, correctUuid);
          
          // Сохраняем правильный UUID для генерации ссылки
          uuid = correctUuid;
          
          console.log('[Admin] ====== END RENEWAL ======');
        }
        
        // Генерируем ссылку vless
        const serverObj = config.xui.servers[0];
        const serverUrl = new URL(serverObj.url);
        const serverHost = serverUrl.hostname;
        const serverPort = 443;
        const connectionName = serverObj.name || 'Damirov_VPN_Turkey';
        
        vpnLink = `vless://${uuid}@${serverHost}:${serverPort}?type=ws&encryption=none&path=%2Fvpn&host=&security=none#${connectionName}-user_${user.id}`;
        
        console.log('[Admin] VPN link generated:', vpnLink);
      } catch (error) {
        console.error('[Admin] Failed to work with 3X-UI:', error.message);
        // Продолжаем даже если ошибка, чтобы не потерять оплату
      }

      // Проверяем реферала и выдаём купон
      const referral = await ReferralModel.getReferrer(user.id);
      if (referral && !referral.reward_issued) {
        const validUntil = new Date();
        validUntil.setFullYear(validUntil.getFullYear() + 1);

        await CouponModel.create(
          referral.referrer_id,
          config.referralDiscount,
          validUntil
        );

        await ReferralModel.markRewardIssued(referral.id);

        // Уведомляем реферера
        try {
          await bot.api.sendMessageToUser(referral.max_user_id,
            `🎉 Ваш реферал оплатил подписку!\n\n` +
            `Вам начислен купон на скидку ${config.referralDiscount}%\n` +
            `Купон будет доступен в личном кабинете.`
          );
        } catch (error) {
          console.error('Failed to notify referrer:', error);
        }
      }

      // Уведомляем пользователя
      if (isNewClient) {
        console.log('[Admin] === NEW CLIENT - CHECKING REFERRAL ===');
        console.log('[Admin] User ID:', user.id);
        console.log('[Admin] User max_user_id:', user.max_user_id);
        
        // ВАЖНО: Начисляем реферальный бонус пригласившему
        const ReferralModel = require('../../db/models/Referral');
        const CouponModel = require('../../db/models/Coupon');
        
        console.log('[Admin] Checking for referrer...');
        
        const referrer = await ReferralModel.getReferrer(user.id);
        
        if (referrer) {
          console.log('[Admin] ✓ Referral found!');
          console.log('[Admin] Referrer ID:', referrer.id);
          console.log('[Admin] Referrer max_user_id:', referrer.max_user_id);
          console.log('[Admin] Referrer username:', referrer.username);
          
          // Проверяем, не был ли уже создан купон для этого реферала
          const pool = require('../../db/pool');
          const existingCoupon = await pool.query(
            `SELECT c.seq FROM coupons c 
             JOIN referrals r ON r.referrer_id = c.user_id 
             WHERE r.referred_id = $1 AND c.user_id = $2
             LIMIT 1`,
            [user.id, referrer.id]
          );
          
          if (existingCoupon.rows.length > 0) {
            console.log('[Admin] Coupon already exists for this referral, skipping');
          } else {
            // Создаём купон для пригласившего
            const couponCode = CouponModel.generateCode();
            console.log('[Admin] Generated coupon code:', couponCode);
            
            await CouponModel.create(referrer.id, 10, new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)); // 10% на 365 дней
            console.log('[Admin] ✓ Coupon created in DB');
            
            // Уведомляем пригласившего
            try {
              console.log('[Admin] Sending notification to referrer...');
              await bot.api.sendMessageToUser(referrer.max_user_id,
                `🎉 Ваш друг присоединился к MAX VPN!\n\n` +
                `Вам начислен купон на скидку 10%!\n` +
                `Купон: \`${couponCode}\`\n\n` +
                `Используйте его при следующей оплате.`
              );
              console.log('[Admin] ✓ Referrer notified successfully');
            } catch (error) {
              console.error('[Admin] ✗ Failed to notify referrer:', error.message);
              console.error('[Admin] Error stack:', error.stack);
            }
          }
        } else {
          console.log('[Admin] ✗ No referrer found for user', user.id);
          console.log('[Admin] User was not referred by anyone');
        }
        
        // Новый клиент - предлагаем выбрать приложение
        await bot.api.sendMessageToUser(user.max_user_id, 
          `✅ Оплата подтверждена!\n\n` +
          `Тариф: ${payment.tariff_days} дней\n` +
          `Подписка активна до: ${subscriptionEnd.toLocaleDateString('ru-RU')}\n\n` +
          `Выберите приложение для получения ключа и инструкции:`,
          {
            attachments: [
              Keyboard.inlineKeyboard([
                [Keyboard.button.callback('v2ray', 'app_select_v2ray')],
                [Keyboard.button.callback('oneXray', 'app_select_onexray')],
                [Keyboard.button.callback('Hiddify', 'app_select_hiddify')],
              ])
            ]
          }
        );
      } else {
        // Продление - показываем ключ и кнопки
        const serverObj = config.xui.servers[0];
        const serverUrl = new URL(serverObj.url);
        const serverHost = serverUrl.hostname;
        const serverPort = 443;
        const connectionName = serverObj.name || 'Damirov_VPN_Turkey';
        const vpnLink = `vless://${uuid}@${serverHost}:${serverPort}?type=ws&encryption=none&path=%2Fvpn&host=&security=none#${connectionName}-user_${user.id}`;
        
        console.log('[Admin] Connection name:', connectionName);
        console.log('[Admin] VPN link:', vpnLink);
        
        // Сообщение 1: Информация о продлении
        await bot.api.sendMessageToUser(user.max_user_id, 
          `✅ Подписка продлена!\n\n` +
          `Тариф: ${payment.tariff_days} дней\n` +
          `Подписка активна до: ${subscriptionEnd.toLocaleDateString('ru-RU')}`
        );
        
        // Сообщение 2: Ключ для копирования
        await bot.api.sendMessageToUser(user.max_user_id,`${vpnLink}`);
        
        // Сообщение 3: Кнопки
        await bot.api.sendMessageToUser(user.max_user_id, 'Подписка активирована! 🎉', {
          attachments: [
            Keyboard.inlineKeyboard([
              [Keyboard.button.callback('📖 Инструкция по подключению', 'menu_instruction')],
              [Keyboard.button.callback('« Главное меню', 'menu_main')],
            ])
          ]
        });
      }

      await ctx.reply(`✅ Платёж #${paymentId} одобрен. Подписка активирована.`);
    } catch (error) {
      console.error('Admin Approve Error:', error);
      await ctx.reply('❌ Ошибка при обработке платежа');
    }
  });

  // Отклонение платежа
  bot.action(/admin_reject_(\d+)/, async (ctx) => {
    const maxUserId = ctx.user?.user_id;
    if (!config.botAdmins.includes(maxUserId)) {
      return ctx.reply('❌ У вас нет прав администратора');
    }

    try {
      const paymentId = parseInt(ctx.match[1]);
      const payment = await PaymentModel.findById(paymentId);

      if (!payment) {
        return ctx.reply('❌ Платёж не найден');
      }

      if (payment.status !== 'pending') {
        return ctx.reply('❌ Платёж уже обработан');
      }

      // Обновляем статус
      await PaymentModel.updateStatus(paymentId, 'rejected');

      // Уведомляем пользователя
      const user = await UserModel.findById(payment.user_id);
      await bot.api.sendMessageToUser(user.max_user_id,
        `❌ Ваша оплата #${paymentId} отклонена.\n\n` +
        `Сумма: ${payment.amount}₽\n\n` +
        `Пожалуйста, проверьте чек и попробуйте снова.`
      );

      await ctx.reply(`❌ Платёж #${paymentId} отклонён.`);
    } catch (error) {
      console.error('Admin Reject Error:', error);
      await ctx.reply('❌ Ошибка при обработке платежа');
    }
  });

  // Команда для просмотра pending платежей
  bot.command('pending', async (ctx) => {
    const maxUserId = ctx.user?.user_id;
    if (!config.botAdmins.includes(maxUserId)) {
      return ctx.reply('❌ У вас нет прав администратора');
    }

    try {
      const payments = await PaymentModel.getPendingPayments();

      if (payments.length === 0) {
        return ctx.reply('✅ Нет ожидающих платежей');
      }

      let message = `💰 Ожидающие платежи (${payments.length}):\n\n`;
      for (const p of payments) {
        message += `#${p.id} | ${p.username || p.max_user_id} | ${p.final_price}₽ | ${p.tariff_days} дн.\n`;
      }

      await ctx.reply(message);
    } catch (error) {
      console.error('Pending Payments Error:', error);
      await ctx.reply('❌ Ошибка при загрузке платежей');
    }
  });
}

module.exports = adminHandler;
