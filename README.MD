# TuningSearch MCP Server

A TuningSearch free google search server implemented based on Model Context Protocol, designed to provide TuningSearch API as a tool for large language models.

## Features

* **Web Search**: Supports general queries, real-time news, article search, with pagination and time-relevance controls
* **Flexible Filtering**: Control result types, safety levels, and content freshness
* **Multilingual Support**: Supports multiple languages including Chinese, English, Japanese, Korean, French, German, and Spanish

## Tools

* **search**
  * Execute TuningSearch search queries
  * Parameters:
    * `query` (required): Search query string
    * `language` (optional): Search language, e.g., 'zh-CN' or 'en-US'
    * `page` (optional): Result page number
    * `safe` (optional): Safety search level, 0=off, 1=moderate, 2=strict
    * `time_range` (optional): Search time range, values can be 'day', 'month', 'year'

* **quota**
  * Check current TuningSearch API quota usage and limits
  * No parameters required

## Configuration

### Getting an API Key

1. Register an account at [TuningSearch](https://tuningsearch.com)
2. Generate your API key

### Usage

#### Docker

```
{
  "mcpServers": {
    "tuningsearch": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "TUNINGSEARCH_API_KEY",
        "tuningsearch/mcp-server"
      ],
      "env": {
        "TUNINGSEARCH_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

#### NPX

```
{
  "mcpServers": {
    "tuningsearch": {
      "command": "npx",
      "args": [
        "-y",
        "tuningsearch-mcp-server@latest"
      ],
      "env": {
        "TUNINGSEARCH_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

#### Local Development

```bash
# Clone repository
git clone https://github.com/tuningsearch/tuningsearch-mcp-server.git
cd tuningsearch-mcp-server

# Install using npm
npm install

# Or using pnpm
pnpm install

# Create .env file and set API key
echo "TUNINGSEARCH_API_KEY=YOUR_API_KEY" > .env

# Build project
npm run build
# Or
pnpm run build

# Run server
npm start
# Or
pnpm start
```

## Build

Docker build:

```bash
docker build -t tuningsearch/mcp-server:latest .
```

## Troubleshooting

- Ensure the environment variable `TUNINGSEARCH_API_KEY` is properly set
- Check if the API key is valid
- Verify your network connection to ensure access to the TuningSearch API

## License

This project is open-source under the MIT License. This means you are free to use, modify, and distribute this software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
