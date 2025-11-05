package com.devflow.realtime.codec;

import com.google.protobuf.ByteString;
import io.grpc.ManagedChannel;
import java.util.Objects;

public class YjsCodecClient {

    public record MergeResult(byte[] snapshot, byte[] vector) { }

    private final YjsCodecServiceGrpc.YjsCodecServiceBlockingStub blockingStub;

    public YjsCodecClient(ManagedChannel channel) {
        this.blockingStub = YjsCodecServiceGrpc.newBlockingStub(Objects.requireNonNull(channel));
    }

    public MergeResult merge(byte[] snapshot, byte[] update) {
        MergeRequest request = MergeRequest.newBuilder()
            .setSnapshot(ByteString.copyFrom(snapshot != null ? snapshot : new byte[0]))
            .setUpdate(ByteString.copyFrom(update != null ? update : new byte[0]))
            .build();
        MergeResponse response = blockingStub.mergeUpdates(request);
        return new MergeResult(response.getSnapshot().toByteArray(), response.getVector().toByteArray());
    }

    public byte[] encodeStateAsUpdate(byte[] snapshot, byte[] clientVector) {
        StateAsUpdateRequest request = StateAsUpdateRequest.newBuilder()
            .setSnapshot(ByteString.copyFrom(snapshot != null ? snapshot : new byte[0]))
            .setClientVector(ByteString.copyFrom(clientVector != null ? clientVector : new byte[0]))
            .build();
        StateAsUpdateResponse response = blockingStub.encodeStateAsUpdate(request);
        return response.getUpdate().toByteArray();
    }

    public byte[] encodeStateVector(byte[] snapshot) {
        StateVectorRequest request = StateVectorRequest.newBuilder()
            .setSnapshot(ByteString.copyFrom(snapshot != null ? snapshot : new byte[0]))
            .build();
        StateVectorResponse response = blockingStub.encodeStateVector(request);
        return response.getVector().toByteArray();
    }
}
