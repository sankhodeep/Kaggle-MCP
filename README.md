# Kaggle MCP Server

This MCP server enables AI agents to interact with Kaggle notebooks through the Model Context Protocol (MCP). It provides tools to list, download, update, and run Kaggle notebooks programmatically.

## What This Server Does

- **List Notebooks**: View all your Kaggle notebooks
- **Get Notebook**: Download a notebook's content
- **Update Notebook**: Upload modified notebooks
- **Run Notebook**: Execute notebooks on Kaggle

## How It Was Created

1. Initialized a TypeScript MCP server project
2. Implemented tools using Kaggle's CLI
3. Configured authentication with Kaggle API credentials
4. Built and deployed the server

## Setup Instructions

### Prerequisites
- Node.js (v16+ recommended)
- Kaggle CLI (`pip install kaggle`)
- Kaggle API credentials (username and key)

### Installation
1. Clone this repository:
   ```bash
   git clone https://github.com/sankhodeep/Kaggle-MCP.git
   cd Kaggle-MCP/mcp-server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the server:
   ```bash
   npm run build
   ```

### Configuration
1. Get your Kaggle API credentials from [Kaggle Account Settings](https://www.kaggle.com/account)
2. Create a `.env` file in the mcp-server directory:
   ```
   KAGGLE_USERNAME=your_username
   KAGGLE_KEY=your_api_key
   ```

## Running the Server

1. Start the server:
   ```bash
   npm start
   ```
2. The server will run on stdio and be available to MCP clients

## Using the Tools

Once running, you can use these MCP tools:

### List Notebooks
```json
{
  "server_name": "kaggle",
  "tool_name": "list_notebooks",
  "arguments": {}
}
```

### Get Notebook Content
```json
{
  "server_name": "kaggle",
  "tool_name": "get_notebook",
  "arguments": {
    "notebookRef": "username/notebook-slug"
  }
}
```

### Update Notebook
```json
{
  "server_name": "kaggle",
  "tool_name": "update_notebook",
  "arguments": {
    "notebookRef": "username/notebook-slug",
    "filePath": "/path/to/notebook.ipynb"
  }
}
```

### Run Notebook
```json
{
  "server_name": "kaggle",
  "tool_name": "run_notebook",
  "arguments": {
    "notebookRef": "username/notebook-slug"
  }
}
```

## Modifying the Server

1. Edit the TypeScript files in `src/`
2. Rebuild:
   ```bash
   npm run build
   ```
3. Restart the server

## Troubleshooting

- **Authentication Errors**: Verify your Kaggle credentials
- **CLI Errors**: Ensure Kaggle CLI is installed and configured
- **Build Errors**: Check TypeScript compiler output

## License

MIT License - Free to use and modify