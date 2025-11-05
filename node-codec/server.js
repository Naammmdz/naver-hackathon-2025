import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import * as Y from 'yjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROTO_PATH = join(__dirname, 'yjs_codec.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  longs: String,
  enums: String,
  defaults: false,
  oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const YjsCodecService = protoDescriptor.devflow.codec.v1.YjsCodecService;

function asUint8Array(buffer) {
  if (!buffer || buffer.length === 0) {
    return new Uint8Array(0);
  }
  if (buffer instanceof Uint8Array) {
    return buffer;
  }
  return new Uint8Array(buffer);
}

function hydrateDoc(snapshotBytes) {
  const doc = new Y.Doc();
  if (snapshotBytes && snapshotBytes.length > 0) {
    try {
      Y.applyUpdate(doc, asUint8Array(snapshotBytes));
    } catch (error) {
      console.warn('[YjsCodec] Failed to hydrate snapshot:', error);
    }
  }
  return doc;
}

function logCall(method, details) {
  const formatted = Object.entries(details)
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');
  console.log(`[YjsCodec] ${method} ${formatted}`); // eslint-disable-line no-console
}

const codecImpl = {
  MergeUpdates(call, callback) {
    const { snapshot = new Uint8Array(0), update = new Uint8Array(0) } = call.request ?? {};
    try {
      const doc = hydrateDoc(snapshot);
      if (update && update.length > 0) {
        Y.applyUpdate(doc, asUint8Array(update));
      }

      const mergedSnapshot = Y.encodeStateAsUpdate(doc);
      const vector = Y.encodeStateVector(doc);

      logCall('MergeUpdates', {
        snapshot: `${snapshot?.length ?? 0}B`,
        update: `${update?.length ?? 0}B`,
        newSnapshot: `${mergedSnapshot.length}B`,
        vector: `${vector.length}B`
      });

      callback(null, {
        snapshot: Buffer.from(mergedSnapshot),
        vector: Buffer.from(vector)
      });
    } catch (error) {
      console.error('[YjsCodec] MergeUpdates failed', error); // eslint-disable-line no-console
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },

  EncodeStateAsUpdate(call, callback) {
    // Note: gRPC-JS auto-converts snake_case proto fields to camelCase
    const { snapshot = new Uint8Array(0), clientVector = new Uint8Array(0) } = call.request ?? {};
    
    try {
      const doc = hydrateDoc(snapshot);
      const delta = Y.encodeStateAsUpdate(doc, asUint8Array(clientVector));

      logCall('EncodeStateAsUpdate', {
        snapshot: `${snapshot?.length ?? 0}B`,
        clientVector: `${clientVector?.length ?? 0}B`,
        update: `${delta.length}B`
      });

      callback(null, {
        update: Buffer.from(delta)
      });
    } catch (error) {
      console.error('[YjsCodec] EncodeStateAsUpdate failed', error); // eslint-disable-line no-console
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  },

  EncodeStateVector(call, callback) {
    const { snapshot = new Uint8Array(0) } = call.request ?? {};
    try {
      const doc = hydrateDoc(snapshot);
      const vector = Y.encodeStateVector(doc);

      logCall('EncodeStateVector', {
        snapshot: `${snapshot?.length ?? 0}B`,
        vector: `${vector.length}B`
      });

      callback(null, {
        vector: Buffer.from(vector)
      });
    } catch (error) {
      console.error('[YjsCodec] EncodeStateVector failed', error); // eslint-disable-line no-console
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  }
};

export function main() {
  const server = new grpc.Server();
  server.addService(YjsCodecService.service, codecImpl);

  const port = process.env.PORT || process.env.NODE_CODEC_PORT || 50051;
  const address = `0.0.0.0:${port}`;

  server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (error, boundPort) => {
    if (error) {
      console.error('[YjsCodec] Failed to bind gRPC server', error); // eslint-disable-line no-console
      process.exit(1);
    }

    server.start();
    console.log(`[YjsCodec] gRPC server running on port ${boundPort}`); // eslint-disable-line no-console
  });

  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
