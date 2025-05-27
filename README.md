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
```

- **API_URL**: The base URL for the RAWG API.
- **API_KEY**: Your personal RAWG API key. [Get one here](https://rawg.io/apidocs).
- **WHITELISTED_ORIGINS**: Comma-separated list of allowed frontend origins (e.g., your local or deployed Gamely app URLs).

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

## Connecting Your Gamely Frontend 🚀

To use the proxy with your Gamely frontend app, update your frontend configuration to point to the proxy server's URL.

For detailed setup instructions, see the [Gamely frontend setup guide](https://github.com/Coookei/Gamely?tab=readme-ov-file#setup-%EF%B8%8F).

This ensures all RAWG API requests from your frontend are securely routed through the proxy.

## Security 🔒

Never expose your RAWG API key in client-side code.  
This proxy ensures your key stays on the server.

- Only the proxy knows your API key.
- Supports CORS for safe cross-origin requests.

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
