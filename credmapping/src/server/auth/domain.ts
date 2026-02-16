type AppRole = "superadmin" | "admin" | "user";

const allowedDomains = ["vestasolutions.com", "vestatelemed.com"] as const;

export const isAllowedEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;

  const [, domain = ""] = email.toLowerCase().split("@");
  return allowedDomains.includes(domain as (typeof allowedDomains)[number]);
};

export const getAppRole = (params: {
  email: string | null | undefined;
}): AppRole => {
  if (params.email?.toLowerCase().endsWith("@vestasolutions.com")) {
    return "admin";
  }

  return "user";
};
