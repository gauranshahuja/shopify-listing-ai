import { apiJson } from './client.js'

export async function fetchUsers() {
  return apiJson('/api/admin/users')
}

export async function createUser({ email, fullName, role = 'user', password, createInFirebase = true }) {
  return apiJson('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, fullName, role, password, createInFirebase }),
  })
}

export async function updateUser(id, patch) {
  return apiJson(`/api/admin/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
}

export async function deleteUser(id) {
  return apiJson(`/api/admin/users/${id}`, { method: 'DELETE' })
}

