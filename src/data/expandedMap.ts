import classicMap from './map.json'

const coastRows: number[][][] = [
  [[0, 20], [23, 39], [57, 59]],
  [[0, 19], [23, 39], [57, 59]],
  [[0, 18], [24, 38], [56, 59]],
  [[0, 17], [24, 38], [55, 59]],
  [[0, 15], [24, 37], [55, 59]],
  [[0, 12], [24, 37], [54, 59]],
  [[0, 9], [25, 37], [54, 59]],
  [[0, 5], [25, 36], [53, 59]],
  [[25, 36], [53, 59]],
  [[25, 36], [54, 59]],
  [[18, 18], [25, 36], [46, 47], [55, 59]],
  [[17, 18], [25, 36], [45, 47], [55, 59]],
  [[16, 18], [25, 36], [45, 46], [55, 59]],
  [[15, 18], [26, 36], [44, 46], [54, 59]],
  [[14, 18], [26, 36], [44, 45], [54, 59]],
  [[14, 18], [27, 35], [44, 44], [54, 59]],
  [[14, 18], [27, 35], [53, 59]],
  [[14, 18], [27, 34], [53, 59]],
  [[14, 18], [28, 34], [52, 59]],
  [[14, 19], [28, 33], [52, 59]],
  [[14, 19], [28, 32], [52, 59]],
  [[14, 18], [25, 26], [30, 31], [51, 59]],
  [[14, 18], [24, 27], [30, 31], [51, 59]],
  [[14, 18], [24, 27], [30, 30], [51, 59]],
  [[14, 18], [21, 21], [24, 27], [50, 59]],
  [[14, 17], [20, 21], [24, 27], [34, 34], [49, 59]],
  [[14, 17], [20, 21], [25, 27], [49, 59]],
  [[14, 17], [25, 26], [48, 59]],
  [[13, 18], [22, 23], [39, 43], [46, 59]],
  [[11, 28], [32, 59]],
]

const portPositions: Record<number, [number, number]> = {
  2: [28, 25], 3: [28, 22], 4: [24, 21], 5: [20, 20],
  6: [19, 22], 7: [23, 24], 8: [27, 19],
}
export const expandedHarbors = [
  { id: 9, name: 'Oslo', position: { x: 20, y: 1 }, isCapital: false, description: 'Norwegian port at the head of the Oslofjord' },
  { id: 10, name: 'Larvik', position: { x: 18, y: 3 }, isCapital: false, description: 'Norwegian timber and provisioning port' },
  { id: 11, name: 'Kristiansand', position: { x: 10, y: 6 }, isCapital: false, description: 'Norwegian shelter on the Skagerrak' },
  { id: 12, name: 'G\u00f6teborg', position: { x: 24, y: 9 }, isCapital: false, description: 'Swedish gateway to the North Sea' },
  { id: 13, name: 'Karlskrona', position: { x: 32, y: 21 }, isCapital: false, description: 'Swedish naval port on the Baltic' },
  { id: 14, name: 'Stockholm', position: { x: 39, y: 2 }, isCapital: false, description: 'Swedish trading port on the eastern coast' },
  { id: 15, name: 'Visby', position: { x: 43, y: 13 }, isCapital: false, description: 'Gotland island port in the Baltic' },
  { id: 16, name: 'Tallinn', position: { x: 54, y: 4 }, isCapital: false, description: 'Northern Baltic trading port' },
  { id: 17, name: 'Riga', position: { x: 52, y: 17 }, isCapital: false, description: 'Eastern Baltic grain and timber port' },
  { id: 18, name: 'Klaip\u0117da', position: { x: 50, y: 23 }, isCapital: false, description: 'Eastern Baltic provisioning port' },
  { id: 19, name: 'Gda\u0144sk', position: { x: 41, y: 27 }, isCapital: false, description: 'Southern Baltic grain trading port' },
]
const harborLocations = [...classicMap.harborLocations.map(port => ({
  ...port, x: portPositions[port.harborId][0], y: portPositions[port.harborId][1],
})), ...expandedHarbors.map(port => ({ ...port.position, harborId: port.id, name: port.name }))]

export const expandedMap = {
  ...classicMap,
  title: 'Expanded Seas',
  description: 'Stylized North Sea, Skagerrak, Kattegat and western Baltic chart',
  dimensions: { width: 60, height: 30 },
  landTiles: coastRows.flatMap((spans, row) => spans.flatMap(([start, end]) =>
    Array.from({ length: end - start + 1 }, (_, offset) => [start + offset, row]))),
  harborLocations,
  harborTiles: harborLocations.map(port => [port.x, port.y]),
  startPosition: { x: 22, y: 20 },
}