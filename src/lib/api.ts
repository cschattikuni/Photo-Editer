// API Service for backend communication
const API_URL = 'http://localhost:3000/api';

interface Project {
  id?: number;
  name: string;
  description?: string;
  originalImage: string;
  processedImage?: string;
  filters?: any;
}

// Check if backend is available
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('Backend not available:', error);
    return false;
  }
};

// ============ PROJECT API CALLS ============

export const getProjects = async (): Promise<Project[]> => {
  try {
    const response = await fetch(`${API_URL}/projects`);
    return response.json();
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
};

export const getProject = async (id: number): Promise<Project | null> => {
  try {
    const response = await fetch(`${API_URL}/projects/${id}`);
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error('Error fetching project:', error);
    return null;
  }
};

export const createProject = async (project: Project): Promise<Project | null> => {
  try {
    const response = await fetch(`${API_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(project),
    });
    return response.json();
  } catch (error) {
    console.error('Error creating project:', error);
    return null;
  }
};

export const updateProject = async (id: number, project: Partial<Project>): Promise<Project | null> => {
  try {
    const response = await fetch(`${API_URL}/projects/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(project),
    });
    return response.json();
  } catch (error) {
    console.error('Error updating project:', error);
    return null;
  }
};

export const deleteProject = async (id: number): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/projects/${id}`, {
      method: 'DELETE',
    });
    return response.ok;
  } catch (error) {
    console.error('Error deleting project:', error);
    return false;
  }
};

// ============ USER API CALLS ============

export const createUser = async (username: string, email: string) => {
  try {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email }),
    });
    return response.json();
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
};

export const getUserSettings = async (userId: number) => {
  try {
    const response = await fetch(`${API_URL}/users/${userId}/settings`);
    return response.json();
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return {};
  }
};

export const updateUserSettings = async (userId: number, settings: Record<string, any>) => {
  try {
    const response = await fetch(`${API_URL}/users/${userId}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    return response.json();
  } catch (error) {
    console.error('Error updating user settings:', error);
    return null;
  }
};
