const config = require('./src/config');
const cronService = require('./src/services/cron');

async function main() {
  console.log('🔧 Запуск фонового воркера...');

  // Запускаем cron задачи
  cronService.start();

  // Обработка завершения процесса
  process.on('SIGINT', () => {
    console.log('\n🛑 Остановка воркера...');
    cronService.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Остановка воркера...');
    cronService.stop();
    process.exit(0);
  });

  console.log('✅ Фоновый воркер запущен');
}

// Запуск с обработкой ошибок
main().catch((error) => {
  console.error('Failed to start worker:', error);
  process.exit(1);
});
