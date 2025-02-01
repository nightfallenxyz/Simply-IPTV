const fetch = require('node-fetch');

module.exports = async (req, res) => {
    const url = req.query.url;
    
    console.log('Received request for URL:', url); // Debugging
    
    // Validate URL format
    if (!url || !isValidHttpUrl(url)) {
        console.error('Invalid URL:', url);
        return res.status(400).send('Invalid URL format');
    }

    try {
        const startTime = Date.now();
        const response = await fetch(url);
        console.log(`Fetch completed in ${Date.now() - startTime}ms. Status: ${response.status}`);
        
        if (!response.ok) {
            console.error('Upstream error:', response.status, response.statusText);
            return res.status(response.status).send(response.statusText);
        }

        // Handle binary content properly
        const contentType = response.headers.get('content-type') || 'text/plain';
        console.log('Content type detected:', contentType);

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', contentType);

        if (contentType.startsWith('text/')) {
            const text = await response.text();
            return res.send(text);
        }

        // Handle binary data for Vercel compatibility
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // For Vercel deployments, use this format for binary responses
        return res.send(buffer.toString('base64'));

    } catch (error) {
        console.error('Proxy error:', error);
        return res.status(500).send(`Proxy error: ${error.message}`);
    }
};

// Robust URL validation
function isValidHttpUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (err) {
        return false;
    }
}