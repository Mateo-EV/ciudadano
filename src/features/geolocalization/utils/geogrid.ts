export type UserLocation = {
  userId: string;
  latitude: number;
  longitude: number;
};

const CELL_SIZE = 0.01; // ~1.1 kilómetros

const geoGrid = new Map<string, Set<UserLocation>>();

function getGeoCell(lat: number, lon: number): string {
  const cellX = Math.floor(lon / CELL_SIZE);
  const cellY = Math.floor(lat / CELL_SIZE);
  return `${cellX}_${cellY}`;
}

export function addUserToGrid(user: UserLocation) {
  const cell = getGeoCell(user.latitude, user.longitude);
  if (!geoGrid.has(cell)) geoGrid.set(cell, new Set());
  geoGrid.get(cell)?.add(user);
}

export function removeUserFromGrid(user: UserLocation) {
  const cell = getGeoCell(user.latitude, user.longitude);
  geoGrid.get(cell)?.delete(user);
}

export function updateUserLocation(user: UserLocation) {
  removeUserFromGrid(user);
  addUserToGrid(user);
  console.log(geoGrid);
}

function getNeighborCells(lat: number, lon: number): string[] {
  const baseX = Math.floor(lon / CELL_SIZE);
  const baseY = Math.floor(lat / CELL_SIZE);

  const neighbors: string[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      neighbors.push(`${baseX + dx}_${baseY + dy}`);
    }
  }
  return neighbors;
}

export function findNearbyUsers(lat: number, lon: number): UserLocation[] {
  const nearby: UserLocation[] = [];
  const cells = getNeighborCells(lat, lon);
  const sameCell = getGeoCell(lat, lon);

  if (!cells.includes(sameCell)) {
    cells.push(sameCell);
  }

  console.log(cells);

  for (const cell of cells) {
    console.log(cell);
    const users = geoGrid.get(cell);
    if (users) {
      nearby.push(...users);
    }
  }
  console.log(nearby);

  return nearby;
}

export function clearGrid() {
  geoGrid.clear();
}
