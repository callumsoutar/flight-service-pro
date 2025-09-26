#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'child_process';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

class DuplicateDeskMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'duplicate-desk-pro',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.projectRoot = resolve(process.cwd());
    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'run_dev_server',
            description: 'Start the Next.js development server',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'run_build',
            description: 'Build the Next.js application',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'run_lint',
            description: 'Run ESLint on the project',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'list_components',
            description: 'List all React components in the project',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Directory to search (default: src/components)',
                  default: 'src/components',
                },
              },
            },
          },
          {
            name: 'read_file',
            description: 'Read the contents of a file',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Path to the file to read',
                },
              },
              required: ['path'],
            },
          },
          {
            name: 'list_api_routes',
            description: 'List all API routes in the project',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'run_dev_server':
            return await this.runCommand('npm', ['run', 'dev']);

          case 'run_build':
            return await this.runCommand('npm', ['run', 'build']);

          case 'run_lint':
            return await this.runCommand('npm', ['run', 'lint']);

          case 'list_components':
            return this.listComponents(args?.directory || 'src/components');

          case 'read_file':
            return this.readFile(args.path);

          case 'list_api_routes':
            return this.listApiRoutes();

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  async runCommand(command, args) {
    return new Promise((resolve) => {
      const child = spawn(command, args, {
        cwd: this.projectRoot,
        stdio: 'pipe',
      });

      let output = '';
      let error = '';

      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      child.stderr?.on('data', (data) => {
        error += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          content: [
            {
              type: 'text',
              text: `Command: ${command} ${args.join(' ')}\nExit code: ${code}\n\nOutput:\n${output}\n\nError:\n${error}`,
            },
          ],
        });
      });
    });
  }

  listComponents(directory) {
    try {
      const componentsDir = join(this.projectRoot, directory);
      const components = this.getFilesRecursively(componentsDir, ['.tsx', '.jsx', '.ts', '.js']);

      return {
        content: [
          {
            type: 'text',
            text: `Components in ${directory}:\n${components.map(c => `- ${c}`).join('\n')}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error listing components: ${error.message}`,
          },
        ],
      };
    }
  }

  readFile(path) {
    try {
      const fullPath = resolve(this.projectRoot, path);
      const content = readFileSync(fullPath, 'utf8');

      return {
        content: [
          {
            type: 'text',
            text: `File: ${path}\n\n${content}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error reading file: ${error.message}`,
          },
        ],
      };
    }
  }

  listApiRoutes() {
    try {
      const apiDir = join(this.projectRoot, 'src/app/api');
      const routes = this.getApiRoutes(apiDir);

      return {
        content: [
          {
            type: 'text',
            text: `API Routes:\n${routes.map(r => `- ${r}`).join('\n')}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error listing API routes: ${error.message}`,
          },
        ],
      };
    }
  }

  getFilesRecursively(dir, extensions) {
    const files = [];

    try {
      const items = readdirSync(dir);

      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          files.push(...this.getFilesRecursively(fullPath, extensions));
        } else if (extensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath.replace(this.projectRoot, '').replace(/^\//, ''));
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }

    return files;
  }

  getApiRoutes(dir, basePath = '') {
    const routes = [];

    try {
      const items = readdirSync(dir);

      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          const isDynamicRoute = item.startsWith('[') && item.endsWith(']');
          const routePath = isDynamicRoute ? `${basePath}/${item}` : `${basePath}/${item}`;
          routes.push(...this.getApiRoutes(fullPath, routePath));
        } else if (item === 'route.ts' || item === 'route.js') {
          routes.push(`/api${basePath}`);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }

    return routes;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Duplicate Desk Pro MCP server running on stdio');
  }
}

const server = new DuplicateDeskMCPServer();
server.run().catch(console.error);