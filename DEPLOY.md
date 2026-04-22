# 🚀 Быстрый старт - Деплой на сервер

## Требования

- Сервер с Ubuntu 20.04+ (или другой Linux)
- Docker и Docker Compose установлены
- Минимум: 2 CPU, 2GB RAM, 20GB disk

## Шаг 1: Подготовка сервера

```bash
# Обновить систему
sudo apt update && sudo apt upgrade -y

# Установить Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Установить Docker Compose (если не в составе Docker)
sudo apt install docker-compose-plugin -y

# Перелогиниться
exit
```

## Шаг 2: Загрузка проекта

```bash
# Клонировать репозиторий
git clone <your-repo-url>
cd max-vpn-bot-my

# Или загрузить через SCP
scp -r ./max-vpn-bot-my user@server:/path/to/
```

## Шаг 3: Настройка

```bash
# Скопировать пример конфига
cp .env.example .env

# Отредактировать конфигурацию
nano .env
```

**Обязательно укажите:**
- `BOT_TOKEN` - ваш токен MAX Bot API
- `BOT_ADMINS` - ID администраторов [123456]
- `DB_PASSWORD` - надежный пароль для БД
- `XUI_SERVERS` - конфигурация 3X-UI панели
- `MAX_API_TOKEN` - токен MAX API

## Шаг 4: Добавление видео инструкций

```bash
# Видео уже должны быть в папке videos/
ls -la videos/

# Должны быть файлы:
# v2ray_instruction.mp4
# hiddify_instruction.mp4
# onexray_instruction.mp4

# Если нужно добавить новые:
cp /path/to/video.mp4 videos/
```

## Шаг 5: Запуск

### Вариант A: Автоматический (скрипт)

```bash
chmod +x deploy.sh
./deploy.sh
```

### Вариант B: Ручной

```bash
# Собрать и запустить
docker-compose build
docker-compose up -d

# Посмотреть логи
docker-compose logs -f vpnbot
```

## Шаг 6: Проверка

```bash
# Проверить статус контейнеров
docker-compose ps

# Должно быть:
# vpnbot-app      Up (healthy)
# vpnbot-postgres Up (healthy)

# Проверить логи
docker-compose logs vpnbot | tail -50

# Проверить БД
docker exec -it vpnbot-postgres psql -U vpn_user -d vpnbot -c "SELECT count(*) FROM users;"
```

## Полезные команды

### Логи

```bash
# Все логи
docker-compose logs -f

# Только бот
docker-compose logs -f vpnbot

# Только БД
docker-compose logs -f postgres

# Последние 100 строк
docker-compose logs --tail=100 vpnbot
```

### Управление

```bash
# Остановить
docker-compose down

# Перезапустить
docker-compose restart

# Пересобрать и запустить
docker-compose up -d --build

# Очистить всё (включая данные!)
docker-compose down -v
```

### База данных

```bash
# Подключиться к БД
docker exec -it vpnbot-postgres psql -U vpn_user vpnbot

# Бэкап
docker exec vpnbot-postgres pg_dump -U vpn_user vpnbot > backup_$(date +%Y%m%d).sql

# Восстановление
docker exec -i vpnbot-postgres psql -U vpn_user vpnbot < backup_20260420.sql
```

### Обновление

```bash
# Остановить
docker-compose down

# Загрузить новую версию
git pull

# Собрать и запустить
docker-compose build --no-cache
docker-compose up -d

# Проверить логи
docker-compose logs -f vpnbot
```

## Мониторинг

### Resource usage

```bash
# Статистика контейнеров
docker stats

# Дисковое пространство
docker system df

# Очистить неиспользуемые образы
docker system prune -a
```

### Health checks

```bash
# Проверить здоровье контейнеров
docker inspect --format='{{.Name}} {{.State.Health.Status}}' $(docker ps -q)
```

## Troubleshooting

### Бот не запускается

```bash
# Проверить логи
docker-compose logs vpnbot

# Частые ошибки:
# - Неверный BOT_TOKEN
# - БД не готова (подождите 10-20 сек)
# - Ошибки в .env файле
```

### База данных не подключается

```bash
# Проверить что PostgreSQL запущен
docker-compose ps postgres

# Проверить логи БД
docker-compose logs postgres

# Убедиться что DB_HOST=postgres в .env
```

### 3X-UI ошибки

```bash
# Проверить доступность панели
curl -k https://your-xui-server.com

# Проверить логин/пароль
# Убедиться что XUI_INBOUND_ID правильный
```

## Безопасность

### Firewall

```bash
# Разрешить только нужные порты
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

### Бэкапы

```bash
# Настроить автоматический бэкап (cron)
crontab -e

# Добавить строку (бэкап каждый день в 3:00)
0 3 * * * docker exec vpnbot-postgres pg_dump -U vpn_user vpnbot > /backup/vpnbot_$(date +\%Y\%m\%d).sql
```

## Production Checklist

- [ ] Настроен `.env` с правильными значениями
- [ ] Добавлено видео инструкции в `assets/`
- [ ] PostgreSQL пароль надежный (16+ символов)
- [ ] Firewall настроен
- [ ] Бэкапы настроены
- [ ] Логи мониторятся
- [ ] SSL сертификат (если нужен)
- [ ] Домен настроен (если нужен)

## Support

Если что-то пошло не так:
1. Проверьте логи: `docker-compose logs -f`
2. Проверьте `.env` файл
3. Перезапустите: `docker-compose restart`
4. Создайте issue в репозитории
