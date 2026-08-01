export type FieldErrors = Record<string, string[]>;

export type MutationState = {
  message: string | null;
  fieldErrors: FieldErrors;
};

export const initialMutationState: MutationState = {
  message: null,
  fieldErrors: {},
};

export function getFirstFieldError(
  state: MutationState,
  fieldName: string,
) {
  return state.fieldErrors[fieldName]?.[0] ?? null;
}
