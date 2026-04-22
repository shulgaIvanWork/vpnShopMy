const axios = require('axios');
const config = require('../config');

class DeepSeekSupport {
  constructor() {
    this.apiKey = config.deepseek.apiKey;
    this.baseUrl = 'https://api.deepseek.com/v1';
  }

  // Отправка вопроса к AI
  async ask(question, context = []) {
    try {
      const messages = [
        {
          role: 'system',
          content: `Ты — техническая поддержка VPN-сервиса MAX VPN.

О НАШЕМ СЕРВИСЕ:
- Протокол: VLESS (WebSocket)
- Безлимитный трафик
- Поддержка: Windows, macOS, Android, iOS
- Оплата через Сбербанк
- Есть реферальная программа (10% скидка за каждого приглашенного)

ПРИЛОЖЕНИЯ ДЛЯ ПОДКЛЮЧЕНИЯ:
- Windows: v2rayN
- macOS: oneXray или v2rayU
- Android: v2rayNG или Hiddify
- iOS: oneXray или Shadowrocket

КАК ПОДКЛЮЧИТЬСЯ:
1. Установите приложение для вашей платформы
2. Скопируйте ссылку подключения (vless://...)
3. Добавьте подключение в приложение
4. Подключитесь к серверу

ТАРИФЫ:
- 1 месяц — 299₽
- 3 месяца — 799₽
- 6 месяцев — 1499₽

РЕФЕРАЛЬНАЯ ПРОГРАММА:
- Поделитесь ссылкой с друзьями
- За каждую оплату приглашенного получаете купон 10%
- Купон действует 1 год

ВАЖНО:
- НЕ ИСПОЛЬЗУЙ MARKDOWN! MAX мессенджер не поддерживает **жирный**, *курсив*, \`код\` и другие форматы.
- Отвечай обычным текстом без форматирования.
- При вопросе о подключении, тарифах, настройке — ОТВЕЧАЙ: "Используйте кнопки в меню бота для выбора тарифа и получения инструкции. Это быстрее!"
- При вопросе "как подключиться" — ОТВЕЧАЙ: "Нажмите /start → Купить подписку → выберите тариф → оплатите → получите ключ и видеоинструкцию."
- При вопросе о ценах — ОТВЕЧАЙ: "Цены указаны в меню: /start → Купить подписку."
- При вопросе о приложениях — ОТВЕЧАЙ: "После оплаты вам предложат выбрать приложение и покажут видеоинструкцию."
- ОТВЕЧАЙ ТОЛЬКО если вопрос НЕЛЬЗЯ решить через кнопки меню (например, специфическая ошибка, нестандартная ситуация).
- Если вопрос можно решить через меню — напиши "НЕ УВЕРЕН" (это покажет пользователю ссылку на кнопки).

ПРАВИЛА:
- Отвечай ТОЛЬКО на вопросы о VPN, подключении, оплате, настройке
- Если вопрос не по теме — ответь "НЕ УВЕРЕН"
- Отвечай кратко, по делу, на русском языке
- БЕЗ MARKDOWN — только обычный текст!
- Не давай ссылки на сторонние ресурсы
- Не предлагай обратиться в поддержку — сразу отвечай на вопрос
- Если не знаешь точный ответ — ответь "НЕ УВЕРЕН"`
        },
        ...context,
        {
          role: 'user',
          content: question
        }
      ];

      const response = await axios.post(`${this.baseUrl}/chat/completions`, {
        model: 'deepseek-chat',
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        }
      });

      const answer = response.data.choices[0].message.content.trim();
      return answer;
    } catch (error) {
      console.error('DeepSeek API Error:', error.message);
      return 'НЕ УВЕРЕН';
    }
  }

  // Оценка уверенности ответа
  estimateConfidence(response) {
    if (!response || response === 'НЕ УВЕРЕН') {
      return 0;
    }

    // Простая эвристика: если ответ слишком короткий или содержит слова неуверенности
    const uncertainWords = ['не знаю', 'не уверен', 'возможно', 'может быть', 'не sure'];
    const lowerResponse = response.toLowerCase();
    
    if (uncertainWords.some(word => lowerResponse.includes(word))) {
      return 0.3;
    }

    if (response.length < 20) {
      return 0.5;
    }

    return 0.9;
  }
}

module.exports = new DeepSeekSupport();
