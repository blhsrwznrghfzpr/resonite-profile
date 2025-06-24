const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/api/users', async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ error: 'Name parameter is required' });
    }

    const response = await fetch(
      `https://api.resonite.com/users/?name=${encodeURIComponent(name)}`
    );

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: `API returned ${response.status}` });
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

    const response = await fetch(
      `https://api.resonite.com/users/${encodeURIComponent(id)}`
    );

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: `API returned ${response.status}` });
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
    const response = await fetch(
      'https://api.resonite.com/sessions?minActiveUsers=1&includeEmptyHeadless=false'
    );

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: `API returned ${response.status}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Sessions API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/worlds', async (req, res) => {
  try {
    const response = await fetch(
      'https://api.resonite.com/records/pagedSearch',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      }
    );

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: `API returned ${response.status}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Worlds API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// アイコンURL変換関数
function convertIconUrl(iconUrl) {
  if (!iconUrl)
    return 'https://assets.resonite.com/9adc7bf85f005413174dbb26c1ef3f62b6ce9e1abbbaf5b504d490b872107373';

  if (iconUrl.startsWith('resdb:///')) {
    const filename = iconUrl.replace('resdb:///', '');
    const filenameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    return `https://assets.resonite.com/${filenameWithoutExt}`;
  }

  return iconUrl;
}

app.get('/user/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch user data for OGP
    const userResponse = await fetch(
      `https://api.resonite.com/users/${encodeURIComponent(id)}`
    );

    let ogpTags = '';
    if (userResponse.ok) {
      const userData = await userResponse.json();
      const username = userData.username || 'Unknown User';
      const avatarUrl = convertIconUrl(userData.profile?.iconUrl);

      ogpTags = `
    <meta property="og:title" content="${username} - Resonite Profile" />
    <meta property="og:description" content="${username}のResoniteプロフィール情報を表示しています。" />
    <meta property="og:image" content="${avatarUrl}" />
    <meta property="og:url" content="${req.protocol}://${req.get('host')}/user/${id}" />
    <meta property="og:type" content="profile" />
    <meta property="og:site_name" content="Resonite ユーザー検索" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${username} - Resonite Profile" />
    <meta name="twitter:description" content="${username}のResoniteプロフィール情報を表示しています。" />
    <meta name="twitter:image" content="${avatarUrl}" />
    <title>${username} - Resonite Profile</title>`;
    }

    // Read the HTML file and inject OGP tags
    const htmlPath = path.join(__dirname, 'public', 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    if (ogpTags) {
      html = html.replace('<title>Resonite ユーザー検索</title>', ogpTags);
    }

    res.send(html);
  } catch (error) {
    console.error('Error generating OGP for user page:', error);
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
