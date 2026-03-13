/**
 * Auth Service
 *
 * Abstrai a autenticação e registro de usuários.
 * Implementação atual: valida contra array em memória (authStore).
 * Migração para API: substituir por chamadas ao apiClient.
 */
import { useAuthStore, type User } from "@/store/authStore";

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

/**
 * Autentica um usuário pelo e-mail e senha.
 * Futuramente: POST /api/auth/login
 */
export async function login(email: string, password: string): Promise<AuthResult> {
  const { users, login: storeLogin } = useAuthStore.getState();

  const user = users.find(u => u.email === email);
  const passwordMatches = !user?.password || user.password === password;

  if (user && passwordMatches) {
    storeLogin(user);
    return { success: true, user };
  }

  return { success: false, error: "Credenciais inválidas. E-mail ou senha incorretos." };
}

/**
 * Registra um novo usuário.
 * Futuramente: POST /api/auth/register
 */
export async function register(
  name: string,
  email: string,
  password: string
): Promise<AuthResult> {
  const { users, registerUser, login: storeLogin } = useAuthStore.getState();

  if (users.some(u => u.email === email)) {
    return { success: false, error: "Este e-mail já está em uso." };
  }

  const newUser: User = {
    id: Date.now().toString(),
    name,
    email,
    role: "user",
    password,
  };

  registerUser(newUser);
  storeLogin(newUser);

  return { success: true, user: newUser };
}

/**
 * Faz logout do usuário.
 * Futuramente: POST /api/auth/logout
 */
export async function logout(): Promise<void> {
  useAuthStore.getState().logout();
}
