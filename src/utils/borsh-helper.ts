import * as borsh from "@coral-xyz/borsh";

export interface ActionPayload {
  prompt: string;
  tx: Uint8Array;
}

const LAYOUT = borsh.struct<{ prompt: string; tx: Buffer }>([
  borsh.str("prompt"),
  borsh.vecU8("tx"),
]);

export const encodeActionPayload = (input: ActionPayload): Uint8Array => {
  const tx = Buffer.from(input.tx);
  const buf = Buffer.alloc(
    4 + Buffer.byteLength(input.prompt, "utf8") + 4 + tx.length,
  );
  const written = LAYOUT.encode({ prompt: input.prompt, tx }, buf);
  return new Uint8Array(buf.slice(0, written));
};

export const decodeActionPayload = (bytes: Uint8Array): ActionPayload => {
  const decoded = LAYOUT.decode(Buffer.from(bytes));
  return { prompt: decoded.prompt, tx: new Uint8Array(decoded.tx) };
};
