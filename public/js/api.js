// Finura Frontend API Integration Layer
const API = {
    // API endpoints are relative since the server serves both frontend and backend
    baseUrl: '',

    // Token management: prefer session storage to reduce persistence risk.
    getToken() {
        return sessionStorage.getItem('finura_token') || localStorage.getItem('finura_token');
    },

    setToken(token) {
        sessionStorage.setItem('finura_token', token);
        localStorage.removeItem('finura_token');
    },

    clearToken() {
        sessionStorage.removeItem('finura_token');
        localStorage.removeItem('finura_token');
    },

    // Base request helper
    async request(path, method = 'GET', data = null) {
        const url = `${this.baseUrl}${path}`;
        const headers = {
            'Content-Type': 'application/json'
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            method,
            headers
        };

        if (data && method !== 'GET') {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, config);
            
            // Handle HTTP errors
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API Error on ${method} ${path}:`, error);
            throw error;
        }
    },

    // Authentication
    async login(username, password) {
        const response = await this.request('/api/login', 'POST', { username, password });
        if (response.token) {
            this.setToken(response.token);
            localStorage.setItem('finura_user', JSON.stringify(response.user));
        }
        return response;
    },

    async register(username, email, password, fullName) {
        return await this.request('/api/register', 'POST', { username, email, password, fullName });
    },

    async logout() {
        try {
            if (typeof this.request === 'function') {
                await this.request('/api/auth/logout', 'POST').catch(() => null);
            }
        } catch (e) {
            console.warn('Logout request failed, cleaning local session anyway', e);
        } finally {
            this.clearToken();
            sessionStorage.removeItem('finura_user');
            localStorage.removeItem('finura_user');
        }
    },

    // User Data
    async getUserInfo() {
        return await this.request('/api/user', 'GET');
    },

    // Transactions
    async addTransaction(type, category, amount, description) {
        return await this.request('/api/transaction', 'POST', {
            type,
            category,
            amount: parseFloat(amount),
            description
        });
    },

    // Static collections (fetched via static server or API)
    async getFAQ() {
        try {
            // Since db.json is served statically by our server.ps1, we can download it directly!
            const db = await this.request('/db.json');
            return db.faq;
        } catch (e) {
            console.warn("Could not fetch FAQ from db.json, using fallback", e);
            return [
                { id: "f1", question: "What is Finura?", answer: "Finura is a digital banking platform." }
            ];
        }
    },

    async getBlog() {
        try {
            const db = await this.request('/db.json');
            return db.blog;
        } catch (e) {
            console.warn("Could not fetch blog from db.json, using fallback", e);
            return [];
        }
    }
};
