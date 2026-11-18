export type LoginCredentials = {
  email: string;
  password: string;
};

export type LoginResult = {
  email: string;
};

export type RequesterUser = {
  name: string;
  email: string;
};

const REQUESTER_USER_KEY = "requester-agni-user";

export type RegisterCredentials = {
  name: string;
  email: string;
  password: string;
};

export async function login(credentials: LoginCredentials): Promise<LoginResult> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const email = credentials.email.trim();
  const user = { name: email.split("@")[0], email };
  window.localStorage.setItem(REQUESTER_USER_KEY, JSON.stringify(user));
  return { email };
}

export async function register(credentials: RegisterCredentials): Promise<LoginResult> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { email: credentials.email };
}

export function getRequesterUser(): RequesterUser | null {
  const storedUser = window.localStorage.getItem(REQUESTER_USER_KEY);
  if (!storedUser) return null;

  try {
    const user = JSON.parse(storedUser) as RequesterUser;
    if (typeof user.name === "string" && typeof user.email === "string") return user;
  } catch {
    window.localStorage.removeItem(REQUESTER_USER_KEY);
  }

  return null;
}

export function clearRequesterUser(): void {
  window.localStorage.removeItem(REQUESTER_USER_KEY);
}