const API_BASE_URL = 'http://localhost:3001/api'

export interface Screenplay {
  id?: string
  title: string
  content: any[]
  title_page: {
    title: string
    author: string
    contact: string
    basedOn: string
  }
  created_at?: string
  updated_at?: string
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

export const screenplayService = {
  // Get all screenplays
  async getScreenplays(): Promise<Screenplay[]> {
    return apiRequest<Screenplay[]>('/screenplays')
  },

  // Get a specific screenplay
  async getScreenplay(id: string): Promise<Screenplay | null> {
    try {
      return await apiRequest<Screenplay>(`/screenplays/${id}`)
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null
      }
      throw error
    }
  },

  // Create a new screenplay
  async createScreenplay(screenplay: Omit<Screenplay, 'id' | 'created_at' | 'updated_at'>): Promise<Screenplay> {
    return apiRequest<Screenplay>('/screenplays', {
      method: 'POST',
      body: JSON.stringify(screenplay),
    })
  },

  // Update a screenplay
  async updateScreenplay(id: string, updates: Partial<Screenplay>): Promise<Screenplay> {
    return apiRequest<Screenplay>(`/screenplays/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  },

  // Delete a screenplay
  async deleteScreenplay(id: string): Promise<void> {
    return apiRequest<void>(`/screenplays/${id}`, {
      method: 'DELETE',
    })
  },

  // Save current screenplay (create or update based on title)
  async saveCurrentScreenplay(title: string, content: any[], titlePage: any): Promise<Screenplay> {
    try {
      // Try to update existing screenplay with this title
      const existing = await this.getScreenplay(title)
      if (existing) {
        return await this.updateScreenplay(title, {
          content,
          title_page: titlePage
        })
      }
    } catch (error) {
      // If not found, create new one
    }

    // Create new screenplay
    return await this.createScreenplay({
      title,
      content,
      title_page: titlePage
    })
  }
}
