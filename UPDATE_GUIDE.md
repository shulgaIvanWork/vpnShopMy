# 📖 Инструкция по обновлению MAX VPN Bot

### docker-compose build vs docker-compose up

**`docker-compose build`** - собирает новый Docker образ из Dockerfile
- Нужен только когда изменился код или зависимости
- Занимает время (1-5 минут)

**`docker-compose up -d`** - запускает контейнеры
- Если образ уже есть → использует его (быстро)
- Если образа нет → автоматически билдит (удобно)

### Когда ЧТО использовать:

```bash
# ✅ ПЕРВЫЙ ЗАПУСК (на сервере)
docker-compose up -d
# Автоматически сделает build + запустит

# ✅ ОБНОВЛЕНИЕ КОДА (после git pull)
docker-compose down
docker-compose build --no-cache  # Собираем новый образ
docker-compose up -d             # Запускаем

# ✅ ПРОСТОЙ РЕСТАРТ (без изменений кода)
docker-compose restart

# ✅ ОСТАНОВКА
docker-compose down
```

---

## 🔄 Полная инструкция по обновлению

### Сценарий 1: Первое развертывание на сервере

```bash
# 1. Подключаемся к серверу
ssh user@your-server.com

# 2. Устанавливаем Docker (если нет)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
exit  # Перелогиниваемся

# 3. Загружаем проект
git clone https://github.com/YOUR_USERNAME/max-vpn-bot.git
cd max-vpn-bot

# 4. Настраиваем
cp .env.example .env
nano .env  # Заполняем все поля

# 5. Загружаем видео (если их нет в репозитории)
mkdir -p videos
scp instruction.mp4 user@server:/path/to/max-vpn-bot/videos/

# 6. Запускаем
docker-compose up -d

# 7. Проверяем
docker-compose logs -f vpnbot
```

---

### Сценарий 2: Обновление на работающем сервере

```bash
# Шаг 1: Заходим на сервер
ssh user@your-server.com
cd /path/to/max-vpn-bot

# Шаг 2: Делаем бэкап базы данных (ОБЯЗАТЕЛЬНО!)
docker exec vpnbot-postgres pg_dump -U vpn_user vpnbot > backup_$(date +%Y%m%d_%H%M%S).sql

# Проверяем что бэкап создан
ls -lh backup_*.sql
# Пример: backup_20260423_093000.sql (размер 50KB)

# Шаг 3: Останавливаем бота
docker-compose down

# Шаг 4: Загружаем новую версию
git pull origin main

# Если ошибка (локальные изменения):
git stash           # Сохраняем изменения
git pull origin main
git stash pop       # Восстанавливаем изменения

# Шаг 5: Собираем новый образ
docker-compose build --no-cache

# Шаг 6: Запускаем
docker-compose up -d

# Шаг 7: Ждем 10-15 секунд (база данных инициализируется)
sleep 15

# Шаг 8: Проверяем логи
docker-compose logs --tail=50 vpnbot

# Должно быть:
# 🚀 Запуск MAX VPN Bot...
# [Migration] Running database migrations...
# [Migration] All migrations completed successfully
# ✅ Bot started successfully!

# Шаг 9: Проверяем статус
docker-compose ps

# Должно быть:
# vpnbot-app        Up (healthy)
# vpnbot-postgres   Up (healthy)

# Шаг 10: Тестируем бота
# Открываем бота в MAX и проверяем что работает
```

---

### Сценарий 3: Откат к предыдущей версии (если что-то сломалось)

```bash
# Шаг 1: Останавливаем
docker-compose down

# Шаг 2: Запускаем только базу данных
docker-compose up -d postgres
sleep 10

# Шаг 3: Восстанавливаем бэкап
# Находим последний бэкап
ls -lt backup_*.sql | head -1
# Пример: backup_20260423_093000.sql

# Восстанавливаем
docker exec -i vpnbot-postgres psql -U vpn_user vpnbot < backup_20260423_093000.sql

# Шаг 4: Возвращаем старый код
git log --oneline -5          # Смотрим последние коммиты
git checkout PREVIOUS_COMMIT  # Откатываемся

# Шаг 5: Собираем старую версию
docker-compose build --no-cache
docker-compose up -d

# Шаг 6: Проверяем
docker-compose logs -f vpnbot
```

---

### Сценарий 4: Перенос на другой сервер

```bash
# НА СТАРОМ СЕРВЕРЕ:

# 1. Делаем бэкап
docker exec vpnbot-postgres pg_dump -U vpn_user vpnbot > backup.sql

# 2. Копируем файлы
tar -czf max-vpn-bot.tar.gz max-vpn-bot/

# 3. Передаем на новый сервер
scp backup.sql max-vpn-bot.tar.gz user@new-server:/path/to/

# НА НОВОМ СЕРВЕРЕ:

# 4. Распаковываем
tar -xzf max-vpn-bot.tar.gz
cd max-vpn-bot

# 5. Запускаем
docker-compose up -d
sleep 15

# 6. Восстанавливаем базу
docker exec -i vpnbot-postgres psql -U vpn_user vpnbot < backup.sql

# 7. Перезапускаем бота
docker-compose restart vpnbot

# 8. Проверяем
docker-compose logs -f vpnbot
```

---

## 🛠️ Полезные команды

### Логи

```bash
# Все логи в реальном времени
docker-compose logs -f

# Только бот
docker-compose logs -f vpnbot

# Последние 100 строк
docker-compose logs --tail=100 vpnbot

# Логи за последние 2 часа
docker-compose logs --since 2h vpnbot
```

### Статус

```bash
# Статус контейнеров
docker-compose ps

# Статистика ресурсов
docker stats

# Место на диске
docker system df
```

### Управление

```bash
# Перезапустить только бота
docker-compose restart vpnbot

# Перезапустить всё
docker-compose restart

# Остановить всё
docker-compose down

# Остановить и удалить данные (ОСТОРОЖНО!)
docker-compose down -v
```

### База данных

```bash
# Подключиться к БД
docker exec -it vpnbot-postgres psql -U vpn_user vpnbot

# Внутри psql:
\dt                    # Показать таблицы
SELECT count(*) FROM users;  # Сколько пользователей
\q                     # Выйти

# Бэкап
docker exec vpnbot-postgres pg_dump -U vpn_user vpnbot > backup.sql

# Восстановление
docker exec -i vpnbot-postgres psql -U vpn_user vpnbot < backup.sql
```

### Очистка

```bash
# Удалить старые образы
docker system prune -a

# Удалить только неиспользуемые
docker system prune

# Посмотреть что занимает место
docker system df -v
```

---

## ⚠️ Важные правила

### 1. ВСЕГДА делайте бэкап перед обновлением

```bash
docker exec vpnbot-postgres pg_dump -U vpn_user vpnbot > backup_$(date +%Y%m%d).sql
```

### 2. НЕ обновляйте в час пик

- Обновляйте ночью или когда мало пользователей
- Предупредите пользователей о технических работах

### 3. Проверяйте бэкап перед удалением

```bash
# Проверяем размер
ls -lh backup_*.sql

# Проверяем содержимое (первые 10 строк)
head -10 backup_20260423.sql

# Проверяем что можно восстановить (на тестовой БД)
```

### 4. Тестируйте перед продакшеном

Если возможно:
1. Разверните тестовый сервер
2. Обновите его
3. Протестируйте все функции
4. Только потом обновляйте продакшен

### 5. Храните бэкапы отдельно

```bash
# Не храните бэкапы в папке проекта!
# Копируйте на другой диск или облако

# Пример:
scp backup_20260423.sql user@backup-server:/backups/

# Или в облако:
rclone copy backup_20260423.sql google-drive:backups/
```

---

## 📋 Чеклист обновления

Перед обновлением:
- [ ] Сделан бэкап базы данных
- [ ] Бэкап скопирован на другой диск/сервер
- [ ] Проверен размер бэкапа (>0 KB)
- [ ] Пользователи предупреждены (если нужно)

Во время обновления:
- [ ] `docker-compose down` выполнен
- [ ] `git pull` прошел без ошибок
- [ ] `docker-compose build` прошел без ошибок
- [ ] `docker-compose up -d` выполнен
- [ ] Подождали 15 секунд

После обновления:
- [ ] `docker-compose ps` показывает статус Up
- [ ] Логи не содержат ошибок
- [ ] Бот отвечает на `/start`
- [ ] Можно создать подписку (тест)
- [ ] Видео отправляются (тест)

---

## 🆘 Экстренная помощь

### Бот не запускается после обновления

```bash
# 1. Смотрим логи
docker-compose logs vpnbot | tail -100

# 2. Проверяем .env
docker-compose exec vpnbot cat .env

# 3. Проверяем подключение к БД
docker-compose exec vpnbot ping postgres

# 4. Откатываемся
git checkout PREVIOUS_COMMIT
docker-compose build --no-cache
docker-compose up -d
```

### База данных не запускается

```bash
# 1. Смотрим логи
docker-compose logs postgres

# 2. Проверяем место
df -h

# 3. Если место закончилось:
docker system prune -a

# 4. Перезапускаем
docker-compose down
docker-compose up -d postgres
```

### Потеряли доступ к серверу

```bash
# 1. Подключаемся через консоль провайдера
# 2. Проверяем Docker
systemctl status docker

# 3. Перезапускаем если нужно
systemctl restart docker

# 4. Запускаем проект
cd /path/to/max-vpn-bot
docker-compose up -d
```

---

## 📞 Поддержка

Если что-то пошло не так:

1. Проверьте логи: `docker-compose logs -f`
2. Проверьте бэкап существует
3. Откатитесь к предыдущей версии
4. Создайте issue в репозитории с:
   - Логами ошибки
   - Версией до обновления
   - Версией после обновления
   - Что делали перед ошибкой

---

**Последнее обновление:** 23 апреля 2026
**Версия:** 0.3.0
