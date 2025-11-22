const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

async function fetchJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_URL}${endpoint}`;

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (!response.ok) {
        throw new ApiError(response.status, `API Error: ${response.statusText}`);
    }

    return response.json();
}

export const api = {
    get: <T>(endpoint: string) => fetchJson<T>(endpoint, { method: 'GET' }),

    post: <T>(endpoint: string, data: unknown) => fetchJson<T>(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    put: <T>(endpoint: string, data: unknown) => fetchJson<T>(endpoint, {
        method: 'PUT',
        body: JSON.stringify(data),
    }),

    delete: <T>(endpoint: string) => fetchJson<T>(endpoint, { method: 'DELETE' }),
};
