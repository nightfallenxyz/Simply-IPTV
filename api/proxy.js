const fetch = require('node-fetch');

module.exports = async (req, res) => {
    console.log('Proxy request received'); // Log the request

    const url = req.query.url;
    console.log('Requested URL:', url); // Log the URL

    if (!url || !isValidUrl(url)) {
        console.error('Invalid URL:', url); // Log invalid URL
        return res.status(400).send('Invalid URL');
    }

    try {
        console.log('Fetching resource from URL:', url); // Log before fetch
        const response = await fetch(url);

        if (!response.ok) {
            console.error('Fetch failed:', response.status, response.statusText); // Log fetch failure
            throw new Error(`Failed to fetch resource: ${response.statusText}`);
        }

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', response.headers.get('content-type') || 'text/plain');

        // Handle binary data (e.g., video segments)
        if (response.headers.get('content-type')?.includes('video') || 
            response.headers.get('content-type')?.includes('application/octet-stream')) {
            console.log('Handling binary data'); // Log binary data handling
            const buffer = await response.buffer();
            return res.send(buffer);
        }

        // Handle text data (e.g., M3U playlists)
        console.log('Handling text data'); // Log text data handling
        const data = await response.text();
        res.send(data);
    } catch (error) {
        console.error('Proxy error:', error); // Log the error
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