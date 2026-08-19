import { apiRequest } from "./api";

export type GovernmentOffice = {
  officeId: number;
  officeCode: string;
  officeName: string;
  region?: string | null;
  city?: string | null;
  subCity?: string | null;
  woreda?: string | null;
  address?: string | null;
  status?: "ACTIVE" | "INACTIVE";
};

export type CreateGovernmentOfficeRequest = {
  officeCode: string;
  officeName: string;
  region: string;
  city: string;
  subCity: string;
  woreda: string;
  address: string;
};

type OfficeListResponse = {
  success: boolean;
  data: GovernmentOffice[];
};

type OfficeCreateResponse = {
  success: boolean;
  message: string;
  data: GovernmentOffice;
};

export async function getGovernmentOffices(): Promise<
  GovernmentOffice[]
> {
  const response =
    await apiRequest<OfficeListResponse>(
      "/government-offices"
    );

  return response.data;
}

export async function createGovernmentOffice(
  office: CreateGovernmentOfficeRequest
): Promise<GovernmentOffice> {
  const response =
    await apiRequest<OfficeCreateResponse>(
      "/government-offices",
      {
        method: "POST",
        body: JSON.stringify({
          officeCode: office.officeCode.trim(),
          officeName: office.officeName.trim(),
          region: office.region.trim(),
          city: office.city.trim(),
          subCity: office.subCity.trim(),
          woreda: office.woreda.trim(),
          address: office.address.trim(),
        }),
      }
    );

  return response.data;
}