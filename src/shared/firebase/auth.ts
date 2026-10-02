import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import { auth } from "./client";

export async function login(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export function watchAuth(
  callback: Parameters<typeof onAuthStateChanged>[1],
  targetAuth: Auth = auth,
) {
  return onAuthStateChanged(targetAuth, callback);
}