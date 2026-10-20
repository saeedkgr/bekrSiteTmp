// Reads the generated route index (see tools/import.mjs) from the bundled server assets.
export async function routeIndex() {
  return (await useStorage('assets:site').getItem<Record<string, { id: string, type: string }>>('index.json'))!
}
