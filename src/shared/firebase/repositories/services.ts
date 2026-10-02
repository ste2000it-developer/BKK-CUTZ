import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { sortServicesByOrder } from "../../domain/services";
import { db } from "../client";

export type ServiceRecord = {
  id: string;
  groupId: string;
  name: string;
  type: string;
  active?: boolean;
  sortOrder?: number;
  serviceCode?: string;
  price?: number;
  choices?: number[];
  discountPercent?: number;
  targetServiceCode?: string;
  [field: string]: unknown;
};

export type ServiceWriteData = {
  groupId: string;
  name: string;
  type: string;
  active: boolean;
  sortOrder: number;
  serviceCode?: string;
  price?: number;
  choices?: number[];
  discountPercent?: number;
  targetServiceCode?: string;
};

export async function listServicesByGroup(
  groupId: string,
): Promise<ServiceRecord[]> {
  const servicesQuery = query(
    collection(db, "services"),
    where("groupId", "==", groupId),
  );
  const snapshot = await getDocs(servicesQuery);
  const services = snapshot.docs.map((serviceSnapshot) => ({
    id: serviceSnapshot.id,
    ...serviceSnapshot.data(),
  })) as ServiceRecord[];

  return sortServicesByOrder(services);
}

export async function saveService(
  serviceId: string | null,
  data: ServiceWriteData,
): Promise<void> {
  const serviceData = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  if (serviceId) {
    await setDoc(doc(db, "services", serviceId), serviceData);
    return;
  }

  await addDoc(collection(db, "services"), {
    ...serviceData,
    createdAt: serverTimestamp(),
  });
}

export async function removeService(serviceId: string): Promise<void> {
  await deleteDoc(doc(db, "services", serviceId));
}