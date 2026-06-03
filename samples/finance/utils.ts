import { randomBytes } from "node:crypto";
import { Transaction, SystemProgram, PublicKey } from "@solana/web3.js";

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export interface UnsignedTransactionDraft {
  rawTx: string;
  feePayer: string;
  recipient: string;
  programId: string;
  recentBlockhash: string;
}

/**
 * Helper to generate a realistic looking Base64 Solana Tx for the demo.
 */
export function generateRealisticRawTx() {
  return generateUnsignedTransactionDraft().rawTx;
}

export function generateUnsignedTransactionDraft(): UnsignedTransactionDraft {
  const feePayer = new PublicKey(randomSolanaAddress());
  const recipient = new PublicKey(randomSolanaAddress());
  const programId = SystemProgram.programId;
  const recentBlockhash = randomSolanaAddress();

  const tx = new Transaction();
  tx.feePayer = feePayer;
  tx.recentBlockhash = recentBlockhash;
  
  tx.add(SystemProgram.transfer({
    fromPubkey: feePayer,
    toPubkey: recipient,
    lamports: 1000
  }));

  return {
    rawTx: tx.serialize({ verifySignatures: false, requireAllSignatures: false }).toString("base64"),
    feePayer: feePayer.toBase58(),
    recipient: recipient.toBase58(),
    programId: programId.toBase58(),
    recentBlockhash,
  };
}

function randomKnownProgramId() {
  const programIds = [
    "11111111111111111111111111111111",
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
    "whirLbMiicVdio4qvUfM5KAg6CtUSQ2na7p2yU7La8",
  ];

  return programIds[Math.floor(Math.random() * programIds.length)];
}

export function randomSolanaAddress() {
  return encodeBase58(randomBytes(32));
}

function encodeBase58(bytes: Buffer) {
  let value = BigInt(`0x${bytes.toString("hex")}`);
  let encoded = "";

  while (value > 0n) {
    const remainder = Number(value % 58n);
    value = value / 58n;
    encoded = BASE58_ALPHABET[remainder] + encoded;
  }

  for (const byte of bytes) {
    if (byte !== 0) break;
    encoded = BASE58_ALPHABET[0] + encoded;
  }

  return encoded || BASE58_ALPHABET[0];
}

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const color = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  black: "\x1b[30m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
};

export function paint(text: string, ...styles: string[]) {
  return `${styles.join("")}${text}${color.reset}`;
}

export function line(char = "-", width = 72) {
  console.log(paint(char.repeat(width), color.dim));
}

export function section(title: string) {
  console.log("");
  line();
  console.log(paint(` ${title.toUpperCase()} `, color.bold, color.cyan));
  line();
}

export function label(name: string, value: string, valueColor = color.white) {
  const padded = `${name}:`.padEnd(18, " ");
  console.log(`${paint(padded, color.dim)}${paint(value, valueColor)}`);
}

export function badge(text: string, foreground: string, background: string) {
  return paint(` ${text} `, color.bold, foreground, background);
}

export function riskBar(score: number) {
  const normalized = Math.max(0, Math.min(100, Number(score) || 0));
  const total = 24;
  const filled = Math.round((normalized / 100) * total);
  const empty = total - filled;
  const barColor =
    normalized >= 80 ? color.red : normalized >= 45 ? color.yellow : color.green;

  return `${paint("[" + "#".repeat(filled), barColor)}${paint(
    ".".repeat(empty) + "]",
    color.dim,
  )} ${normalized}/100`;
}

export function wrapText(text: string, width = 72) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if ((current + " " + word).trim().length > width) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }

  if (current) lines.push(current);
  return lines;
}

export function printHeader() {
  console.clear();
  console.log(paint("=".repeat(72), color.cyan));
  console.log(
    paint("  FINANCE AGENT | PROTECTED TRADING TERMINAL", color.bold, color.cyan),
  );
  console.log(
    paint("  Gemini intent planner -> Bento Guard protection layer", color.dim),
  );
  console.log(paint("=".repeat(72), color.cyan));
}
