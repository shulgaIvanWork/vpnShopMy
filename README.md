# MAX VPN Bot

Telegram bot for managing VPN subscriptions with 3X-UI panel integration and MAX Bot API.

## Features

- 🎫 **Subscription Management** - Purchase and manage VPN subscriptions
- 👥 **Referral System** - Code-based referral program with coupon rewards
- 🤖 **AI Support** - Intelligent customer support with OpenAI integration
- 💳 **Payment Processing** - Admin-approved payment workflow with receipt upload
- 📊 **Multi-Server Support** - Load balancing across multiple 3X-UI panels
- 🏢 **Corporate Plans** - Business VPN solutions
- 📖 **Instruction System** - Video and text guides for VPN setup

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  Telegram   │◄───────►│  MAX VPN Bot │◄───────►│  3X-UI      │
│   Users     │         │  (Node.js)   │         │  Panel      │
└─────────────┘         └──────┬───────┘         └─────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │  PostgreSQL  │
                        │  Database    │
                        └──────────────┘
```

## Quick Start (Docker)

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd max-vpn-bot-my
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your configuration
nano .env
```

### 3. Add instruction videos (optional)

Place your instruction videos in the `videos/` directory:
```
./videos/
├── v2ray_instruction.mp4
├── hiddify_instruction.mp4
└── onexray_instruction.mp4
```

### 4. Start with Docker Compose

```bash
docker-compose up -d
```

### 5. View logs

```bash
docker-compose logs -f vpnbot
```

## Manual Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- 3X-UI Panel access
- MAX Bot API token

### Installation

```bash
# Install dependencies
npm ci --production

# Configure environment
cp .env.example .env
# Edit .env file

# Run migrations (automatic on first start)
node index.js
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `BOT_TOKEN` | MAX Bot API token | `your_token_here` |
| `BOT_ADMINS` | Admin user IDs (JSON array) | `[53530798]` |
| `DB_HOST` | PostgreSQL host | `localhost` or `postgres` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `vpnbot` |
| `DB_USER` | Database user | `vpn_user` |
| `DB_PASSWORD` | Database password | `secure_password` |
| `XUI_SERVERS` | 3X-UI servers config (JSON array) | See `.env.example` |
| `MAX_API_URL` | MAX API endpoint | `https://platform-api.max.ru` |
| `MAX_API_TOKEN` | MAX API token | `your_token` |
| `AI_PROVIDER` | AI provider | `openai` |
| `AI_API_KEY` | AI API key | `sk-...` |
| `AI_MODEL` | AI model | `gpt-4o-mini` |
| `TARIFFS` | Subscription plans (JSON array) | See `.env.example` |

## Project Structure

```
max-vpn-bot-my/
├── src/
│   ├── bot/
│   │   ├── handlers/       # Message handlers
│   │   │   ├── admin.js    # Admin payment approval
│   │   │   ├── dashboard.js # User dashboard
│   │   │   ├── referral.js # Referral system
│   │   │   └── ...
│   │   ├── keyboards/      # Inline keyboards
│   │   ├── middleware/     # Auth middleware
│   │   └── states.js       # State management
│   ├── db/
│   │   ├── models/         # Database models
│   │   ├── pool.js         # Connection pool
│   │   └── migrations.js   # Auto migrations
│   ├── services/
│   │   ├── xui.js          # 3X-UI API integration
│   │   ├── ai.js           # AI provider
│   │   ├── cron.js         # Scheduled tasks
│   │   └── referral.js     # Referral logic
│   └── config.js           # Configuration loader
├── videos/
│   ├── v2ray_instruction.mp4
│   ├── hiddify_instruction.mp4
│   └── onexray_instruction.mp4
├── Dockerfile
├── docker-compose.yml
├── init.sql                # DB initialization
├── .env.example
└── index.js                # Entry point
```

## Database

### Tables

- **users** - User accounts and subscriptions
- **referrals** - Referral relationships
- **coupons** - Discount coupons
- **payments** - Payment requests

### Migrations

Migrations run automatically on bot startup. Manual migration:

```bash
node -e "require('./src/db/migrations').runMigrations()"
```

## Referral System

### How it works

1. User gets unique code: `VPN{userId}{4chars}` (e.g., `VPN123ABCD`)
2. Share code with friends
3. Friend enters code in "Referral Program" section
4. When friend pays → referrer gets 10% discount coupon
5. One-way referrals only (no circular referrals)

### Protection

- ✅ Self-referral blocked
- ✅ Circular referrals blocked
- ✅ One coupon per referral
- ✅ Code can be used only once

## API Integration

### 3X-UI Panel

The bot integrates with 3X-UI panel API to:
- Create VLESS clients
- Update subscription expiry
- Monitor traffic usage
- Generate connection links

**Important**: Each client requires `decryption: 'none'` field.

### MAX Bot API

Uses MAX Bot API for:
- Sending messages to users
- Receiving updates
- Inline keyboards
- File uploads

## Cron Jobs

- **Expiry notifications**: 30, 7, 3, 1 days before expiration
- **Traffic monitoring**: Daily checks
- **State cleanup**: Hourly

## Troubleshooting

### Bot doesn't start

```bash
# Check PostgreSQL
docker-compose logs postgres

# Check bot logs
docker-compose logs vpnbot
```

### Database connection error

Ensure `DB_HOST=postgres` in docker-compose or `DB_HOST=localhost` for local dev.

### 3X-UI "record not found"

Verify `XUI_INBOUND_ID` matches your panel's inbound ID.

### Referral not working

1. Check logs for `[Referral]` entries
2. Verify referral_code column exists in users table
3. Ensure user entered valid code format

## Development

```bash
# Install dev dependencies
npm install

# Run with nodemon (auto-reload)
npx nodemon index.js

# Run tests
npm test
```

## Production Deployment

### Server Requirements

- CPU: 2+ cores
- RAM: 2GB+
- Disk: 20GB+
- Docker & Docker Compose installed

### Deploy Steps

```bash
# 1. Clone repo
git clone <repo-url>
cd max-vpn-bot-my

# 2. Configure
cp .env.example .env
nano .env

# 3. Add instruction video
mkdir -p assets
cp instruction.mp4 assets/

# 4. Start
docker-compose up -d

# 5. Verify
docker-compose ps
docker-compose logs -f
```

### Backup Database

```bash
docker exec vpnbot-postgres pg_dump -U vpn_user vpnbot > backup_$(date +%Y%m%d).sql
```

### Restore Database

```bash
docker exec -i vpnbot-postgres psql -U vpn_user vpnbot < backup_20260420.sql
```

## License

Private - All rights reserved

## Support

For issues and questions:
- Open an issue in the repository
- Contact bot admin via support button
