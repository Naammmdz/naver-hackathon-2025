import 'dotenv/config';
import { Server } from '@hocuspocus/server';
import { checkPermission } from './utils/checkPermission.js';
import { createDatabaseExtension } from './extensions/database.js';
import { createRedisExtension } from './extensions/redis.js';

const CORE_SERVICE_URL = process.env.CORE_SERVICE_URL || 'http://localhost:8989';
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const POSTGRES_URL = process.env.POSTGRES_URL || 'postgresql://postgres:12345@localhost:5432/yjs';

// Create database extension once (shared pool)
const dbExtension = createDatabaseExtension({ postgresUrl: POSTGRES_URL });

const server = Server.configure({
  port: parseInt(process.env.PORT || '1234', 10),

  async onAuthenticate({ token, documentName, requestHeaders }) {
    // Log authentication attempt
    console.log(`[onAuthenticate] Authentication attempt:`, {
      documentName,
      hasToken: !!token,
      tokenLength: token?.length || 0,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'null',
      headers: requestHeaders ? Object.keys(requestHeaders) : [],
      authorizationHeader: requestHeaders?.authorization ? `${requestHeaders.authorization.substring(0, 30)}...` : 'none'
    });

    // Call backend-core to check permission
    if (!token || token.trim() === '') {
      console.warn(`[onAuthenticate] No token provided for document=${documentName}`);
      throw new Error('Unauthorized: No token provided');
    }
    
    console.log(`[onAuthenticate] Checking permission: doc=${documentName}, core=${CORE_SERVICE_URL}`);
    const permission = await checkPermission(token, documentName, CORE_SERVICE_URL);
    
    console.log(`[onAuthenticate] Permission result:`, {
      allow: permission.allow,
      readOnly: permission.readOnly,
      userId: permission.userId
    });
    
    if (!permission.allow) {
      console.warn(`[onAuthenticate] Unauthorized: doc=${documentName}, readOnly=${permission.readOnly}`);
      throw new Error('Unauthorized');
    }

    const user = {
      id: permission.userId || 'anonymous',
      readOnly: permission.readOnly,
    };
    
    console.log(`[onAuthenticate] Authentication successful:`, user);
    
    return { user };
  },

  // Database extension hooks
  async onLoadDocument({ documentName }) {
    return dbExtension.onLoadDocument({ documentName });
  },

  async onStoreDocument({ documentName, document }) {
    await dbExtension.onStoreDocument({ documentName, document });
  },

  async onDestroy() {
    await dbExtension.onDestroy();
  },
});

// Initialize Redis extension
const redisExtension = createRedisExtension(
  {
    host: REDIS_HOST,
    port: REDIS_PORT,
    channel: 'metadata-channel',
  },
  server
);

// Cleanup on process exit
process.on('SIGTERM', async () => {
  await redisExtension.onDestroy();
  await dbExtension.onDestroy();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await redisExtension.onDestroy();
  await dbExtension.onDestroy();
  process.exit(0);
});

server.listen()
  .then(() => {
    console.log(`🚀 Hocuspocus server running on ws://localhost:${process.env.PORT || '1234'}`);
  })
  .catch((error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${process.env.PORT || '1234'} is already in use. Please kill the process using this port or choose a different port.`);
      console.error(`   Run: lsof -ti:${process.env.PORT || '1234'} | xargs kill -9`);
    } else {
      console.error('❌ Failed to start server:', error);
    }
    process.exit(1);
  });

