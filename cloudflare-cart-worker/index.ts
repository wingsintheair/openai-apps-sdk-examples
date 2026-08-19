import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";

interface Env {
  ASSETS: Fetcher;
}

const WIDGET_URI = "ui://widget/rob-openai-cart.html";
const WIDGET_MIME = "text/html;profile=mcp-app";

function widgetMeta() {
  return {
    "openai/outputTemplate": WIDGET_URI,
    "openai/toolInvocation/invoking": "推来购物车…",
    "openai/toolInvocation/invoked": "购物车到啦",
    "openai/widgetAccessible": true,
  };
}

function createServer(env: Env) {
  const server = new McpServer({
    name: "rob-openai-cart",
    version: "1.0.0",
  });

  server.registerResource(
    "rob-openai-cart-widget",
    WIDGET_URI,
    {
      title: "Rob 的 OpenAI 公费购物车",
      description: "可在 ChatGPT 中直接交互的购物车小游戏界面。",
      mimeType: WIDGET_MIME,
      _meta: widgetMeta(),
    } as any,
    async (uri) => {
      const response = await env.ASSETS.fetch(
        new Request("https://assets.local/shopping-cart.html")
      );
      if (!response.ok) {
        throw new Error(`Widget asset missing: ${response.status}`);
      }
      const html = await response.text();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: WIDGET_MIME,
            text: html,
            _meta: widgetMeta(),
          } as any,
        ],
      };
    }
  );

  server.registerTool(
    "open_rob_cart",
    {
      title: "打开 Rob 的购物车",
      description: "Use this when the user wants to open, view, or play with Rob's OpenAI expense shopping cart game.",
      inputSchema: z.object({}),
      _meta: widgetMeta(),
    } as any,
    async () => ({
      content: [{ type: "text", text: "Rob 的 OpenAI 公费购物车已打开。" }],
      structuredContent: { items: [] },
      _meta: widgetMeta(),
    } as any)
  );

  server.registerTool(
    "add_to_rob_cart",
    {
      title: "给 Rob 的购物车加东西",
      description: "Use this when the user explicitly asks in chat to add named fictional items to Rob's shopping cart.",
      inputSchema: z.object({
        items: z.array(
          z.object({
            name: z.string(),
            quantity: z.number().int().min(1).default(1),
          })
        ),
      }),
      _meta: widgetMeta(),
    } as any,
    async ({ items }) => ({
      content: [
        {
          type: "text",
          text: `已往购物车里塞了 ${items.length} 种东西。`,
        },
      ],
      structuredContent: { items },
      _meta: widgetMeta(),
    } as any)
  );

  return server;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "/health") {
      return Response.json({
        ok: true,
        name: "Rob 的 OpenAI 公费购物车",
        mcp: "/mcp",
      });
    }

    if (url.pathname === "/mcp") {
      return createMcpHandler(() => createServer(env))(request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
