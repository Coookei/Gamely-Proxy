import { axiosInstance } from "./axios";

export async function fetchFromApi(path: string, filteredQuery: Record<string, any>) {
  return axiosInstance.get(path, { params: filteredQuery });
}
