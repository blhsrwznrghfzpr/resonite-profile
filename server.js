const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.static('.'));

app.get('/api/users', async (req, res) => {
    try {
        const { name } = req.query;
        if (!name) {
            return res.status(400).json({ error: 'Name parameter is required' });
        }

        const response = await fetch(`https://api.resonite.com/users/?name=${encodeURIComponent(name)}`);
        
        if (!response.ok) {
            return res.status(response.status).json({ error: `API returned ${response.status}` });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const response = await fetch(`https://api.resonite.com/users/${encodeURIComponent(id)}`);
        
        if (!response.ok) {
            return res.status(response.status).json({ error: `API returned ${response.status}` });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/sessions', async (req, res) => {
    try {
        const response = await fetch('https://api.resonite.com/sessions?minActiveUsers=1&includeEmptyHeadless=false');
        
        if (!response.ok) {
            return res.status(response.status).json({ error: `API returned ${response.status}` });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Sessions API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/user/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});