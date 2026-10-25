// Values verified against data/database-seed.json (all seed users share the password "s3cret").

export const API_URL = "http://localhost:3001";

export const HEATH_STORAGE_STATE = "playwright/.auth/heath93.json";

export type SeedUser = {
  id: string;
  username: string;
  password: string;
  fullName: string;
};

export const users = {
  // Main sender used in HU-TRANSACCION-001
  heath: { id: "uBmeaz5pX", username: "Heath93", password: "s3cret", fullName: "Ted Parisian" },
  // Recipient used in HU-TRANSACCION-001 (a contact of Heath93 in the seed)
  kristian: {
    id: "GjWovtg2hr",
    username: "Arvilla_Hegmann",
    password: "s3cret",
    fullName: "Kristian Bradtke",
  },
} satisfies Record<string, SeedUser>;
