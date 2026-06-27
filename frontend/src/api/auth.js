import { apiJson } from './client.js'

export async function fetchMe() {
  const data = await apiJson('/api/auth/me')

   if (!data || !data.user) {
    throw new Error('User exists in Firebase, but app profile was not found in backend.')
  }

  return data.user
}

