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
            // Check if the response is successful
            if (response.statusCode !== 200) {
                throw new Error(`Failed to fetch resource: ${response.statusMessage}`);
            }

            // Set appropriate headers for CORS
            res.setHeader('Access-Control-Allow-Origin', '*');

            // Determine the Content-Type based on the file extension or response headers
            const contentType = getContentType(url, response.headers['content-type']);
            res.setHeader('Content-Type', contentType);

            // Handle binary data (e.g., .ts files)
            if (contentType.includes('video/MP2T') || contentType.includes('application/octet-stream')) {
                const chunks = [];
                response.on('data', (chunk) => {
                    chunks.push(chunk);
                });
                response.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    res.send(buffer);
                });
            } else {
                // Handle text data (e.g., .m3u8 files)
                let data = '';
                response.on('data', (chunk) => {
                    data += chunk;
                });
                response.on('end', () => {
                    res.send(data);
                });
            }
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

// Helper function to determine the Content-Type
function getContentType(url, responseContentType) {
    if (responseContentType) {
        return responseContentType;
    }

    // Fallback: Determine Content-Type based on file extension
    if (url.endsWith('.m3u8')) {
        return 'application/vnd.apple.mpegurl'; // Correct MIME type for .m3u8
    } else if (url.endsWith('.ts')) {
        return 'video/MP2T'; // Correct MIME type for .ts
    } else {
        return 'text/plain'; // Default fallback
    }
}