export interface UserPreferences {
  notifications: boolean;
  emailReports: boolean;
  language: string;
  timezone: string;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  notifications: true,
  emailReports: true,
  language: "pt-BR",
  timezone: "America/Sao_Paulo",
};
