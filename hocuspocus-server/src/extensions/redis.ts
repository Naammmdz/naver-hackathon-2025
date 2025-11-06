import { createClient } from 'redis';

interface RedisExtensionOptions {
  host: string;
  port: number;
  channel: string;
}

export function createRedisExtension(options: RedisExtensionOptions, server: any) {
  const channel = options.channel;
  
  const subscriber = createClient({
    socket: {
      host: options.host,
      port: options.port,
    },
  });

  initializeRedis(subscriber, channel, server);

  return {
    async onDestroy() {
      await subscriber.quit();
    },
  };
}

async function initializeRedis(
  subscriber: ReturnType<typeof createClient>,
  channel: string,
  server: any
) {
  try {
    await subscriber.connect();
    await subscriber.subscribe(channel, (message) => {
      handleMetadataMessage(message, server);
    });
    console.log(`✅ Redis subscriber connected to channel: ${channel}`);
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
}

function handleMetadataMessage(message: string, server: any) {
  try {
    const data = JSON.parse(message);
    const { type, id, action, payload, docId } = data;

    // Handle both old format (docId) and new format (type + id)
    const documentId = docId || id;
    if (!documentId) return;

    // Determine document name based on type
    let documentName: string;
    if (type === 'task' || type === 'board') {
      // For workspace-level documents
      // Extract workspace ID from document context if available
      // For now, we'll need to broadcast to workspace document
      // This requires additional context - for now, skip
      return;
    } else {
      // Document rename
      documentName = `document-${documentId}`;
    }
    
    if (server) {
      // Broadcast stateless message to all connections for this document
      server.broadcastStateless(documentName, {
        type: 'metadata',
        action,
        payload,
      });
    }
  } catch (error) {
    console.error('Failed to handle metadata message:', error);
  }
}

