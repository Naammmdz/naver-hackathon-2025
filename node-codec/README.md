# Devflow Yjs Codec Bridge

Node.js gRPC microservice that performs Yjs CRDT operations for the realtime Spring backend.

## Prerequisites

- Node.js 18 or newer
- npm (or pnpm/yarn) for dependency management

## Installation

```bash
cd node-codec
npm install
```

> ℹ️ The project relies on `@grpc/grpc-js`, `@grpc/proto-loader`, and `yjs`.  
> Fetching these packages requires network access to the npm registry.

## Running the Server

```bash
npm start
```

Environment variables:

| Name               | Default | Description                       |
|--------------------|---------|-----------------------------------|
| `PORT`             | `50051` | Port the gRPC server listens on   |
| `NODE_CODEC_PORT`  | `50051` | Alternate env var for the port    |

All RPC invocations log their payload sizes, for example:

```
[YjsCodec] MergeUpdates snapshot=1024B update=256B newSnapshot=1280B vector=40B
```

To run with auto-reload during development:

```bash
npm run dev
```

## API

The service implements `devflow.codec.v1.YjsCodecService` as defined in `yjs_codec.proto`:

- `MergeUpdates` — merges an update into a snapshot and returns the merged snapshot and state vector.
- `EncodeStateAsUpdate` — produces a delta update for a client state vector.
- `EncodeStateVector` — returns the current state vector for a snapshot.

Snapshots are represented as Yjs state updates, so applying them to an empty `Y.Doc` reconstructs the document state.
