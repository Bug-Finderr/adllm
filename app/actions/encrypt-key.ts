"use server";

import { encrypt } from "@/lib/encryption";

export async function encryptApiKey(
  plaintext: string,
): Promise<{ encryptedKey: string; iv: string }> {
  if (!plaintext.trim()) throw new Error("Key cannot be empty");
  return encrypt(plaintext.trim());
}
