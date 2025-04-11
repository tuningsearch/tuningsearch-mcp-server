#!/usr/bin/env node
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// List of supported languages
const SUPPORTED_LANGUAGES = [
    'en',
    'zh',
    'zh-CN',
    'zh-TW',
    'fr',
    'de',
    'ja',
    'ko',
    'es',
] as const;

// Language name mapping
const LANGUAGE_LABELS: Record<string, string> = {
    'en': 'English',
    'zh': 'Chinese',
    'zh-CN': 'Chinese (Simplified)',
    'zh-TW': 'Chinese (Traditional)',
    'fr': 'French',
    'de': 'German',
    'ja': 'Japanese',
    'ko': 'Korean',
    'es': 'Spanish',
};

const API_BASE_URL = 'https://api.tuningsearch.com';

// API response interface
export interface ApiResponse<T> {
    status: string;
    data: T;
}

// Quota information interface
export interface QuotaInfo {
    quota: {
        userId: string;
        monthlyQuota: number;
        extraQuota: number;
        usedQuota: number;
        totalQuota: number;
        plan: string;
        expiresAt: string | null;
        createdAt: string;
        updatedAt: string;
    };
    plan: {
        name: string;
        price: number;
        features: {
            monthlyQueries: number;
            qps: number;
        };
    };
}

export interface SearchResult {
    query: string;
    results: Array<{
        title: string;
        url: string;
        content: string;
    }>;
    suggestions?: any[];
}

export async function search(
    query: string,
    apiKey: string,
    options?: {
        language?: string;
        page?: number;
        safe?: 0 | 1 | 2;
        time_range?: 'day' | 'week' | 'month' | 'year'
    }
): Promise<SearchResult> {

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };

    const params = new URLSearchParams();
    params.append('q', query);

    if (options) {
        if (options.language) params.append('language', options.language);
        if (options.page) params.append('page', options.page.toString());
        if (options.safe !== undefined) params.append('safe', options.safe ? '1' : '0');
        if (options.time_range) params.append('time_range', options.time_range);
    }

    const response = await fetch(`${API_BASE_URL}/v1/search?${params.toString()}`, {
        method: 'GET',
        headers,
    });

    if (!response.ok) {
        throw new Error(`Search request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as ApiResponse<SearchResult>;
    return data.data;
}

export async function getQuota(
    apiKey: string,
): Promise<QuotaInfo> {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };

    const response = await fetch(`${API_BASE_URL}/v1/me/quota`, {
        method: 'GET',
        headers,
    });

    if (!response.ok) {
        throw new Error(`Quota request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
}

// Create MCP server
const server = new McpServer({
  name: "tuningsearch-mcp-server",
  version: "0.1.4",
  description: "MCP server for Free Google Search API service"
}, {
  capabilities: {
    tools: {}, // Explicitly declare support for tools functionality
    resources: {}, // Declare support for resources functionality
    prompts: {} // Declare support for prompts functionality
  }
});

// Add search tool
server.tool(
  "search",
  {
    query: z.string().describe("Search query"),
    language: z.enum(SUPPORTED_LANGUAGES).optional()
      .describe(`Search language (supported: ${SUPPORTED_LANGUAGES.map(lang => `'${lang}' (${LANGUAGE_LABELS[lang]})`).join(', ')})`),
    page: z.number().optional().describe("Result page number"),
    safe: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional().describe("Safe search level: 0=Off, 1=Moderate, 2=Strict"),
    time_range: z.enum(["day", "week", "month", "year"]).optional().describe("Search time range")
  },
  async ({ query, language, page, safe, time_range }) => {
    // Get API key
    const apiKey = process.env.TUNINGSEARCH_API_KEY;

    if (!apiKey) {
      return {
        content: [
          {
            type: "text",
            text: "Error: TUNINGSEARCH_API_KEY environment variable is not set"
          }
        ],
        isError: true
      };
    }

    try {
      const result = await search(
        query, 
        apiKey as string, 
        {
          language,
          page,
          safe,
          time_range
        }
      );

      // Format results into more readable text
      const formattedResults = result.results.map(item => 
        `Title: ${item.title}\nContent: ${item.content}\nLink: ${item.url}`
      ).join('\n\n');

      return {
        content: [
          {
            type: "text",
            text: `Query: "${result.query}"\n\n${formattedResults}${
              result.suggestions && result.suggestions.length > 0 
                ? "\n\nSuggested queries: " + result.suggestions.join(", ") 
                : ""
            }`
          }
        ]
      };
    } catch (error) {
      console.error("Search error:", error);
      return {
        content: [
          {
            type: "text",
            text: `Search error: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

// Add quota tool
server.tool(
  "quota",
  {},
  async () => {
    // Get API key
    const apiKey = process.env.TUNINGSEARCH_API_KEY;

    if (!apiKey) {
      return {
        content: [
          {
            type: "text",
            text: "Error: TUNINGSEARCH_API_KEY environment variable is not set"
          }
        ],
        isError: true
      };
    }

    try {
      const quotaInfo = await getQuota(apiKey as string);
      
      // Format quota information
      return {
        content: [
          {
            type: "text",
            text: `TuningSearch Quota Information:
            
Plan: ${quotaInfo.plan.name}
Monthly Quota: ${quotaInfo.quota.monthlyQuota} queries
Used Quota: ${quotaInfo.quota.usedQuota} queries
Remaining Quota: ${quotaInfo.quota.totalQuota - quotaInfo.quota.usedQuota} queries
Quota Usage: ${Math.round((quotaInfo.quota.usedQuota / quotaInfo.quota.totalQuota) * 100)}%
QPS Limit: ${quotaInfo.plan.features.qps} queries per second

Last Updated: ${new Date(quotaInfo.quota.updatedAt).toLocaleString()}`
          }
        ]
      };
    } catch (error) {
      console.error("Quota check error:", error);
      return {
        content: [
          {
            type: "text",
            text: `Quota check error: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

// Add prompts to guide the large model on how to use the search tool
server.prompt(
  "search-web",
  "Use TuningSearch engine to query information",
  () => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `You are an assistant using the TuningSearch engine. When users ask questions requiring up-to-date information, you should use the search tool to obtain relevant information.

Usage:
1. First identify the user's language and specify the corresponding language parameter in the search
   Supported languages:
   ${SUPPORTED_LANGUAGES.map(lang => `   - '${lang}': ${LANGUAGE_LABELS[lang]}`).join('\n')}
2. Be aware that today's date is ${new Date().toISOString().split('T')[0]}, consider this when handling time-related queries
3. Identify parts of user queries that require real-time or online information
4. Use the search tool with the following parameters:
   - query: Search query keywords
   - language: Search language, should match the user's language
   - safe: (optional) Safe search level, 0=Off, 1=Moderate, 2=Strict
   - time_range: (optional) Time range, values can be 'day', 'week', 'month', 'year'
5. Analyze search results
6. Answer user questions based on search results, cite relevant information sources, and respond in the user's language

You can also check the current TuningSearch quota status using the quota tool.
When you need to know about TuningSearch API usage limits, such as:
- Monthly search query quota and remaining queries
- Queries per second (QPS) limitations
- Current usage statistics

Examples:
User (Chinese): "What is the recent economic growth situation in China?"
You should use: search tool with parameters query="China economic growth latest data", language="zh-CN", then answer in Chinese.

User (English): "What is the current situation of economic growth in China?"
You should use: search tool with parameters query="China economic growth latest data", language="en-US", then answer in English.

User: "Check the current API quota"
You should use: quota tool to get the current usage statistics.`
        }
      }
    ]
  })
);

// Add more detailed search results analysis prompt
server.prompt(
  "analyze-search-results",
  "Use TuningSearch engine to analyze specific topics",
  () => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `You are a professional research analyst. Your task is to use the search tool to gather information and provide in-depth analysis.

When users request analysis of a topic, please follow these steps:
1. Use the search tool to search for relevant keywords
2. Analyze the most relevant information from search results
3. Provide a comprehensive analysis including:
   - Key points and facts
   - Consensus and disagreements between different information sources
   - Potential biases or limitations
   - Evidence-based conclusions
   
Supported languages:
${SUPPORTED_LANGUAGES.map(lang => `- '${lang}': ${LANGUAGE_LABELS[lang]}`).join('\n')}

Please ensure to cite information sources and clearly distinguish between facts and opinions.`
        }
      }
    ]
  })
);

// Create stdio transport and connect server
export async function startServer() {
  console.error("Starting TuningSearch MCP server...");
  
  // Get API key
  const apiKey = process.env.TUNINGSEARCH_API_KEY;

  if (!apiKey) {
    console.error("Error: TUNINGSEARCH_API_KEY environment variable is not set");
    process.exit(1);
  }
  
  const transport = new StdioServerTransport();
  
  try {
    await server.connect(transport);
    console.error("Server connected and waiting for requests");
  } catch (error) {
    console.error("Server connection error:", error);
    process.exit(1);
  }
}

// Start server
startServer().catch(error => {
  console.error("Error starting server:", error);
  process.exit(1);
}); 