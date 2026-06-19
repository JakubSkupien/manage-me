import { User } from "../models/User";

/**
 * Lista wszystkich użytkowników aplikacji.
 * W przyszłości zastąpić danymi pobieranymi z API (np. GET /users).
 */
export const users: User[] = [
  {
    id: "user-1",
    firstName: "Jan",
    lastName: "Kowalski",
    role: "admin",
  },
  {
    id: "user-2",
    firstName: "Anna",
    lastName: "Nowak",
    role: "developer",
  },
  {
    id: "user-3",
    firstName: "Piotr",
    lastName: "Wiśniewski",
    role: "devops",
  },
];

/**
 * Aktualnie zalogowany użytkownik (admin).
 * W przyszłości zastąpić danymi z sesji / tokenu JWT.
 */
export const currentUser: User = users[0];
