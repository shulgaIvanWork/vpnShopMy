// Простое управление состояниями FSM в памяти
// В продакшене лучше использовать Redis

class StateManager {
  constructor() {
    this.states = new Map();
  }

  // Установка состояния
  set(userId, state, data = {}) {
    const key = String(userId); // Приводим к строке для консистентности
    console.log('[StateManager] SET key:', key, 'state:', state);
    this.states.set(key, { state, data, updatedAt: Date.now() });
    console.log('[StateManager] Map size:', this.states.size, 'keys:', Array.from(this.states.keys()));
  }

  // Получение состояния
  get(userId) {
    const key = String(userId); // Приводим к строке для консистентности
    console.log('[StateManager] GET key:', key);
    const result = this.states.get(key) || null;
    console.log('[StateManager] GET result:', result?.state);
    return result;
  }

  // Удаление состояния
  delete(userId) {
    this.states.delete(userId);
  }

  // Очистка старых состояний (старше 1 часа)
  cleanup() {
    const oneHour = 60 * 60 * 1000;
    const now = Date.now();
    
    for (const [userId, stateData] of this.states.entries()) {
      if (now - stateData.updatedAt > oneHour) {
        this.states.delete(userId);
      }
    }
  }
}

// Экспортируем одиночный экземпляр
module.exports = new StateManager();
