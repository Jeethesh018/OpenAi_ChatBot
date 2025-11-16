import { createContext } from "react";

export interface User {
  name: string;
  age: number;
  city: string;
}

export const UserContext = createContext<User | null>(null);
