export const NICKNAME_PATTERN = /^[A-Za-z0-9_-]{3,24}$/;
export const PASSWORD_MIN_LENGTH = 10;
// Верхняя граница защищает от DoS через очень длинные пароли при хешировании.
export const PASSWORD_MAX_LENGTH = 256;

export type ValidationResult = { ok: true; value: string } | { ok: false; error: string };

export function validateNickname(raw: unknown): ValidationResult {
  if (typeof raw !== "string") return { ok: false, error: "Введите никнейм" };
  const value = raw.trim();
  if (!NICKNAME_PATTERN.test(value)) {
    return { ok: false, error: "Никнейм: 3–24 символа, латиница, цифры, «_» и «-»" };
  }
  return { ok: true, value };
}

export function validatePassword(raw: unknown): ValidationResult {
  if (typeof raw !== "string") return { ok: false, error: "Введите пароль" };
  if (raw.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, error: `Пароль: минимум ${PASSWORD_MIN_LENGTH} символов` };
  }
  if (raw.length > PASSWORD_MAX_LENGTH) {
    return { ok: false, error: "Пароль слишком длинный" };
  }
  return { ok: true, value: raw };
}

export function normalizeNickname(nickname: string): string {
  return nickname.toLowerCase();
}
