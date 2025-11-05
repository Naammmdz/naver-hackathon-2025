package com.devflow.realtime.yjs;

public interface YjsCodec {

    YjsDocument newDocument();

    YjsDocument hydrate(byte[] snapshot, byte[] vector);

    void applyUpdate(YjsDocument document, byte[] update);

    byte[] encodeStateVector(YjsDocument document);

    byte[] encodeStateAsUpdate(YjsDocument document, byte[] clientVector);

    byte[] encodeSnapshot(YjsDocument document);
}
