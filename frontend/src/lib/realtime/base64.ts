const toBinaryString = (data: Uint8Array) => {
  let binary = "";
  data.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return binary;
};

const fromBinaryString = (binary: string) => {
  const output = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    output[i] = binary.charCodeAt(i);
  }
  return output;
};

export const encodeToBase64 = (data: Uint8Array): string => {
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    return window.btoa(toBinaryString(data));
  }

  if (typeof Buffer !== "undefined") {
    return Buffer.from(data).toString("base64");
  }

  return "";
};

export const fromBase64ToUint8Array = (value: string | null | undefined): Uint8Array | null => {
  if (!value) {
    return null;
  }

  if (typeof window !== "undefined" && typeof window.atob === "function") {
    const binary = window.atob(value);
    return fromBinaryString(binary);
  }

  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }

  return null;
};
