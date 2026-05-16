export type StaticUserRole = "MASTER" | "PROFESSIONAL";
export type StaticUserStatus = "PENDING" | "ACTIVE" | "DENIED";

export type StaticUser = {
  id: string;
  email: string;
  name?: string | null;
  role: StaticUserRole;
  status: StaticUserStatus;
  passwordHash: string;
  konsistMedicoNome?: string | null;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const isRole = (value: unknown): value is StaticUserRole =>
  value === "MASTER" || value === "PROFESSIONAL";

const isStatus = (value: unknown): value is StaticUserStatus =>
  value === "PENDING" || value === "ACTIVE" || value === "DENIED";

function asOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toStaticUser(raw: any, index: number): StaticUser | null {
  const email = typeof raw?.email === "string" ? normalizeEmail(raw.email) : "";
  const passwordHash =
    typeof raw?.passwordHash === "string"
      ? raw.passwordHash
      : typeof raw?.password === "string"
        ? raw.password
        : "";

  if (!email || !passwordHash) return null;

  return {
    id:
      typeof raw?.id === "string" && raw.id.trim()
        ? raw.id.trim()
        : `static-${index}-${email}`,
    email,
    name: asOptionalString(raw?.name),
    role: isRole(raw?.role) ? raw.role : "PROFESSIONAL",
    status: isStatus(raw?.status) ? raw.status : "ACTIVE",
    passwordHash,
    konsistMedicoNome: asOptionalString(raw?.konsistMedicoNome),
  };
}

function parseStaticUsersJson(): StaticUser[] {
  const raw = process.env.STATIC_USERS_JSON;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.error("STATIC_USERS_JSON precisa ser um array JSON.");
      return [];
    }

    return parsed
      .map((user, index) => toStaticUser(user, index))
      .filter((user): user is StaticUser => Boolean(user));
  } catch (error) {
    console.error("Erro ao ler STATIC_USERS_JSON.", error);
    return [];
  }
}

function getSingleStaticUser(): StaticUser[] {
  const email = process.env.STATIC_LOGIN_EMAIL;
  const passwordHash = process.env.STATIC_LOGIN_PASSWORD_HASH;

  if (!email || !passwordHash) return [];

  return [
    {
      id: process.env.STATIC_LOGIN_ID || `static-${normalizeEmail(email)}`,
      email: normalizeEmail(email),
      name: process.env.STATIC_LOGIN_NAME || null,
      role: isRole(process.env.STATIC_LOGIN_ROLE)
        ? process.env.STATIC_LOGIN_ROLE
        : "MASTER",
      status: isStatus(process.env.STATIC_LOGIN_STATUS)
        ? process.env.STATIC_LOGIN_STATUS
        : "ACTIVE",
      passwordHash,
      konsistMedicoNome: process.env.STATIC_LOGIN_KONSIST_MEDICO_NOME || null,
    },
  ];
}

export function getStaticUsers(): StaticUser[] {
  const byEmail = new Map<string, StaticUser>();

  for (const user of [...parseStaticUsersJson(), ...getSingleStaticUser()]) {
    byEmail.set(user.email, user);
  }

  return Array.from(byEmail.values());
}

export function findStaticUserByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  return getStaticUsers().find((user) => user.email === normalizedEmail) || null;
}
