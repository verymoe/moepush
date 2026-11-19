import { Endpoint } from "@/lib/models/endpoints"

export interface EndpointGroup {
  id: string
  name: string
  status: "active" | "inactive"
  createdAt: Date
  updatedAt: Date
}

export interface EndpointGroupWithEndpoints extends EndpointGroup {
  endpointIds: string[]
  endpoints: Endpoint[]
}
