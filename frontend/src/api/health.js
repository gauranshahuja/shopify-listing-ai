import { apiJson } from './client.js'

export async function fetchHealth() {
  return apiJson('/api/health')
}

