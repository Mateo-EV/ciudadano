import bcrypt from "bcryptjs";

export function hash(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function compare(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
