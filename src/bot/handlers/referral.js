const ReferralService = require('../../services/referral');
const ReferralModel = require('../../db/models/Referral');
const { Keyboard } = require('@maxhub/max-bot-api');
const stateManager = require('../states');

async function referralHandler(bot) {
  bot.action('menu_referral', async (ctx) => {
    try {
      const user = ctx.userState;
      if (!user) return;

      // Генерируем или получаем реферальный код
      let referralCode = user.referral_code;
      if (!referralCode) {
        referralCode = ReferralService.generateReferralCode(user.id);
        // Сохраняем код в базе
        const pool = require('../../db/pool');
        await pool.query('UPDATE users SET referral_code = $1 WHERE id = $2', [referralCode, user.id]);
        console.log('[Referral] Generated code for user', user.id, ':', referralCode);
      }

      // Получаем статистику
      const stats = await ReferralModel.getStats(user.id);

      const message = `👥 Реферальная программа\n\n` +
        `Приглашайте друзей и получайте купоны на скидку 10%!\n\n` +
        `📊 Ваша статистика:\n` +
        `• Приглашено: ${stats.total_invited}\n` +
        `• Оплатили: ${stats.paid_count}\n` +
        `• Заработано купонов: ${stats.paid_count}\n\n` +
        `🔗 Ваш реферальный код:\n` +
        `\`${referralCode}\`\n\n` +
        `Поделитесь этим кодом с друзьями!\n` +
        `Когда друг введёт ваш код и оплатит подписку, вы получите купон.\n\n` +
        `У вас есть код от друга? Введите его ниже:`;

      await ctx.reply(message, {
        attachments: [
          Keyboard.inlineKeyboard([
            [Keyboard.button.callback('« Главное меню', 'menu_main')],
          ])
        ],
        format: 'markdown',
      });
      
      // Сохраняем состояние ожидания кода
      stateManager.set(user.max_user_id, 'waiting_referral_code');
      console.log('[Referral] Set state waiting_referral_code for user', user.max_user_id);
    } catch (error) {
      console.error('Referral Handler Error:', error);
      await ctx.reply('❌ Ошибка при загрузке данных');
    }
  });
  
  // Обработчик ввода реферального кода
  bot.on('message_created', async (ctx, next) => {
    const userId = ctx.user?.user_id;
    const state = stateManager.get(userId);
    
    console.log('[Referral] Checking message_created, userId:', userId);
    console.log('[Referral] State:', state);
    
    if (state?.state !== 'waiting_referral_code') {
      console.log('[Referral] Not waiting for code, skipping');
      return next();
    }
    
    const text = ctx.message?.body?.text?.trim();
    console.log('[Referral] User entered text:', text);
    
    if (!text) {
      console.log('[Referral] Empty text, skipping');
      return next();
    }
    
    // ВАЖНО: Проверяем что текст ПОХОЖ на реферальный код (начинается с VPN)
    if (!text.toUpperCase().startsWith('VPN')) {
      console.log('[Referral] Text does not look like referral code, ignoring and clearing state');
      // Сбрасываем state - пользователь передумал вводить код
      stateManager.delete(userId);
      return next();
    }
    
    try {
      const user = ctx.userState;
      if (!user) return next();
      
      console.log('[Referral] User', user.id, 'entered code:', text);
      
      // Проверяем код
      const referrerId = ReferralService.validateReferralCode(text);
      
      if (!referrerId) {
        await ctx.reply('❌ Неверный формат кода. Код должен выглядеть как VPN12345ABCD');
        return next();
      }
      
      // Защита от самореферальства
      if (referrerId === user.id) {
        await ctx.reply('❌ Вы не можете использовать свой собственный код!');
        stateManager.delete(ctx.user?.user_id);
        return next();
      }
      
      // Проверяем не вводил ли уже код
      const alreadyReferred = await ReferralModel.exists(user.id);
      if (alreadyReferred) {
        await ctx.reply('❌ Вы уже использовали реферальный код!');
        stateManager.delete(ctx.user?.user_id);
        return next();
      }
      
      // Проверяем существует ли пригласивший
      const pool = require('../../db/pool');
      const referrerResult = await pool.query('SELECT id FROM users WHERE id = $1', [referrerId]);
      
      if (referrerResult.rows.length === 0) {
        await ctx.reply('❌ Пользователь с таким кодом не найден!');
        return next();
      }
      
      // ВАЖНО: Проверяем нет ли циклической рефералки
      // Если пригласивший УЖЕ был приглашен текущим пользователем - запрещаем
      const circularCheck = await pool.query(
        'SELECT id FROM referrals WHERE referrer_id = $1 AND referred_id = $2',
        [referrerId, user.id]
      );
      
      if (circularCheck.rows.length > 0) {
        console.log('[Referral] ✗ Circular referral detected:', referrerId, '<->', user.id);
        await ctx.reply(
          '❌ Нельзя создать взаимную реферальную связь!\n\n' +
          'Этот пользователь уже является вашим рефералом.'
        );
        stateManager.delete(ctx.user?.user_id);
        return next();
      }
      
      // Создаём реферальную связь
      await ReferralModel.create(referrerId, user.id);
      console.log('[Referral] ✓ Created referral:', referrerId, '->', user.id);
      
      await ctx.reply(
        '✅ Код принят!\n\n' +
        'Теперь когда вы оплатите подписку, ваш друг получит купон на скидку 10%!',
        {
          attachments: [
            Keyboard.inlineKeyboard([
              [Keyboard.button.callback('« Главное меню', 'menu_main')],
            ])
          ]
        }
      );
      
      stateManager.delete(ctx.user?.user_id);
    } catch (error) {
      console.error('[Referral] Error processing code:', error);
      await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
    
    return next();
  });
}

module.exports = referralHandler;
