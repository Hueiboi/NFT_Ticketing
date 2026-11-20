const BASE_URL = process.env.PUBLIC_URL || "";

export const EVENT_COVERS = [
  `${BASE_URL}/covers/cover-1.jpg`,
  `${BASE_URL}/covers/cover-2.jpg`,
  `${BASE_URL}/covers/cover-3.jpg`,
];

export function getEventCover(contractAddress, fallbackIndex = 0) {
  if (typeof contractAddress === "string" && contractAddress.length >= 4) {
    const parsed = parseInt(contractAddress.slice(-4), 16);
    if (!Number.isNaN(parsed)) {
      return EVENT_COVERS[parsed % EVENT_COVERS.length];
    }
  }
  return EVENT_COVERS[fallbackIndex % EVENT_COVERS.length];
}
