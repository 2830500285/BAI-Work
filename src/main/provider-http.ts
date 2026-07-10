type ProviderFetchInit = RequestInit & { signal?: AbortSignal }

export async function fetchProviderUrl(url: string, init: ProviderFetchInit): Promise<Response> {
  if (process.versions.electron) {
    const { net } = await import('electron')
    if (typeof net.fetch === 'function') {
      return net.fetch(url, init)
    }
  }
  return fetch(url, init)
}
