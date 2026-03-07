const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[A-Za-z]+(?:[ .'-][A-Za-z]+)*$/;
const MIN_PASSWORD_LENGTH = 10;

function isBlank(value) {
  return !String(value ?? "").trim();
}

export function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizeName(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

export function isValidEmail(value) {
  return EMAIL_REGEX.test(normalizeEmail(value));
}

export function passwordClassCount(value) {
  const password = String(value ?? "");
  let count = 0;
  if (/[A-Z]/.test(password)) count += 1;
  if (/[a-z]/.test(password)) count += 1;
  if (/[0-9]/.test(password)) count += 1;
  if (/[^A-Za-z0-9]/.test(password)) count += 1;
  return count;
}

export function validateLogin({ email, password }) {
  const errors = {};

  if (isBlank(email)) {
    errors.email = "Email is required.";
  } else if (!isValidEmail(email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (isBlank(password)) {
    errors.password = "Password is required.";
  }

  return errors;
}

export function validateSignup({ full_name, email, password }) {
  const errors = {};
  const normalizedName = normalizeName(full_name);
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = String(password ?? "");

  if (!normalizedName) {
    errors.full_name = "Full name is required.";
  } else if (normalizedName.length < 2 || normalizedName.length > 100) {
    errors.full_name = "Full name must be between 2 and 100 characters.";
  } else if (!NAME_REGEX.test(normalizedName)) {
    errors.full_name = "Full name can only contain letters, spaces, apostrophes, periods, and hyphens.";
  }

  if (!normalizedEmail) {
    errors.email = "Email is required.";
  } else if (!isValidEmail(normalizedEmail)) {
    errors.email = "Please enter a valid email address.";
  }

  if (!normalizedPassword.trim()) {
    errors.password = "Password is required.";
  } else if (normalizedPassword.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  } else if (passwordClassCount(normalizedPassword) < 3) {
    errors.password =
      "Password must include at least 3 of: uppercase, lowercase, number, special character.";
  }

  return errors;
}

export const authValidationConfig = {
  minPasswordLength: MIN_PASSWORD_LENGTH,
};
