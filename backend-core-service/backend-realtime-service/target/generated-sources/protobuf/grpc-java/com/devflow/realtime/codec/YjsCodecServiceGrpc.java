package com.devflow.realtime.codec;

import static io.grpc.MethodDescriptor.generateFullMethodName;

/**
 */
@javax.annotation.Generated(
    value = "by gRPC proto compiler (version 1.68.0)",
    comments = "Source: yjs_codec.proto")
@io.grpc.stub.annotations.GrpcGenerated
public final class YjsCodecServiceGrpc {

  private YjsCodecServiceGrpc() {}

  public static final java.lang.String SERVICE_NAME = "devflow.codec.v1.YjsCodecService";

  // Static method descriptors that strictly reflect the proto.
  private static volatile io.grpc.MethodDescriptor<com.devflow.realtime.codec.MergeRequest,
      com.devflow.realtime.codec.MergeResponse> getMergeUpdatesMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "MergeUpdates",
      requestType = com.devflow.realtime.codec.MergeRequest.class,
      responseType = com.devflow.realtime.codec.MergeResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.devflow.realtime.codec.MergeRequest,
      com.devflow.realtime.codec.MergeResponse> getMergeUpdatesMethod() {
    io.grpc.MethodDescriptor<com.devflow.realtime.codec.MergeRequest, com.devflow.realtime.codec.MergeResponse> getMergeUpdatesMethod;
    if ((getMergeUpdatesMethod = YjsCodecServiceGrpc.getMergeUpdatesMethod) == null) {
      synchronized (YjsCodecServiceGrpc.class) {
        if ((getMergeUpdatesMethod = YjsCodecServiceGrpc.getMergeUpdatesMethod) == null) {
          YjsCodecServiceGrpc.getMergeUpdatesMethod = getMergeUpdatesMethod =
              io.grpc.MethodDescriptor.<com.devflow.realtime.codec.MergeRequest, com.devflow.realtime.codec.MergeResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "MergeUpdates"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.devflow.realtime.codec.MergeRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.devflow.realtime.codec.MergeResponse.getDefaultInstance()))
              .setSchemaDescriptor(new YjsCodecServiceMethodDescriptorSupplier("MergeUpdates"))
              .build();
        }
      }
    }
    return getMergeUpdatesMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.devflow.realtime.codec.StateAsUpdateRequest,
      com.devflow.realtime.codec.StateAsUpdateResponse> getEncodeStateAsUpdateMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "EncodeStateAsUpdate",
      requestType = com.devflow.realtime.codec.StateAsUpdateRequest.class,
      responseType = com.devflow.realtime.codec.StateAsUpdateResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.devflow.realtime.codec.StateAsUpdateRequest,
      com.devflow.realtime.codec.StateAsUpdateResponse> getEncodeStateAsUpdateMethod() {
    io.grpc.MethodDescriptor<com.devflow.realtime.codec.StateAsUpdateRequest, com.devflow.realtime.codec.StateAsUpdateResponse> getEncodeStateAsUpdateMethod;
    if ((getEncodeStateAsUpdateMethod = YjsCodecServiceGrpc.getEncodeStateAsUpdateMethod) == null) {
      synchronized (YjsCodecServiceGrpc.class) {
        if ((getEncodeStateAsUpdateMethod = YjsCodecServiceGrpc.getEncodeStateAsUpdateMethod) == null) {
          YjsCodecServiceGrpc.getEncodeStateAsUpdateMethod = getEncodeStateAsUpdateMethod =
              io.grpc.MethodDescriptor.<com.devflow.realtime.codec.StateAsUpdateRequest, com.devflow.realtime.codec.StateAsUpdateResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "EncodeStateAsUpdate"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.devflow.realtime.codec.StateAsUpdateRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.devflow.realtime.codec.StateAsUpdateResponse.getDefaultInstance()))
              .setSchemaDescriptor(new YjsCodecServiceMethodDescriptorSupplier("EncodeStateAsUpdate"))
              .build();
        }
      }
    }
    return getEncodeStateAsUpdateMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.devflow.realtime.codec.StateVectorRequest,
      com.devflow.realtime.codec.StateVectorResponse> getEncodeStateVectorMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "EncodeStateVector",
      requestType = com.devflow.realtime.codec.StateVectorRequest.class,
      responseType = com.devflow.realtime.codec.StateVectorResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.devflow.realtime.codec.StateVectorRequest,
      com.devflow.realtime.codec.StateVectorResponse> getEncodeStateVectorMethod() {
    io.grpc.MethodDescriptor<com.devflow.realtime.codec.StateVectorRequest, com.devflow.realtime.codec.StateVectorResponse> getEncodeStateVectorMethod;
    if ((getEncodeStateVectorMethod = YjsCodecServiceGrpc.getEncodeStateVectorMethod) == null) {
      synchronized (YjsCodecServiceGrpc.class) {
        if ((getEncodeStateVectorMethod = YjsCodecServiceGrpc.getEncodeStateVectorMethod) == null) {
          YjsCodecServiceGrpc.getEncodeStateVectorMethod = getEncodeStateVectorMethod =
              io.grpc.MethodDescriptor.<com.devflow.realtime.codec.StateVectorRequest, com.devflow.realtime.codec.StateVectorResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "EncodeStateVector"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.devflow.realtime.codec.StateVectorRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.devflow.realtime.codec.StateVectorResponse.getDefaultInstance()))
              .setSchemaDescriptor(new YjsCodecServiceMethodDescriptorSupplier("EncodeStateVector"))
              .build();
        }
      }
    }
    return getEncodeStateVectorMethod;
  }

  /**
   * Creates a new async stub that supports all call types for the service
   */
  public static YjsCodecServiceStub newStub(io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<YjsCodecServiceStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<YjsCodecServiceStub>() {
        @java.lang.Override
        public YjsCodecServiceStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new YjsCodecServiceStub(channel, callOptions);
        }
      };
    return YjsCodecServiceStub.newStub(factory, channel);
  }

  /**
   * Creates a new blocking-style stub that supports unary and streaming output calls on the service
   */
  public static YjsCodecServiceBlockingStub newBlockingStub(
      io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<YjsCodecServiceBlockingStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<YjsCodecServiceBlockingStub>() {
        @java.lang.Override
        public YjsCodecServiceBlockingStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new YjsCodecServiceBlockingStub(channel, callOptions);
        }
      };
    return YjsCodecServiceBlockingStub.newStub(factory, channel);
  }

  /**
   * Creates a new ListenableFuture-style stub that supports unary calls on the service
   */
  public static YjsCodecServiceFutureStub newFutureStub(
      io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<YjsCodecServiceFutureStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<YjsCodecServiceFutureStub>() {
        @java.lang.Override
        public YjsCodecServiceFutureStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new YjsCodecServiceFutureStub(channel, callOptions);
        }
      };
    return YjsCodecServiceFutureStub.newStub(factory, channel);
  }

  /**
   */
  public interface AsyncService {

    /**
     */
    default void mergeUpdates(com.devflow.realtime.codec.MergeRequest request,
        io.grpc.stub.StreamObserver<com.devflow.realtime.codec.MergeResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getMergeUpdatesMethod(), responseObserver);
    }

    /**
     */
    default void encodeStateAsUpdate(com.devflow.realtime.codec.StateAsUpdateRequest request,
        io.grpc.stub.StreamObserver<com.devflow.realtime.codec.StateAsUpdateResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getEncodeStateAsUpdateMethod(), responseObserver);
    }

    /**
     */
    default void encodeStateVector(com.devflow.realtime.codec.StateVectorRequest request,
        io.grpc.stub.StreamObserver<com.devflow.realtime.codec.StateVectorResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getEncodeStateVectorMethod(), responseObserver);
    }
  }

  /**
   * Base class for the server implementation of the service YjsCodecService.
   */
  public static abstract class YjsCodecServiceImplBase
      implements io.grpc.BindableService, AsyncService {

    @java.lang.Override public final io.grpc.ServerServiceDefinition bindService() {
      return YjsCodecServiceGrpc.bindService(this);
    }
  }

  /**
   * A stub to allow clients to do asynchronous rpc calls to service YjsCodecService.
   */
  public static final class YjsCodecServiceStub
      extends io.grpc.stub.AbstractAsyncStub<YjsCodecServiceStub> {
    private YjsCodecServiceStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected YjsCodecServiceStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new YjsCodecServiceStub(channel, callOptions);
    }

    /**
     */
    public void mergeUpdates(com.devflow.realtime.codec.MergeRequest request,
        io.grpc.stub.StreamObserver<com.devflow.realtime.codec.MergeResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getMergeUpdatesMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void encodeStateAsUpdate(com.devflow.realtime.codec.StateAsUpdateRequest request,
        io.grpc.stub.StreamObserver<com.devflow.realtime.codec.StateAsUpdateResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getEncodeStateAsUpdateMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void encodeStateVector(com.devflow.realtime.codec.StateVectorRequest request,
        io.grpc.stub.StreamObserver<com.devflow.realtime.codec.StateVectorResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getEncodeStateVectorMethod(), getCallOptions()), request, responseObserver);
    }
  }

  /**
   * A stub to allow clients to do synchronous rpc calls to service YjsCodecService.
   */
  public static final class YjsCodecServiceBlockingStub
      extends io.grpc.stub.AbstractBlockingStub<YjsCodecServiceBlockingStub> {
    private YjsCodecServiceBlockingStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected YjsCodecServiceBlockingStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new YjsCodecServiceBlockingStub(channel, callOptions);
    }

    /**
     */
    public com.devflow.realtime.codec.MergeResponse mergeUpdates(com.devflow.realtime.codec.MergeRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getMergeUpdatesMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.devflow.realtime.codec.StateAsUpdateResponse encodeStateAsUpdate(com.devflow.realtime.codec.StateAsUpdateRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getEncodeStateAsUpdateMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.devflow.realtime.codec.StateVectorResponse encodeStateVector(com.devflow.realtime.codec.StateVectorRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getEncodeStateVectorMethod(), getCallOptions(), request);
    }
  }

  /**
   * A stub to allow clients to do ListenableFuture-style rpc calls to service YjsCodecService.
   */
  public static final class YjsCodecServiceFutureStub
      extends io.grpc.stub.AbstractFutureStub<YjsCodecServiceFutureStub> {
    private YjsCodecServiceFutureStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected YjsCodecServiceFutureStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new YjsCodecServiceFutureStub(channel, callOptions);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.devflow.realtime.codec.MergeResponse> mergeUpdates(
        com.devflow.realtime.codec.MergeRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getMergeUpdatesMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.devflow.realtime.codec.StateAsUpdateResponse> encodeStateAsUpdate(
        com.devflow.realtime.codec.StateAsUpdateRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getEncodeStateAsUpdateMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.devflow.realtime.codec.StateVectorResponse> encodeStateVector(
        com.devflow.realtime.codec.StateVectorRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getEncodeStateVectorMethod(), getCallOptions()), request);
    }
  }

  private static final int METHODID_MERGE_UPDATES = 0;
  private static final int METHODID_ENCODE_STATE_AS_UPDATE = 1;
  private static final int METHODID_ENCODE_STATE_VECTOR = 2;

  private static final class MethodHandlers<Req, Resp> implements
      io.grpc.stub.ServerCalls.UnaryMethod<Req, Resp>,
      io.grpc.stub.ServerCalls.ServerStreamingMethod<Req, Resp>,
      io.grpc.stub.ServerCalls.ClientStreamingMethod<Req, Resp>,
      io.grpc.stub.ServerCalls.BidiStreamingMethod<Req, Resp> {
    private final AsyncService serviceImpl;
    private final int methodId;

    MethodHandlers(AsyncService serviceImpl, int methodId) {
      this.serviceImpl = serviceImpl;
      this.methodId = methodId;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("unchecked")
    public void invoke(Req request, io.grpc.stub.StreamObserver<Resp> responseObserver) {
      switch (methodId) {
        case METHODID_MERGE_UPDATES:
          serviceImpl.mergeUpdates((com.devflow.realtime.codec.MergeRequest) request,
              (io.grpc.stub.StreamObserver<com.devflow.realtime.codec.MergeResponse>) responseObserver);
          break;
        case METHODID_ENCODE_STATE_AS_UPDATE:
          serviceImpl.encodeStateAsUpdate((com.devflow.realtime.codec.StateAsUpdateRequest) request,
              (io.grpc.stub.StreamObserver<com.devflow.realtime.codec.StateAsUpdateResponse>) responseObserver);
          break;
        case METHODID_ENCODE_STATE_VECTOR:
          serviceImpl.encodeStateVector((com.devflow.realtime.codec.StateVectorRequest) request,
              (io.grpc.stub.StreamObserver<com.devflow.realtime.codec.StateVectorResponse>) responseObserver);
          break;
        default:
          throw new AssertionError();
      }
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("unchecked")
    public io.grpc.stub.StreamObserver<Req> invoke(
        io.grpc.stub.StreamObserver<Resp> responseObserver) {
      switch (methodId) {
        default:
          throw new AssertionError();
      }
    }
  }

  public static final io.grpc.ServerServiceDefinition bindService(AsyncService service) {
    return io.grpc.ServerServiceDefinition.builder(getServiceDescriptor())
        .addMethod(
          getMergeUpdatesMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.devflow.realtime.codec.MergeRequest,
              com.devflow.realtime.codec.MergeResponse>(
                service, METHODID_MERGE_UPDATES)))
        .addMethod(
          getEncodeStateAsUpdateMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.devflow.realtime.codec.StateAsUpdateRequest,
              com.devflow.realtime.codec.StateAsUpdateResponse>(
                service, METHODID_ENCODE_STATE_AS_UPDATE)))
        .addMethod(
          getEncodeStateVectorMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.devflow.realtime.codec.StateVectorRequest,
              com.devflow.realtime.codec.StateVectorResponse>(
                service, METHODID_ENCODE_STATE_VECTOR)))
        .build();
  }

  private static abstract class YjsCodecServiceBaseDescriptorSupplier
      implements io.grpc.protobuf.ProtoFileDescriptorSupplier, io.grpc.protobuf.ProtoServiceDescriptorSupplier {
    YjsCodecServiceBaseDescriptorSupplier() {}

    @java.lang.Override
    public com.google.protobuf.Descriptors.FileDescriptor getFileDescriptor() {
      return com.devflow.realtime.codec.YjsCodecProto.getDescriptor();
    }

    @java.lang.Override
    public com.google.protobuf.Descriptors.ServiceDescriptor getServiceDescriptor() {
      return getFileDescriptor().findServiceByName("YjsCodecService");
    }
  }

  private static final class YjsCodecServiceFileDescriptorSupplier
      extends YjsCodecServiceBaseDescriptorSupplier {
    YjsCodecServiceFileDescriptorSupplier() {}
  }

  private static final class YjsCodecServiceMethodDescriptorSupplier
      extends YjsCodecServiceBaseDescriptorSupplier
      implements io.grpc.protobuf.ProtoMethodDescriptorSupplier {
    private final java.lang.String methodName;

    YjsCodecServiceMethodDescriptorSupplier(java.lang.String methodName) {
      this.methodName = methodName;
    }

    @java.lang.Override
    public com.google.protobuf.Descriptors.MethodDescriptor getMethodDescriptor() {
      return getServiceDescriptor().findMethodByName(methodName);
    }
  }

  private static volatile io.grpc.ServiceDescriptor serviceDescriptor;

  public static io.grpc.ServiceDescriptor getServiceDescriptor() {
    io.grpc.ServiceDescriptor result = serviceDescriptor;
    if (result == null) {
      synchronized (YjsCodecServiceGrpc.class) {
        result = serviceDescriptor;
        if (result == null) {
          serviceDescriptor = result = io.grpc.ServiceDescriptor.newBuilder(SERVICE_NAME)
              .setSchemaDescriptor(new YjsCodecServiceFileDescriptorSupplier())
              .addMethod(getMergeUpdatesMethod())
              .addMethod(getEncodeStateAsUpdateMethod())
              .addMethod(getEncodeStateVectorMethod())
              .build();
        }
      }
    }
    return result;
  }
}
