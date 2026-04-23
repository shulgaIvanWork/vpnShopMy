const axios = require('axios');
const config = require('../config');

class XuiService {
  constructor() {
    // Поддержка нескольких серверов с полной конфигурацией
    this.servers = config.xui.servers;
    this.inboundId = config.xui.inboundId;
    this.maxClientsPerServer = config.xui.maxClientsPerServer;
    
    // Кэш для cookies и информации о серверах
    this.serverCookies = {};
    this.serverInfo = {};
    
    console.log('[XuiService] Servers config:', this.servers.length, 'servers');
    console.log('[XuiService] Servers:', this.servers.map(s => ({ 
      url: s.url, 
      name: s.name,
      maxClients: s.maxClients || this.maxClientsPerServer 
    })));
    console.log('[XuiService] Default max clients:', this.maxClientsPerServer);
  }

  // Получить URL наименее загруженного сервера
  async getLeastLoadedServer() {
    for (let i = 0; i < this.servers.length; i++) {
      const server = this.servers[i];
      const serverUrl = server.url.replace(/\/$/, '');
      const maxClients = server.maxClients || this.maxClientsPerServer;
      
      try {
        // Получаем информацию о сервере
        const clientCount = await this.getClientCount(serverUrl, i);
        console.log(`[XuiService] Server ${i} (${server.name}): ${clientCount}/${maxClients} clients`);
        
        if (clientCount < maxClients) {
          console.log(`[XuiService] Selected server ${i} (${server.name}) with ${clientCount} clients`);
          return { url: serverUrl, index: i, clientCount, server };
        }
      } catch (error) {
        console.error(`[XuiService] Failed to check server ${i} (${server.name}):`, error.message);
      }
    }
    
    // Если все сервера заполнены, используем первый
    console.log('[XuiService] All servers full, using server 0');
    return { url: this.servers[0].url.replace(/\/$/, ''), index: 0, clientCount: this.servers[0].maxClients || this.maxClientsPerServer, server: this.servers[0] };
  }

  // Получить количество клиентов на сервере
  async getClientCount(serverUrl, serverIndex) {
    try {
      await this.loginToServer(serverUrl, serverIndex);
      
      const inboundIdToUse = this.servers[serverIndex].inboundId || this.inboundId;
      console.log(`[XuiService] Getting client count for server ${serverIndex}, inbound ID: ${inboundIdToUse}`);
      
      const response = await axios.get(
        `${serverUrl}/panel/api/inbounds/get/${inboundIdToUse}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Cookie': this.serverCookies[serverIndex],
          },
        }
      );

      console.log(`[XuiService] Get inbound response status:`, response.data.success);
      
      if (!response.data.success) {
        console.error(`[XuiService] Get inbound failed:`, response.data);
        return 0;
      }

      const inbound = response.data.obj;
      const settings = JSON.parse(inbound.settings || '{}');
      const clients = settings.clients || [];
      
      console.log(`[XuiService] Inbound ID ${inboundIdToUse}: ${clients.length} clients found`);
      if (clients.length > 0) {
        console.log(`[XuiService] First client email:`, clients[0].email);
      }
      
      return clients.length;
    } catch (error) {
      console.error(`[XuiService] Failed to get client count:`, error.message);
      if (error.response) {
        console.error(`[XuiService] Response data:`, error.response.data);
      }
      return 0;
    }
  }

  // Авторизация на конкретном сервере
  async loginToServer(serverUrl, serverIndex) {
    if (this.serverCookies[serverIndex]) return this.serverCookies[serverIndex];
    
    const server = this.servers[serverIndex];
    if (!server) {
      throw new Error(`Server index ${serverIndex} not found`);
    }
    
    try {
      const response = await axios.post(`${serverUrl}/login`, {
        username: server.username,
        password: server.password,
      }, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.data.success) {
        const cookies = response.headers['set-cookie'];
        this.serverCookies[serverIndex] = cookies ? cookies.join('; ') : null;
        return this.serverCookies[serverIndex];
      }
      throw new Error('Login failed');
    } catch (error) {
      console.error(`[XuiService] Login Error (Server ${serverIndex} - ${server.name}):`, error.message);
      throw error;
    }
  }

  // Авторизация в панели (для обратной совместимости)
  async login() {
    return this.loginToServer(this.servers[0].url.replace(/\/$/, ''), 0);
  }

  // Добавление клиента (с автоматическим выбором сервера)
  async addClientWithServer(email, uuid, limitIp = 0, expiryTime = 0, inboundId = null) {
    // Выбираем наименее загруженный сервер
    const server = await this.getLeastLoadedServer();
    
    // Используем переданный inboundId, или inboundId сервера, или this.inboundId
    const actualInboundId = inboundId || server.server.inboundId || this.inboundId;
    console.log(`[XuiService] Using inbound ID: ${actualInboundId} (from: ${inboundId ? 'parameter' : server.server.inboundId ? 'server config' : 'global config'})`);
    
    console.log(`[XuiService] Adding client to server ${server.index}: ${server.url}`);
    
    return this.addClientToServer(
      server.url,
      server.index,
      actualInboundId,
      email,
      uuid,
      limitIp,
      expiryTime
    );
  }

  // Добавление клиента на конкретный сервер
  async addClientToServer(serverUrl, serverIndex, inboundId, email, uuid, limitIp = 0, expiryTime = 0) {
    try {
      await this.loginToServer(serverUrl, serverIndex);
      
      const server = this.servers[serverIndex];
      
      // Формируем правильное имя: ConnectionName-user_ID
      const connectionName = server.name || 'MAX_VPN';
      const connectionEmail = `${email}`;
      
      console.log(`[XuiService] Server ${serverIndex} (${server.name}):`);
      console.log(`[XuiService] Connection name:`, connectionName);
      console.log(`[XuiService] Email for 3X-UI:`, connectionEmail);
      console.log(`[XuiService] Inbound ID:`, inboundId);
      console.log(`[XuiService] UUID:`, uuid);
      console.log(`[XuiService] Expiry:`, expiryTime);
      console.log(`[XuiService] Limit IP:`, limitIp);
      console.log(`[XuiService] Cookie available:`, !!this.serverCookies[serverIndex]);
      
      const clientData = {
        id: uuid,
        email: connectionEmail,
        limitIp: limitIp,
        totalGB: 0,
        expiryTime: expiryTime,
        enable: true,
        tgId: '',
        subId: '',
        comment: '',
        // ВАЖНО: decryption должен быть 'none' для каждого клиента VLESS
        decryption: 'none',
      };

      const response = await axios.post(
        `${serverUrl}/panel/api/inbounds/addClient`,
        {
          id: inboundId,
          settings: JSON.stringify({
            clients: [clientData],
            // ВАЖНО: decryption должен быть строкой "none", не массивом!
            decryption: 'none',
          }),
          // ВАЖНО: streamSettings должен быть JSON СТРОКОЙ, не объектом!
          streamSettings: JSON.stringify({
            network: 'ws',
            security: 'none',
            wsSettings: {
              path: '/vpn',
              headers: {}
            }
          })
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Cookie': this.serverCookies[serverIndex],
          },
        }
      );

      console.log(`[XuiService] Response status:`, response.status);
      console.log(`[XuiService] Response data:`, JSON.stringify(response.data, null, 2));

      console.log(`[XuiService] Client added to server ${serverIndex}:`, connectionEmail);
      return { ...response.data, serverIndex, serverUrl, connectionName };
    } catch (error) {
      console.error(`[XuiService] Add Client Error (Server ${serverIndex} - ${server.name}):`, error.message);
      throw error;
    }
  }

  // Добавление клиента (старый метод для обратной совместимости)
  async addClient(inboundId, email, uuid, limitIp = 0, expiryTime = 0) {
    console.log('[XuiService] addClient called with inboundId:', inboundId);
    // Используем переданный inboundId вместо this.inboundId
    return this.addClientWithServer(email, uuid, limitIp, expiryTime, inboundId);
  }

  // Обновление клиента (для продления подписки)
  async updateClient(inboundId, uuid, expiryTime) {
    try {
      console.log('[XuiService] === UPDATE CLIENT START ===');
      console.log('[XuiService] Inbound ID:', inboundId);
      console.log('[XuiService] UUID:', uuid);
      console.log('[XuiService] Expiry Time:', expiryTime, '(', new Date(expiryTime).toISOString(), ')');
      console.log('[XuiService] Servers:', this.servers.map(s => ({ url: s.url, name: s.name })));
      
      // Используем первый сервер (клиент уже там создан)
      const server = this.servers[0];
      const serverUrl = server.url.replace(/\/$/, '');
      const serverIndex = 0;
      
      console.log('[XuiService] Using server:', server.name, '(', serverUrl, ')');
      console.log('[XuiService] Server index:', serverIndex);
      
      // Авторизуемся на сервере
      await this.loginToServer(serverUrl, serverIndex);
      console.log('[XuiService] Logged in successfully');
      
      // Сначала получаем список клиентов inbound
      const getUrl = `${serverUrl}/panel/api/inbounds/get/${inboundId}`;
      console.log('[XuiService] Fetching inbound from:', getUrl);
      
      const listResponse = await axios.get(getUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': this.serverCookies[serverIndex],
        },
      });

      console.log('[XuiService] Inbound response:', listResponse.data.success ? 'SUCCESS' : 'FAILED');
      
      if (!listResponse.data.success) {
        throw new Error('Failed to get inbound: ' + listResponse.data.msg);
      }

      const inbound = listResponse.data.obj;
      console.log('[XuiService] Inbound remark:', inbound.remark);
      console.log('[XuiService] Inbound protocol:', inbound.protocol);
      
      const settings = JSON.parse(inbound.settings || '{}');
      const clients = settings.clients || [];
      
      console.log('[XuiService] Found', clients.length, 'clients in inbound');
      
      // ВАЖНО: Проверяем и исправляем decryption у ВСЕХ клиентов
      let fixedClients = 0;
      clients.forEach((client, idx) => {
        if (!client.decryption || client.decryption !== 'none') {
          console.log(`[XuiService] Fixing decryption for client ${idx} (${client.email}): '${client.decryption || 'undefined'}' -> 'none'`);
          client.decryption = 'none';
          fixedClients++;
        }
      });
      
      if (fixedClients > 0) {
        console.log(`[XuiService] Fixed decryption for ${fixedClients} clients`);
      }
      
      console.log('[XuiService] Searching for UUID:', uuid);
      console.log('[XuiService] Available UUIDs:', clients.map(c => c.id));
      console.log('[XuiService] Available emails:', clients.map(c => c.email));
      
      // Находим клиента по UUID или по email
      let clientIndex = clients.findIndex(c => c.id === uuid);
      
      // Если не нашли по UUID, ищем по email
      if (clientIndex === -1) {
        // Получаем connection name для этого сервера
        const server = this.servers[serverIndex];
        const connectionName = server.name || 'MAX_VPN';
        const userId = 1; // TODO: передавать user.id параметром
        
        // Пробуем разные форматы email
        const possibleEmails = [
          `${connectionName}-user_${userId}`,
          `user_${userId}`,
        ];
        
        console.log('[XuiService] UUID not found, searching by email...');
        console.log('[XuiService] Possible emails:', possibleEmails);
        console.log('[XuiService] Actual emails on server:', clients.map(c => c.email));
        
        for (const email of possibleEmails) {
          clientIndex = clients.findIndex(c => c.email === email);
          if (clientIndex !== -1) {
            console.log('[XuiService] ✓ Found client by email:', email, 'at index:', clientIndex);
            console.log('[XuiService] Server UUID:', clients[clientIndex].id);
            console.log('[XuiService] DB UUID:', uuid);
            console.log('[XuiService] Server email:', clients[clientIndex].email);
            break;
          }
        }
      }
      
      if (clientIndex === -1) {
        console.error('[XuiService] ✗ Client NOT FOUND!');
        console.error('[XuiService] Searched UUID:', uuid);
        console.error('[XuiService] Available clients:', JSON.stringify(clients.map(c => ({ id: c.id, email: c.email })), null, 2));
        throw new Error(`Client with UUID ${uuid} not found. Available: ${clients.map(c => c.id).join(', ')}`);
      }

      console.log('[XuiService] Client found at index:', clientIndex);
      console.log('[XuiService] Client email:', clients[clientIndex].email);
      console.log('[XuiService] Client UUID:', clients[clientIndex].id);
      console.log('[XuiService] Client decryption:', clients[clientIndex].decryption);
      console.log('[XuiService] Old expiry:', new Date(clients[clientIndex].expiryTime).toISOString());
      console.log('[XuiService] New expiry:', new Date(expiryTime).toISOString());

      // Обновляем expiryTime у клиента
      clients[clientIndex].expiryTime = expiryTime;
      clients[clientIndex].enable = true;
      // ВАЖНО: decryption должен быть 'none' для каждого клиента VLESS
      clients[clientIndex].decryption = 'none';

      console.log('[XuiService] Updated client in memory');

      // Обновляем весь inbound с новыми настройками
      const updatePayload = {
        id: inboundId,
        up: inbound.up || 0,
        down: inbound.down || 0,
        total: inbound.total || 0,
        remark: inbound.remark,
        enable: inbound.enable,
        expiryTime: inbound.expiryTime || 0,
        listen: inbound.listen || '',
        port: inbound.port,
        protocol: inbound.protocol,
        settings: JSON.stringify({
          clients: clients,
          // ВАЖНО: decryption должен быть строкой "none" (берём из оригинального settings)
          decryption: settings.decryption || 'none',
        }),
        // ВАЖНО: streamSettings должен остаться как есть из inbound (уже строка)
        streamSettings: inbound.streamSettings || JSON.stringify({
          network: 'ws',
          security: 'none',
          wsSettings: {
            path: '/vpn',
            headers: {}
          }
        }),
        sniffing: inbound.sniffing || { enabled: false },
      };

      const updateUrl = `${serverUrl}/panel/api/inbounds/update/${inboundId}`;
      console.log('[XuiService] Updating inbound at:', updateUrl);
      console.log('[XuiService] Payload size:', JSON.stringify(updatePayload).length, 'bytes');
      console.log('[XuiService] StreamSettings type:', typeof updatePayload.streamSettings);
      console.log('[XuiService] Decryptions:', JSON.parse(updatePayload.settings).decryptions);
      
      const response = await axios.post(updateUrl, updatePayload, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': this.serverCookies[serverIndex],
        },
      });

      console.log('[XuiService] Update Response:', response.data.success ? 'SUCCESS' : 'FAILED', response.data.msg || '');
      
      if (response.data && response.data.success) {
        console.log('[XuiService] ✓ Client updated successfully');
        // Возвращаем реальный UUID клиента (на случай если он отличается)
        return { 
          success: true, 
          realUuid: clients[clientIndex].id,
          email: clients[clientIndex].email 
        };
      } else {
        console.error('[XuiService] ✗ Update failed:', response.data);
        throw new Error(response.data.msg || 'Update failed');
      }
      
    } catch (error) {
      console.error('[XuiService] ✗ Update Client Error:', error.message);
      console.error('[XuiService] Error stack:', error.stack);
      if (error.response) {
        console.error('[XuiService] Response status:', error.response.status);
        console.error('[XuiService] Response data:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  // Удаление клиента
  async deleteClient(inboundId, uuid) {
    try {
      const cookie = await this.login();
      
      const response = await axios.post(
        `${this.baseUrl}/panel/api/inbounds/${inboundId}/delClient/${uuid}`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'Cookie': cookie,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('X-UI Delete Client Error:', error.message);
      throw error;
    }
  }

  // Получение трафика клиента (по email)
  async getClientTraffic(email) {
    try {
      // Ищем клиента на всех серверах
      for (let i = 0; i < this.servers.length; i++) {
        const server = this.servers[i];
        const serverUrl = server.url.replace(/\/$/, '');
        const inboundIdToUse = server.inboundId || this.inboundId;
        
        try {
          await this.loginToServer(serverUrl, i);
          
          console.log(`[XuiService] Searching for client '${email}' on server ${i} (${server.name}), inbound ${inboundIdToUse}`);
          
          const response = await axios.get(
            `${serverUrl}/panel/api/inbounds/get/${inboundIdToUse}`,
            {
              headers: {
                'Content-Type': 'application/json',
                'Cookie': this.serverCookies[i],
              },
            }
          );

          if (!response.data.success || !response.data.obj) {
            console.log(`[XuiService] Server ${i} response not successful or empty`);
            continue;
          }
          
          const inbound = response.data.obj;
          const settings = JSON.parse(inbound.settings || '{}');
          const clients = settings.clients || [];
          
          console.log(`[XuiService] Server ${i}: ${clients.length} total clients`);
          
          const client = clients.find(c => c.email === email);
          
          if (client) {
            console.log(`[XuiService] Client found on server ${i}!`);
            return {
              email: client.email,
              up: client.up || 0,
              down: client.down || 0,
              total: (client.up || 0) + (client.down || 0),
              server: server.name,
            };
          }
        } catch (error) {
          console.error(`[XuiService] Failed to get traffic from server ${i}:`, error.message);
        }
      }

      console.log(`[XuiService] Client '${email}' not found on any server`);
      return null;
    } catch (error) {
      console.error('[XuiService] Get Traffic Error:', error.message);
      throw error;
    }
  }

  // ВАЖНО: Исправить decryption у ВСЕХ клиентов на сервере (вызвать один раз!)
  async fixAllClientsDecryption() {
    console.log('[XuiService] === FIXING ALL CLIENTS DECRYPTION ===');
    
    for (let serverIndex = 0; serverIndex < this.servers.length; serverIndex++) {
      const server = this.servers[serverIndex];
      const serverUrl = server.url.replace(/\/$/, '');
      
      console.log(`[XuiService] Checking server ${serverIndex}: ${server.name}`);
      
      try {
        await this.loginToServer(serverUrl, serverIndex);
        
        const getUrl = `${serverUrl}/panel/api/inbounds/get/${this.inboundId}`;
        const response = await axios.get(getUrl, {
          headers: {
            'Content-Type': 'application/json',
            'Cookie': this.serverCookies[serverIndex],
          },
        });
        
        if (!response.data.success) {
          console.error(`[XuiService] Failed to get inbound from server ${serverIndex}`);
          continue;
        }
        
        const inbound = response.data.obj;
        const settings = JSON.parse(inbound.settings || '{}');
        const clients = settings.clients || [];
        
        let fixedCount = 0;
        clients.forEach((client, idx) => {
          if (!client.decryption || client.decryption !== 'none') {
            console.log(`[XuiService] Fixing client ${idx} (${client.email}): '${client.decryption || 'undefined'}' -> 'none'`);
            client.decryption = 'none';
            fixedCount++;
          }
        });
        
        if (fixedCount > 0) {
          console.log(`[XuiService] Updating inbound with ${fixedCount} fixed clients`);
          
          const updatePayload = {
            id: this.inboundId,
            up: inbound.up || 0,
            down: inbound.down || 0,
            total: inbound.total || 0,
            remark: inbound.remark,
            enable: inbound.enable,
            expiryTime: inbound.expiryTime || 0,
            listen: inbound.listen || '',
            port: inbound.port,
            protocol: inbound.protocol,
            settings: JSON.stringify({
              clients: clients,
              decryption: 'none',
            }),
            streamSettings: inbound.streamSettings,
            sniffing: inbound.sniffing || { enabled: false },
          };
          
          const updateUrl = `${serverUrl}/panel/api/inbounds/update/${this.inboundId}`;
          const updateResponse = await axios.post(updateUrl, updatePayload, {
            headers: {
              'Content-Type': 'application/json',
              'Cookie': this.serverCookies[serverIndex],
            },
          });
          
          if (updateResponse.data.success) {
            console.log(`[XuiService] ✓ Server ${serverIndex} fixed successfully!`);
          } else {
            console.error(`[XuiService] ✗ Failed to update server ${serverIndex}:`, updateResponse.data.msg);
          }
        } else {
          console.log(`[XuiService] ✓ Server ${serverIndex} already OK`);
        }
      } catch (error) {
        console.error(`[XuiService] Error fixing server ${serverIndex}:`, error.message);
      }
    }
    
    console.log('[XuiService] === FIX COMPLETE ===');
  }
}

module.exports = new XuiService();
