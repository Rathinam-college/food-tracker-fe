const API_URL = '/food_tracker/api/auth/';

const authService = {
    login: async (username, password) => {
        const res = await fetch(`${API_URL}login/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw err;
        }
        const data = await res.json();
        if (data.token) {
            localStorage.setItem('ft_token', data.token);
            localStorage.setItem('ft_user', JSON.stringify(data.user));
        }
        return data;
    },

    logout: async () => {
        const token = localStorage.getItem('ft_token');
        if (token) {
            try {
                await fetch(`${API_URL}logout/`, {
                    method: 'POST',
                    headers: { Authorization: `Token ${token}` },
                });
            } catch (err) {
                console.error('Logout failed', err);
            }
        }
        localStorage.removeItem('ft_token');
        localStorage.removeItem('ft_user');
    },

    getCurrentUser: async () => {
        const token = localStorage.getItem('ft_token');
        if (!token) return null;
        try {
            const res = await fetch(`${API_URL}user/`, {
                headers: { Authorization: `Token ${token}` },
            });
            if (!res.ok) throw new Error('Not authenticated');
            const data = await res.json();
            localStorage.setItem('ft_user', JSON.stringify(data));
            return data;
        } catch (err) {
            localStorage.removeItem('ft_token');
            localStorage.removeItem('ft_user');
            return null;
        }
    },

    getToken: () => localStorage.getItem('ft_token'),
    getUser: () => JSON.parse(localStorage.getItem('ft_user')),
};

export default authService;
