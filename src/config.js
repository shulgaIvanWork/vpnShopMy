require('dotenv').config();

const config = {
  // MAX Bot
  botToken: process.env.MAX_BOT_TOKEN,
  botUsername: process.env.MAX_BOT_USERNAME,
  botAdmins: process.env.BOT_ADMINS ? process.env.BOT_ADMINS.split(',').map(id => parseInt(id.trim())) : [],
  
  // MAX API (для загрузки файлов)
  maxApiUrl: 'https://platform-api.max.ru',
  maxApiToken: process.env.MAX_BOT_TOKEN, // Используем тот же токен

  // Database
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'secret',
    database: process.env.DB_NAME || 'vpnbot',
  },

  // 3X-UI Servers (JSON массив объектов)
  xui: {
    // Формат: [{"url":"http://...","username":"...","password":"...","name":"...","inboundId":1,"maxClients":100}]
    servers: process.env.XUI_SERVERS_JSON
      ? JSON.parse(process.env.XUI_SERVERS_JSON.replace(/\s+/g, ' ').trim())
      : [],
    // Для обратной совместимости - если старый формат
    panelUrl: process.env.XUI_PANEL_URL,
    username: process.env.XUI_USERNAME,
    password: process.env.XUI_PASSWORD,
    inboundId: parseInt(process.env.XUI_INBOUND_ID) || 1,
    maxClientsPerServer: parseInt(process.env.XUI_MAX_CLIENTS_PER_SERVER) || 100,
    connectionNames: process.env.XUI_NAME_CONNECTION
      ? process.env.XUI_NAME_CONNECTION.split(',').map(name => name.trim())
      : ['MAX_VPN'],
  },

  // Sber Payment
  sber: {
    phone: process.env.SBER_PHONE,
    recipientName: process.env.SBER_RECIPIENT_NAME,
  },

  // DeepSeek AI
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
  },

  // Security
  encryptionKey: process.env.ENCRYPTION_KEY,

  // Tariffs
  tariffs: [
    { days: 30, price: 299, label: '1 месяц' },
    { days: 90, price: 799, label: '3 месяца' },
    { days: 180, price: 1499, label: '6 месяцев' },
  ],

  // Referral
  referralDiscount: 10, // 10% скидка за реферала
  couponValidityDays: 365, // Купон действует 1 год
};

// Инициализация серверов XUI
if (config.xui.servers.length === 0 && config.xui.panelUrl) {
  config.xui.servers = [{
    url: config.xui.panelUrl.replace(/\/$/, ''),
    username: config.xui.username,
    password: config.xui.password,
    name: config.xui.connectionNames[0] || 'MAX_VPN',
    inboundId: config.xui.inboundId,
    maxClients: config.xui.maxClientsPerServer,
  }];
}

// ВАЖНО: Добавляем inboundId к каждому серверу если его нет
config.xui.servers = config.xui.servers.map(server => ({
  ...server,
  inboundId: server.inboundId || config.xui.inboundId,
  maxClients: server.maxClients || config.xui.maxClientsPerServer,
}));

console.log('[Config] XUI Servers:', config.xui.servers.map(s => ({ 
  url: s.url, 
  name: s.name,
  inboundId: s.inboundId
})));

// Валидация обязательных параметров
const required = ['botToken', 'sber.phone'];
for (const key of required) {
  const value = key.split('.').reduce((obj, k) => obj && obj[k], config);
  if (!value) {
    throw new Error(`Missing required config: ${key}`);
  }
}

// Проверяем что есть хотя бы один XUI сервер
if (!config.xui.servers || config.xui.servers.length === 0) {
  throw new Error('Missing required config: xui.servers or xui.panelUrl');
}

module.exports = config;
