import type { Alert } from "@prisma/client";
import { ALERT_EVENTS } from "../constants";
import { emitToNearbyUsers } from "./to-users";

export function emitAlertTriggered(alert: Alert) {
  emitToNearbyUsers(
    alert.location_lat,
    alert.location_lon,
    ALERT_EVENTS.TRIGGERED,
    alert,
  );
}
