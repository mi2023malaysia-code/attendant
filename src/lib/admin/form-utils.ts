export function readText(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  return typeof value === 'string' ? value.trim() : '';
}

export function readOptionalText(formData: FormData, fieldName: string) {
  const value = readText(formData, fieldName);
  return value.length > 0 ? value : null;
}

export function readBoolean(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === 'on' || normalized === 'true' || normalized === '1';
}

export function readOptionalNumber(formData: FormData, fieldName: string) {
  const value = readOptionalText(formData, fieldName);

  if (value === null) {
    return null;
  }

  return Number(value);
}

export function readOptionalDateTime(formData: FormData, fieldName: string) {
  return readOptionalText(formData, fieldName);
}

export function readId(formData: FormData, fieldName: string) {
  return readOptionalText(formData, fieldName);
}

export function fieldErrorsFromMessages(messages: string[]) {
  return messages.length > 0
    ? { _form: messages }
    : {};
}
