const { Keyboard } = require('@maxhub/max-bot-api');
const config = require('../../config');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

async function appSelectionHandler(bot) {
  // Обработка выбора приложения
  bot.action(/app_select_(.+)/, async (ctx) => {
    try {
      const app = ctx.match[1]; // v2ray, onexray, hiddify
      const user = ctx.userState;
      
      if (!user) {
        return ctx.reply('❌ Ошибка: пользователь не найден');
      }

      // Получаем VPN ключ из базы данных
      const UserModel = require('../../db/models/User');
      const userData = await UserModel.findById(user.id);
      
      if (!userData || !userData.uuid) {
        return ctx.reply('❌ VPN ключ не найден. Обратитесь в поддержку.');
      }

      // Генерируем VLESS ссылку
      const serverObj = config.xui.servers[0];
      const serverUrl = new URL(serverObj.url);
      const serverHost = serverUrl.hostname;
      const serverPort = 443;
      
      // Получаем имя подключения
      const connectionName = serverObj.name || 'MAX_VPN';
      const vpnLink = `vless://${userData.uuid}@${serverHost}:${serverPort}?type=ws&encryption=none&path=%2Fvpn&host=&security=none#${connectionName}-user_${user.id}`;
      
      console.log(`[App Selection] Generated VPN link for user ${user.id}, app: ${app}`);
      
      // Отправляем VPN ключ в отдельном сообщении для удобства копирования
      await ctx.reply(`${vpnLink}`);

      // Отправляем инструкцию для выбранного приложения
      const appInstructions = {
        v2ray: {
          name: 'v2rayN/v2rayU',
          message: `📱 Инструкция по настройке v2ray:\n\n` +
            `1️⃣ Установите и откройте приложение\n` +
            `2️⃣ Нажмите "+" или "Добавить подключение"\n` +
            `3️⃣ Выберите "Добавить из буфера" (Import from URL)\n` +
            `4️⃣ Вставьте скопированный VPN ключ\n` +
            `5️⃣ Подключитесь к серверу\n\n` +
            `✅ Готово! Теперь весь ваш трафик защищен.`
        },
        onexray: {
          name: 'oneXray',
          message: `📱 Инструкция по настройке oneXray:\n\n` +
            `1️⃣ Установите и откройте приложение\n` +
            `2️⃣ Нажмите "+" или "Добавить подключение"\n` +
            `3️⃣ Выберите "Добавить из буфера" (Import from URL)\n` +
            `4️⃣ Вставьте скопированный VPN ключ\n` +
            `5️⃣ Подключитесь к серверу\n\n` +
            `✅ Готово! Теперь весь ваш трафик защищен.`
        },
        hiddify: {
          name: 'Hiddify',
          message: `📱 Инструкция по настройке Hiddify:\n\n` +
            `1️⃣ Установите и откройте приложение\n` +
            `2️⃣ Нажмите "+" или "Добавить подключение"\n` +
            `3️⃣ Выберите "Добавить из буфера" (Import from URL)\n` +
            `4️⃣ Вставьте скопированный VPN ключ\n` +
            `5️⃣ Подключитесь к серверу\n\n` +
            `✅ Готово! Теперь весь ваш трафик защищен.` +
            `Ниже есть видео инструкция \n`
        }
      };

      const instruction = appInstructions[app];
      
      if (!instruction) {
        return ctx.reply('❌ Неизвестное приложение. Обратитесь в поддержку.');
      }

      await ctx.reply(instruction.message, {
        attachments: [
          Keyboard.inlineKeyboard([
            [Keyboard.button.callback('📞 Поддержка', 'menu_support')],
            [Keyboard.button.callback('« Главное меню', 'menu_main')],
          ])
        ]
      });

      // Отправляем видео-инструкцию для выбранного приложения
      const videoMap = {
        v2ray: 'v2ray_instruction.mp4',
        onexray: 'onexray_instruction.mp4',
        hiddify: 'hiddify_instruction.mp4'
      };
      
      const videoFile = videoMap[app];
      if (videoFile) {
        const videoDir = path.join(__dirname, '../../../videos');
        const videoPath = path.join(videoDir, videoFile);
        
        if (fs.existsSync(videoPath)) {
          try {
            const stats = fs.statSync(videoPath);
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
            console.log(`[App Selection] Sending video: ${videoFile} (${sizeMB} MB)`);
            
            // Шаг 1: Получаем URL для загрузки видео (и token)
            const uploadUrlResponse = await axios.post(
              `${config.maxApiUrl}/uploads?type=video`,
              {},
              {
                headers: {
                  'Authorization': config.maxApiToken
                }
              }
            );
            
            const uploadUrl = uploadUrlResponse.data.url;
            const videoToken = uploadUrlResponse.data.token;
            
            if (!videoToken) {
              throw new Error('No token in upload URL response');
            }
            
            console.log(`[App Selection] Video token received: ${videoToken.substring(0, 20)}...`);
            
            // Шаг 2: Загружаем видео по URL
            const formData = new FormData();
            formData.append('data', fs.createReadStream(videoPath));
            
            await axios.post(uploadUrl, formData, {
              headers: {
                ...formData.getHeaders()
              },
              maxContentLength: Infinity,
              maxBodyLength: Infinity
            });
            
            console.log('[App Selection] ✓ Video uploaded');
            
            // Шаг 3: Отправляем сообщение с видео
            await bot.api.sendMessageToUser(ctx.user?.user_id, `📹 Видео-инструкция для ${instruction.name}`, {
              attachments: [
                {
                  type: 'video',
                  payload: {
                    token: videoToken
                  }
                }
              ]
            });
            
            console.log(`[App Selection] ✓ Video sent: ${videoFile}`);
          } catch (error) {
            console.error(`[App Selection] ✗ Video error:`, error.message);
          }
        }
      }

    } catch (error) {
      console.error('[App Selection] Error:', error);
      await ctx.reply('❌ Произошла ошибка. Обратитесь в поддержку.');
    }
  });
}

module.exports = appSelectionHandler;
