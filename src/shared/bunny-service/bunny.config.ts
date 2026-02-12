// Bunny configuration from environment
export const bunnyConfig = {
  storageName: process.env.BUNNY_STORAGENAME || '',
  storageKey: process.env.BUNNY_STORAGEKEY || '',
  storageApi: process.env.BUNNY_STORAGEAPI || '',
  pullApi: process.env.BUNNY_PULLAPI || '',
  accessKey: process.env.BUNNY_ACCESSKEY || '',
}
