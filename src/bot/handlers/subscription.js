const PaymentService = require('../../services/payment');
const PaymentModel = require('../../db/models/Payment');
const CouponModel = require('../../db/models/Coupon');
const stateManager = require('../states');
const InlineKeyboards = require('../keyboards/inline');
const config = require('../../config');
const { Keyboard } = require('@maxhub/max-bot-api');

async function subscriptionHandler(bot) {
  // Показать тарифы
  bot.action('menu_subscription', async (ctx) => {
    try {
      const message = `🛒 Выбор тарифа\n\n` +
        `Доступные тарифы:\n` +
        config.tariffs.map(t => `• ${t.label} - ${t.price}₽`).join('\n') +
        `\n\nВыберите подходящий тариф:`;

      await ctx.reply(message, {
        attachments: [InlineKeyboards.tariffSelection()],
      });
    } catch (error) {
      await ctx.reply('🛒 Выбор тарифа\n\nВыберите тариф:', {
        attachments: [InlineKeyboards.tariffSelection()],
      });
    }
  });

  // Выбор конкретного тарифа
  bot.action(/tariff_(\d+)/, async (ctx) => {
    try {
      const match = ctx.match[1];
      const days = parseInt(match);
      const tariff = PaymentService.getTariffInfo(days);
      
      if (!tariff) {
        return ctx.reply('❌ Тариф не найден');
      }

      const user = ctx.userState;
      
      // Проверяем купоны пользователя и автоматически применяем первый активный
      const coupons = await CouponModel.getUserCoupons(user.id);
      
      let discountPercent = 0;
      let couponCode = null;
      
      if (coupons.length > 0) {
        // Автоматически используем первый купон
        discountPercent = coupons[0].discount_percent;
        couponCode = coupons[0].code;
        console.log('[Subscription] Auto-applied coupon:', couponCode, 'Discount:', discountPercent + '%');
      }
      
      // Сразу показываем оплату с примененной скидкой
      await showPaymentInfo(ctx, user, tariff, discountPercent, couponCode);
    } catch (error) {
      console.error('Tariff Selection Error:', error);
      await ctx.reply('❌ Ошибка при выборе тарифа');
    }
  });

  // Пропуск купона
  bot.action(/skip_coupon_(\d+)/, async (ctx) => {
    const days = parseInt(ctx.match[1]);
    const tariff = PaymentService.getTariffInfo(days);
    const user = ctx.userState;
    
    console.log('[Subscription Handler] skip_coupon, user:', user?.id, 'max_user_id:', user?.max_user_id);
    
    await showPaymentInfo(ctx, user, tariff, 0);
  });

  // Обработка ввода купона
  bot.on('message_created', async (ctx, next) => {
    const state = stateManager.get(ctx.user?.user_id);
    
    if (state?.state === 'waiting_coupon') {
      const code = ctx.message?.body?.text?.trim();
      
      if (!code) return next();

      const isValid = await CouponModel.isValid(code);
      
      if (!isValid) {
        return ctx.reply('❌ Купон не найден или истёк. Попробуйте другой или пропустите.');
      }

      const coupon = await CouponModel.findByCode(code);
      const tariff = PaymentService.getTariffInfo(state.data.tariffDays);
      const user = ctx.userState;

      await showPaymentInfo(ctx, user, tariff, coupon.discount_percent, code);
    } else {
      return next();
    }
  });
}

// Показать информацию об оплате
async function showPaymentInfo(ctx, user, tariff, discountPercent, couponCode = null) {
  const finalPrice = PaymentService.calculateFinalPrice(tariff.price, discountPercent);
  const sberLink = PaymentService.generateSberLink(config.sber.phone, finalPrice);

  let message = `💳 Оплата через Сбербанк\n\n`;
  message += `Тариф: ${tariff.label}\n`;
  
  if (discountPercent > 0) {
    message += `Скидка: ${discountPercent}%\n`;
    message += `~~${tariff.price}₽~~ → **${finalPrice}₽**\n\n`;
  } else {
    message += `Сумма: **${finalPrice}₽**\n\n`;
  }

  message += `📱 Ссылка для оплаты:\n${sberLink}\n\n`;
  message += `Или перевод по номеру ${config.sber.phone}\n`;
  message += `На имя: ${config.sber.recipientName}\n\n`;
  message += `После оплаты отправьте .pdf файл или скриншот чека в этот чат.`;

  // Сохраняем состояние ожидания чека
  console.log('[Subscription Handler] Setting state for user:', user.max_user_id);
  stateManager.set(user.max_user_id, 'waiting_receipt', {
    tariffDays: tariff.days,
    originalPrice: tariff.price,
    discountPercent,
    finalPrice,
    couponCode,
  });
  
  // Проверяем, что состояние сохранено
  const checkState = stateManager.get(user.max_user_id);
  console.log('[Subscription Handler] State saved:', checkState?.state);

  await ctx.reply(message, {
    attachments: [
      Keyboard.inlineKeyboard([
        [Keyboard.button.callback('📎 Я оплатил, прикрепить чек', 'upload_receipt')],
        [Keyboard.button.callback('« Назад', 'menu_main')],
      ])
    ],
    format: 'markdown',
  });
}

module.exports = subscriptionHandler;
