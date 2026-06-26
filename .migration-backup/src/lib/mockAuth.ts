const KEY = "englifly_mock_user";

export interface MockUser {
  uid: string;
  email: string;
  displayName: string;
}

export function mockSignIn(email: string, _password: string): MockUser {
  const user: MockUser = {
    uid: "demo_" + btoa(email).replace(/=/g, ""),
    email,
    displayName: email.split("@")[0],
  };
  localStorage.setItem(KEY, JSON.stringify(user));
  return user;
}

export function mockSignUp(email: string, _password: string): MockUser {
  return mockSignIn(email, _password);
}

export function mockSignOut() {
  localStorage.removeItem(KEY);
}

export function getMockUser(): MockUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MockUser) : null;
  } catch {
    return null;
  }
}
