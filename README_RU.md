# MAX VPN Bot

Telegram-бот для автоматизации продажи VPN-подписок с интеграцией панели 3X-UI и MAX Bot API.

## 🚀 Возможности

- 🎫 **Управление подписками** - Покупка и продление VPN-подписок
- 👥 **Реферальная программа** - Кодовая система с купонами на скидки
- 🤖 **AI поддержка** - Умная поддержка клиентов через DeepSeek/OpenAI
- 💳 **Оплата через чеки** - Загрузка чеков и подтверждение администратором
- 📊 **Мульти-серверность** - Балансировка нагрузки между несколькими панелями 3X-UI
- 🏢 **Корпоративные планы** - Решения для бизнеса
- 📹 **Видео-инструкции** - Автоматическая отправка видео для V2Ray, Hiddify, OneXray

## 📋 Требования

- **CPU:** 2+ ядра
- **RAM:** 2GB+
- **Disk:** 20GB+
- **Docker** и **Docker Compose** установлены
- Доступ к панели **3X-UI**
- Токен **MAX Bot API**

## 🛠️ Быстрый старт

### Шаг 1: Установка Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Проверка установки
docker --version
docker-compose --version
```

### Шаг 2: Загрузка проекта

```bash
# Клонируем репозиторий
git clone https://github.com/YOUR_USERNAME/max-vpn-bot.git
cd max-vpn-bot

# Или загружаем через SCP
scp -r ./max-vpn-bot user@server:/path/to/
```

### Шаг 3: Настройка конфигурации

```bash
# Копируем пример конфигурации
cp .env.example .env

# Открываем для редактирования
nano .env
```

**Обязательно заполните:**

```bash
# Токен бота
MAX_BOT_TOKEN=ваш_токен_max_bot_api
MAX_BOT_USERNAME=@username_бота
BOT_ADMINS=53530798

# База данных
DB_PASSWORD=надежный_пароль_минимум_16_символов

# Панель 3X-UI (JSON формат)
XUI_SERVERS_JSON=[{"url":"http://your-server.com:8444/path","username":"admin","password":"pass","name":"Server1","inboundId":3,"maxClients":200}]

# AI (опционально)
DEEPSEEK_API_KEY=sk-...
```

### Шаг 4: Запуск

```bash
# Собираем и запускаем
docker-compose up -d

# Смотрим логи
docker-compose logs -f vpnbot
```

**Ожидаемый вывод:**
```
🚀 Запуск MAX VPN Bot...
[Migration] Running database migrations...
[Migration] ✓ Column referral_code added
[Migration] All migrations completed successfully
[Main] Registering handlers...
✅ Bot started successfully!
```

## 📖 Использование

### Для пользователей:

1. **Запуск бота:** Откройте бота в MAX и нажмите `/start`
2. **Покупка подписки:** Выберите тариф → оплатите → загрузите чек
3. **Получение ключа:** После подтверждения администратором получите VPN ключ
4. **Подключение:** Выберите приложение (V2Ray/Hiddify/OneXray) → получите видео-инструкцию
5. **Реферальная программа:** Получите уникальный код → поделитесь с друзьями → получите купон 10%

### Для администратора:

1. **Просмотр платежей:** Администратор получает уведомления о новых чеках
2. **Подтверждение:** Кнопки "✅ Одобрить" или "❌ Отклонить"
3. **Автоматическая активация:** При одобрении создается VPN клиент и отправляется ключ

## 🔧 Управление

### Просмотр логов

```bash
# Все логи
docker-compose logs -f

# Только бот
docker-compose logs -f vpnbot

# Только база данных
docker-compose logs -f postgres

# Последние 100 строк
docker-compose logs --tail=100 vpnbot
```

### Остановка и запуск

```bash
# Остановить
docker-compose down

# Запустить
docker-compose up -d

# Перезапустить
docker-compose restart
```

## 💾 Бэкап и восстановление

### Бэкап базы данных

```bash
# Создать бэкап
docker exec vpnbot-postgres pg_dump -U vpn_user vpnbot > backup_$(date +%Y%m%d_%H%M%S).sql

# Пример: backup_20260423_093000.sql
```

### Восстановление из бэкапа

```bash
# Восстановить
docker exec -i vpnbot-postgres psql -U vpn_user vpnbot < backup_20260423_093000.sql
```

### Автоматический бэкап (cron)

```bash
# Открываем crontab
crontab -e

# Добавляем строку (бэкап каждый день в 3:00)
0 3 * * * docker exec vpnbot-postgres pg_dump -U vpn_user vpnbot > /backup/vpnbot_$(date +\%Y\%m\%d).sql
```

## 🔄 Обновление проекта

### Пошаговая инструкция:

```bash
# 1. Останавливаем бота
docker-compose down

# 2. Делаем бэкап базы данных
docker exec vpnbot-postgres pg_dump -U vpn_user vpnbot > backup_before_update_$(date +%Y%m%d).sql

# 3. Загружаем новую версию
git pull origin main
# Или загружаем файлы через SCP

# 4. Собираем новый образ
docker-compose build --no-cache

# 5. Запускаем
docker-compose up -d

# 6. Проверяем логи
docker-compose logs -f vpnbot

# 7. Проверяем статус
docker-compose ps
```

### Если что-то пошло не так:

```bash
# Останавливаем
docker-compose down

# Восстанавливаем бэкап
docker-compose up -d postgres
sleep 10
docker exec -i vpnbot-postgres psql -U vpn_user vpnbot < backup_before_update_20260423.sql

# Запускаем снова
docker-compose up -d
```

## 📁 Структура проекта

```
max-vpn-bot/
├── 📄 .env                    # Конфигурация (НЕ коммитить!)
├── 📄 .env.example            # Пример конфигурации
├── 🐳 Dockerfile              # Образ Docker
├── 🐳 docker-compose.yml      # Оркестрация сервисов
├── 🗄️ init.sql                # Инициализация БД
├── 📦 package.json            # Зависимости Node.js
├── 🚀 deploy.sh               # Скрипт деплоя
├── 📖 README.md               # Документация
├── 📖 DEPLOY.md               # Инструкция деплоя
├── 📖 PROJECT_STRUCTURE.md    # Описание файлов
├── 🎬 videos/                 # Видео-инструкции
│   ├── v2ray_instruction.mp4
│   ├── hiddify_instruction.mp4
│   └── onexray_instruction.mp4
└── 💻 src/                    # Исходный код
    ├── bot/                   # Обработчики сообщений
    ├── db/                    # Модели БД и миграции
    ├── services/              # Бизнес-логика
    └── config.js              # Загрузка конфигурации
```

## ⚙️ Переменные окружения

| Переменная | Описание | Пример |
|------------|----------|--------|
| `MAX_BOT_TOKEN` | Токен MAX Bot API | `f9LHodD0cOLq...` |
| `MAX_BOT_USERNAME` | Username бота | `@vpn_bot` |
| `BOT_ADMINS` | ID администраторов | `53530798` |
| `DB_HOST` | Хост БД | `postgres` (Docker) или `localhost` |
| `DB_PORT` | Порт БД | `5432` |
| `DB_NAME` | Имя БД | `vpnbot` |
| `DB_USER` | Пользователь БД | `vpn_user` |
| `DB_PASSWORD` | Пароль БД | `secure_password` |
| `XUI_SERVERS_JSON` | Серверы 3X-UI (JSON) | См. `.env.example` |
| `DEEPSEEK_API_KEY` | Ключ AI API | `sk-...` |
| `ENCRYPTION_KEY` | Ключ шифрования | `your_fernet_key` |

## 🗄️ База данных

### Таблицы:

- **users** - Пользователи и подписки
- **referrals** - Реферальные связи
- **coupons** - Купоны на скидки
- **payments** - Платежи и чеки

### Миграции:

Миграции выполняются **автоматически** при запуске бота.

```bash
# Ручной запуск миграций
node -e "require('./src/db/migrations').runMigrations()"
```

## 👥 Реферальная система

### Как работает:

1. Пользователь получает уникальный код: `VPN{userId}{4 символа}` (например, `VPN123ABCD`)
2. Делится кодом с друзьями
3. Друг вводит код в разделе "Реферальная программа"
4. Когда друг оплачивает подписку → пригласивший получает купон 10%
5. Только одно направление (нельзя пригласить друг друга)

### Защита:

- ✅ Запрет самореферальства
- ✅ Запрет циклических рефералов
- ✅ Один купон за реферала
- ✅ Код можно использовать только один раз

## 🎬 Видео-инструкции

При выборе приложения пользователь получает:
1. Текстовую инструкцию
2. VPN ключ для копирования
3. Видео-инструкцию для выбранного приложения

### Форматы видео:

- **V2Ray** (Windows/Mac) - `v2ray_instruction.mp4`
- **Hiddify** (Android/iOS) - `hiddify_instruction.mp4`
- **OneXray** (Mac/iOS) - `onexray_instruction.mp4`

## 🐛 Troubleshooting

### Бот не запускается

```bash
# Проверяем логи
docker-compose logs vpnbot

# Частые ошибки:
# - Неверный MAX_BOT_TOKEN
# - База данных не готова (подождите 10-20 сек)
# - Ошибки в .env файле
```

### Ошибка подключения к БД

```bash
# Убедитесь что DB_HOST=postgres в Docker
# Убедитесь что DB_HOST=localhost при локальной разработке

# Проверяем что PostgreSQL запущен
docker-compose ps postgres
```

### Ошибка 3X-UI "record not found"

```bash
# Проверьте что XUI_INBOUND_ID правильный
# Проверьте доступность панели
curl -k http://your-server.com:8444
```

### Рефералы не работают

```bash
# Проверяем логи
docker-compose logs vpnbot | grep Referral

# Проверяем колонку в БД
docker exec -it vpnbot-postgres psql -U vpn_user vpnbot -c "\d users"

# Должна быть колонка referral_code
```

## 🔒 Безопасность

### Firewall

```bash
# Открываем только нужные порты
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 443/tcp   # HTTPS (если нужно)
# НЕ открывайте 5432 (PostgreSQL) наружу!
sudo ufw enable
```

### Обновления

```bash
# Регулярно обновляйте систему
sudo apt update && sudo apt upgrade -y

# Обновляйте Docker образы
docker-compose pull
docker-compose up -d
```

## 📞 Поддержка

Если возникли проблемы:

1. Проверьте логи: `docker-compose logs -f`
2. Проверьте `.env` файл
3. Перезапустите: `docker-compose restart`
4. Создайте issue в репозитории

## 📝 Лицензия

Private - Все права защищены

## 🎯 Roadmap

- [ ] Интеграция с платежными системами (Сбербанк, ЮKassa)
- [ ] Автоматическое продление подписок
- [ ] Статистика использования
- [ ] Мобильное приложение
- [ ] Web-панель управления

---

**Сделано с ❤️ для MAX VPN**
