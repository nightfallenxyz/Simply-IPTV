const fetch = require('node-fetch');

module.exports = async (req, res) => {
    const url = req.query.url;

    // Validate the URL
    if (!url || !isValidUrl(url)) {
        return res.status(400).send('Invalid URL');
    }

    try {
        // Fetch the resource from the provided URL
        const response = await fetch(url);

        // Check if the response is successful
        if (!response.ok) {
            throw new Error(`Failed to fetch resource: ${response.statusText}`);
        }

        // Set appropriate headers for CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', response.headers.get('content-type') || 'text/plain');

        // Handle binary data (e.g., video segments)
        if (response.headers.get('content-type')?.includes('video') || 
            response.headers.get('content-type')?.includes('application/octet-stream')) {
            const buffer = await response.buffer();
            return res.send(buffer);
        }

        // Handle text data (e.g., M3U playlists)
        const data = await response.text();
        res.send(data);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).send(error.message);
    }
};

// Helper function to validate URLs
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch (err) {
        return false;
    }
}