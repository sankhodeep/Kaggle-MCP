#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { execSync } from 'child_process';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';

const KAGGLE_USERNAME = process.env.KAGGLE_USERNAME;
const KAGGLE_KEY = process.env.KAGGLE_KEY;

if (!KAGGLE_USERNAME || !KAGGLE_KEY) {
  throw new Error('Kaggle credentials not provided in environment variables');
}

// Configure Kaggle CLI with provided credentials
execSync(`kaggle config set -n username -v ${KAGGLE_USERNAME}`);
execSync(`kaggle config set -n key -v ${KAGGLE_KEY}`);

class KaggleServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'kaggle-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_notebooks',
          description: 'List all Kaggle notebooks for the authenticated user',
          inputSchema: {
            type: 'object',
            properties: {
              page: { type: 'number', description: 'Page number' },
              pageSize: { type: 'number', description: 'Items per page' }
            }
          }
        },
        {
          name: 'get_notebook',
          description: 'Download a Kaggle notebook',
          inputSchema: {
            type: 'object',
            properties: {
              notebookRef: { 
                type: 'string', 
                description: 'Notebook reference (username/slug or full URL)' 
              }
            },
            required: ['notebookRef']
          }
        },
        {
          name: 'update_notebook',
          description: 'Update a Kaggle notebook',
          inputSchema: {
            type: 'object',
            properties: {
              notebookRef: { 
                type: 'string', 
                description: 'Notebook reference (username/slug)' 
              },
              filePath: {
                type: 'string',
                description: 'Path to local notebook file'
              }
            },
            required: ['notebookRef', 'filePath']
          }
        },
        {
          name: 'run_notebook',
          description: 'Run a Kaggle notebook',
          inputSchema: {
            type: 'object',
            properties: {
              notebookRef: { 
                type: 'string', 
                description: 'Notebook reference (username/slug)' 
              }
            },
            required: ['notebookRef']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'list_notebooks':
          return this.handleListNotebooks(request.params.arguments);
        case 'get_notebook':
          return this.handleGetNotebook(request.params.arguments);
        case 'update_notebook':
          return this.handleUpdateNotebook(request.params.arguments);
        case 'run_notebook':
          return this.handleRunNotebook(request.params.arguments);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  private async handleListNotebooks(args: any) {
    try {
      const result = execSync('kaggle kernels list --mine', {
        encoding: 'utf-8'
      });
      
      // Parse the plain text output into a structured format
      const lines = result.trim().split('\n');
      if (lines.length < 2) return { content: [{ type: 'text', text: '[]' }] };
      
      const headers = lines[0].split(/\s+/);
      const notebooks = lines.slice(1).map(line => {
        const values = line.split(/\s+/);
        return headers.reduce((obj, header, index) => {
          obj[header] = values[index] || '';
          return obj;
        }, {} as Record<string, string>);
      });
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(notebooks, null, 2)
        }]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list notebooks: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async handleGetNotebook(args: any) {
    const { notebookRef } = args;
    if (!notebookRef) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'notebookRef parameter is required'
      );
    }

    try {
      // Create temp directory
      const tempDir = `/tmp/kaggle-${Date.now()}`;
      execSync(`mkdir -p ${tempDir}`);
      
      // Download notebook
      execSync(`kaggle kernels pull -p ${tempDir} ${notebookRef}`);
      
      // Find the downloaded notebook file (could have different names)
      const files = readdirSync(tempDir);
      const notebookFile = files.find(file => file.endsWith('.ipynb'));
      
      if (!notebookFile) {
        throw new Error('No notebook file found in downloaded contents');
      }
      
      const notebookPath = path.join(tempDir, notebookFile);
      const notebookContent = readFileSync(notebookPath, 'utf-8');
      
      return {
        content: [{
          type: 'text',
          text: notebookContent
        }]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get notebook: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async handleUpdateNotebook(args: any) {
    const { notebookRef, filePath } = args;
    if (!notebookRef || !filePath) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Both notebookRef and filePath parameters are required'
      );
    }

    try {
      // Push the updated notebook
      execSync(`kaggle kernels push -p ${filePath}`);
      
      return {
        content: [{
          type: 'text',
          text: `Successfully updated notebook ${notebookRef}`
        }]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to update notebook: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async handleRunNotebook(args: any) {
    const { notebookRef } = args;
    if (!notebookRef) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'notebookRef parameter is required'
      );
    }

    try {
      // Run the notebook
      const result = execSync(`kaggle kernels run ${notebookRef}`, {
        encoding: 'utf-8'
      });
      
      return {
        content: [{
          type: 'text',
          text: result || `Notebook ${notebookRef} execution started successfully`
        }]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to run notebook: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private setupErrorHandlers() {
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Kaggle MCP server running on stdio');
  }
}

const server = new KaggleServer();
server.run().catch(console.error);