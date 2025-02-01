const https = require('https');

module.exports = async (req, res) => {
    const url = req.query.url;

    // Validate the URL
    if (!url || !isValidUrl(url)) {
        return res.status(400).send('Invalid URL');
    }

    try {
        // Fetch the resource from the provided URL
        https.get(url, (response) => {
            const chunks = [];

            // Check if the response is successful
            if (response.statusCode !== 200) {
                throw new Error(`Failed to fetch resource: ${response.statusMessage}`);
            }

            // Set appropriate headers for CORS
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');

            // Collect the data
            response.on('data', (chunk) => {
                chunks.push(chunk);
            });

            // Send the data back to the client
            response.on('end', () => {
                const buffer = Buffer.concat(chunks);
                res.send(buffer);
            });
        }).on('error', (error) => {
            throw new Error(`Proxy error: ${error.message}`);
        });
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