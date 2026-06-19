export type Role = "admin" | "developer" | "devops";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: Role;
}
