const https = require('https');
const { URL } = require('url');

module.exports = async (req, res) => {
    const url = req.query.url;

    // Validate the URL
    if (!url || !isValidUrl(url)) {
        return res.status(400).send('Invalid URL');
    }

    try {
        // Fetch the resource from the provided URL with redirect handling
        const finalUrl = await followRedirects(url);
        console.log('Final URL after redirects:', finalUrl); // Log the final URL

        https.get(finalUrl, (response) => {
            // Check if the response is successful
            if (response.statusCode !== 200) {
                throw new Error(`Failed to fetch resource: ${response.statusMessage}`);
            }

            // Set appropriate headers for CORS
            res.setHeader('Access-Control-Allow-Origin', '*');

            // Determine the Content-Type based on the file extension or response headers
            const contentType = getContentType(finalUrl, response.headers['content-type']);
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
                    // Resolve relative URLs in .m3u8 playlists
                    if (contentType.includes('application/vnd.apple.mpegurl')) {
                        const baseUrl = new URL(finalUrl);
                        data = data.split('\n').map(line => {
                            if (line.trim() && !line.startsWith('#')) {
                                return new URL(line, baseUrl).href;
                            }
                            return line;
                        }).join('\n');
                    }
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

// Helper function to follow redirects
function followRedirects(url, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        let currentUrl = url;
        let redirectCount = 0;

        const fetchWithRedirects = (url) => {
            https.get(url, (response) => {
                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    redirectCount++;
                    if (redirectCount > maxRedirects) {
                        reject(new Error(`Too many redirects (max: ${maxRedirects})`));
                        return;
                    }

                    // Resolve the redirect location relative to the current URL
                    const baseUrl = new URL(currentUrl);
                    const redirectUrl = new URL(response.headers.location, baseUrl).href;
                    console.log(`Redirecting to: ${redirectUrl}`); // Log the redirect URL
                    currentUrl = redirectUrl;
                    fetchWithRedirects(redirectUrl);
                } else if (response.statusCode === 200) {
                    resolve(currentUrl);
                } else {
                    reject(new Error(`Failed to fetch resource: ${response.statusMessage}`));
                }
            }).on('error', (error) => {
                reject(error);
            });
        };

        fetchWithRedirects(currentUrl);
    });
}