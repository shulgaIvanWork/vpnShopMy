const PaymentModel = require('../../db/models/Payment');
const stateManager = require('../states');
const config = require('../../config');
const InlineKeyboards = require('../keyboards/inline');
const { Keyboard } = require('@maxhub/max-bot-api');

async function receiptHandler(bot) {
  // Обработчик кнопки "Я оплатил, прикрепить чек"
  bot.action('upload_receipt', async (ctx) => {
    const userId = ctx.user?.user_id;
    const state = stateManager.get(userId);
    
    console.log('[Receipt Handler] upload_receipt button clicked');
    console.log('[Receipt Handler] userId:', userId);
    console.log('[Receipt Handler] ctx.userState:', ctx.userState?.id, ctx.userState?.max_user_id);
    console.log('[Receipt Handler] state from manager:', state?.state);
    
    if (state?.state !== 'waiting_receipt') {
      console.log('[Receipt Handler] State mismatch! Expected: waiting_receipt, Got:', state?.state);
      return ctx.reply('❌ Сначала выберите тариф.');
    }

    await ctx.reply(
      '📎 Отправьте .pdf файл или скриншот чека об оплате одним сообщением:',
      {
        attachments: [
          Keyboard.inlineKeyboard([
            [Keyboard.button.callback('« Отмена', 'menu_main')],
          ])
        ]
      }
    );
  });

  // Обработчик отмены загрузки чека
  bot.action('cancel_receipt', async (ctx) => {
    stateManager.delete(ctx.user?.user_id);
    await ctx.reply('❌ Загрузка чека отменена.');
  });
  // Обработка получения чека (скриншота)
  bot.on('message_created', async (ctx, next) => {
    const state = stateManager.get(ctx.user?.user_id);
    
    console.log('[Receipt Handler] State:', state?.state, 'User:', ctx.user?.user_id);
    
    // Если не ожидаем чек, пропускаем
    if (state?.state !== 'waiting_receipt') {
      return next();
    }

    try {
      const user = ctx.userState;
      if (!user) {
        return ctx.reply('❌ Ошибка: пользователь не найден');
      }

      // Проверяем, есть ли вложения
      const attachments = ctx.message?.body?.attachments || [];
      console.log('[Receipt Handler] Attachments:', JSON.stringify(attachments, null, 2));
      
      // В MAX Bot API вложения могут быть в payload
      const hasImage = attachments.some(att => {
        console.log('[Receipt Handler] Checking attachment:', {
          type: att.type,
          hasPayload: !!att.payload,
          payload: att.payload
        });
        
        // Проверяем разные варианты структуры
        if (att.type === 'image' || att.type === 'photo') return true;
        
        // Также принимаем файлы (PDF и т.д.)
        if (att.type === 'file') return true;
        
        // Проверяем payload
        if (att.payload) {
          const payloadKeys = Object.keys(att.payload);
          console.log('[Receipt Handler] Payload keys:', payloadKeys);
          
          // Если есть url, token, file_id/fileId или это объект с данными изображения
          if (att.payload.url || att.payload.token || att.payload.file_id || att.payload.fileId) return true;
          
          // Проверяем вложенные объекты
          for (const key of payloadKeys) {
            if (typeof att.payload[key] === 'object' && att.payload[key] !== null) {
              console.log('[Receipt Handler] Nested object:', key, att.payload[key]);
            }
          }
        }
        
        return false;
      });

      console.log('[Receipt Handler] Has image:', hasImage);

      if (!hasImage) {
        return ctx.reply('❌ Пожалуйста, отправьте .pdf файл или скриншот чека об оплате одним сообщением:');
      }

      // Создаём запись о платеже
      // В MAX Bot API mid - это строка, но в БД BIGINT. Используем seq вместо mid
      const messageId = ctx.message.body.seq || null;
      
      console.log('[Receipt Handler] Creating payment with messageId:', messageId);
      
      const payment = await PaymentModel.create(
        user.id,
        state.data.tariffDays,
        state.data.originalPrice,
        state.data.discountPercent,
        state.data.finalPrice,
        messageId // Используем seq вместо mid
      );

      // Если был использован купон, списываем его
      if (state.data.couponCode) {
        const CouponModel = require('../../db/models/Coupon');
        await CouponModel.useCoupon(state.data.couponCode);
      }

      // Очищаем состояние
      stateManager.delete(ctx.user.user_id);

      // Уведомляем пользователя
      await ctx.reply(
        `✅ Чек получен!\n\n` +
        `Ваш платёж #${payment.id} на сумму ${payment.final_price}₽ ожидает подтверждения.\n\n` +
        `Администратор проверит оплату в ближайшее время. Вы получите уведомление.`
      );

      // Уведомляем админов
      const InlineKeyboards = require('../keyboards/inline');
      const adminMessage = `💰 Новый платёж #${payment.id}\n\n` +
        `👤 Пользователь: ${user.username || user.max_user_id}\n` +
        `💵 Сумма: ${payment.final_price}₽\n` +
        `📅 Тариф: ${payment.tariff_days} дней\n` +
        (payment.discount_percent > 0 ? `🎟️ Скидка: ${payment.discount_percent}%\n` : '') +
        `\nЧек прикреплен ниже:\n`;

      // Получаем вложение из оригинального сообщения
      const receiptAttachment = ctx.message?.body?.attachments?.[0];

      for (const adminId of config.botAdmins) {
        try {
          // Отправляем сообщение с чеком и кнопками
          const messageOptions = {
            attachments: [
              ...(receiptAttachment ? [receiptAttachment] : []),
              InlineKeyboards.paymentActions(payment.id)
            ]
          };
          
          await bot.api.sendMessageToUser(adminId, adminMessage, messageOptions);
        } catch (error) {
          console.error(`Failed to notify admin ${adminId}:`, error);
        }
      }
    } catch (error) {
      console.error('Receipt Handler Error:', error);
      await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
  });
}

module.exports = receiptHandler;
