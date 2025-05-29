# Gamely-Proxy 🖥️

![MIT License](https://img.shields.io/badge/license-MIT-green)
![Node.js](https://img.shields.io/badge/node-%3E=18.0.0-brightgreen)
![Express](https://img.shields.io/badge/express.js-5.x-blue)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue)

A secure, lightweight proxy server for the [RAWG API](https://rawg.io/apidocs), built with Node.js, Express, and TypeScript. Use this proxy to keep your RAWG API key safe and prevent exposure in client-side code.

> **Note:** This proxy is designed for use with [Gamely](https://github.com/Coookei/Gamely).  
> **Why use it?** It keeps your RAWG API key secure by handling all API requests server-side, preventing exposure in client-side code.

---

## Table of Contents 📑

- [Setup](#setup-%EF%B8%8F)
- [Deployment](#deployment-)
- [Endpoints](#endpoints-)
- [Usage](#connecting-your-gamely-frontend-)
- [Security](#security-)
- [Contributing](#contributing-)
- [License](#license-)

## Setup 🛠️

### 1. Clone the Repository

```bash
git clone https://github.com/Coookei/Gamely-Proxy.git
cd Gamely-Proxy
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory with the following content:

```env
API_URL=https://api.rawg.io/api/
API_KEY=your_rawg_api_key_here
WHITELISTED_ORIGINS=https://your-gamely-url.com/,http://localhost:5173/
UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token
MAX_EXTERNAL_CALLS=1000
```

- **API_URL**: The base URL for the RAWG API.
- **API_KEY**: Your personal RAWG API key. [Get one here](https://rawg.io/apidocs).
- **WHITELISTED_ORIGINS**: Comma-separated list of allowed frontend origins (e.g., your local or deployed Gamely app URLs).
- **UPSTASH_REDIS_REST_URL**: Your Upstash Redis REST URL (required for caching and rate limiting). [Get one here](https://upstash.com/pricing/redis).
- **UPSTASH_REDIS_REST_TOKEN**: Your Upstash Redis REST token.
- **MAX_EXTERNAL_CALLS**: Maximum number of RAWG API calls allowed per 24 hours (default: 1000).

> ⚠️ **Never commit your `.env` file or API key to version control.**

### 4. Start the Proxy Server

```bash
npm run dev
```

Or for production:

```bash
npm run build
npm start
```

## Deployment 🚀

You can deploy Gamely-Proxy in two main ways:

- **Standalone Node.js App:**  
  Host on your own server, or use hosting platforms. Just make sure to set your environment variables on your hosting platform.

- **Vercel (Serverless):**  
  This project includes a `vercel.json` file for easy deployment to [Vercel](https://vercel.com/).
  1. Push your code to a GitHub/GitLab/Bitbucket repo.
  2. Import the repo into Vercel.
  3. Set your environment variables (`API_KEY`, etc.) in the Vercel dashboard.
  4. Deploy!

## Endpoints ▹

_All endpoints required for Gamely_

- `GET /api/games`  
  List games. Supports query params: `genres`, `parent_platforms`, `ordering`, `search`, `page`.

- `GET /api/games/:slug`  
  Get details for a specific game by slug.

- `GET /api/games/:gameId/screenshots`  
  Get screenshots for a specific game by numeric ID.

- `GET /api/games/:gameId/movies`  
  Get movies for a specific game by numeric ID.

- `GET /api/genres`  
  List all genres.

- `GET /api/platforms/lists/parents`  
  List parent platforms.

- `GET /health`  
  Health check endpoint.

## Connecting Your Gamely Frontend 🎮

To use the proxy with your Gamely frontend app, update your frontend configuration to point to the proxy server's URL.

For detailed setup instructions, see the [Gamely frontend setup guide](https://github.com/Coookei/Gamely?tab=readme-ov-file#setup-%EF%B8%8F).

This ensures all RAWG API requests from your frontend are securely routed through the proxy.

## Security 🔒

Never expose your RAWG API key in client-side code.  
This proxy ensures your key stays on the server.

- Only the proxy knows your API key.
- Supports CORS for safe cross-origin requests.
- Rate limiting and global call budget enforced via Upstash Redis.

## Contributing 🤝

Contributions, suggestions, and feedback are welcome!  
Feel free to fork the repo and submit a pull request.

1. Fork the project
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add new feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## License 📜

This project is licensed under the MIT License.
