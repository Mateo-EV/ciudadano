import { INCIDENT_EVENTS } from "@/features/events/constants";
import type { Incident } from "@prisma/client";
import { emitToNearbyUsers } from "./to-users";

export function emitIncidentReported(incident: Incident) {
  emitToNearbyUsers(
    incident.location_lat,
    incident.location_lon,
    INCIDENT_EVENTS.REPORTED,
    incident,
  );
}
