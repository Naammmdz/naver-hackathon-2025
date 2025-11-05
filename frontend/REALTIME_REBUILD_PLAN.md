# Realtime Backend Completion Plan

## 1. Backend Module Layout
- Move `backend-realtime-service` so it sits beside `backend-core-service`.
- Keep `backend-common-domain` sibling to both services for shared JPA types.

## 2. Common Domain Module
- Add `pom.xml` with Spring Data JPA dependency and Lombok (optional).
- Implement entities: `User`, `Workspace`, `WorkspaceMember`, `WorkspaceRole`.
- Provide repositories: `WorkspaceRepository`, `WorkspaceMemberRepository`.
- Publish module via `mvn -pl backend-common-domain install`.

## 3. Realtime Service Build Updates
- Update `pom.xml` groupId → `com.devflow`.
- Depend on `backend-common-domain`.
- Add protobuf + gRPC codegen plugins (protobuf-maven-plugin + os-maven + build-helper).
- Create `src/main/proto/yjs_codec.proto`.

## 4. gRPC Codec Bridge
- Add `GrpcConfig` to manage channel (host/port properties).
- Add `YjsCodecClient` wrapping generated stubs for merge/state vector calls.
- Add properties: `node.codec.host`, `node.codec.port`, `yjs.codec.enabled`.

## 5. Handler & Manager Wiring
- Inject `WorkspaceMemberRepository` into `YjsWebSocketHandler` for membership + role checks.
- Enforce read-only for viewers, reject non-members.
- Inject `YjsCodecClient` into `YjsDocumentManager` for update merging/state vectors.
- Add toggles: `yjs.codec.enabled`, `yjs.persistence.enabled`.

## 6. Integration Test Suite
- Create `RealtimeIntegrationTests`:
  - Mock gRPC codec.
  - Use embedded Redis (or mock) + H2 DB.
  - Spin up Spring test context with WebSocket client simulation.
  - Validate broadcast + redis fan-out + unauthorized rejection.

## 7. Configuration & Verification
- Extend `application.properties` with codec + redis + postgres settings.
- Run `mvn -pl backend-common-domain install`.
- Run `mvn -pl backend-realtime-service clean verify`.
- Capture logs confirming connection, merge, broadcast, rejection, snapshot persistence.
