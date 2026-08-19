"""Rob's OpenAI expense cart MCP server."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List
from uuid import uuid4

import mcp.types as types
from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings
from pydantic import BaseModel, ConfigDict, Field, ValidationError

OPEN_CART_TOOL = "open_rob_cart"
ADD_TO_CART_TOOL = "add_to_cart"
WIDGET_TEMPLATE_URI = "ui://widget/rob-openai-cart.html"
WIDGET_TITLE = "Rob 的 OpenAI 公费购物车"
WIDGET_INVOKING = "正在推来购物车"
WIDGET_INVOKED = "购物车到啦"
MIME_TYPE = "text/html;profile=mcp-app"
ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets"


def _load_widget_html() -> str:
    html_path = ASSETS_DIR / "shopping-cart.html"
    if html_path.exists():
        return html_path.read_text(encoding="utf8")
    fallback = sorted(ASSETS_DIR.glob("shopping-cart-*.html"))
    if fallback:
        return fallback[-1].read_text(encoding="utf8")
    raise FileNotFoundError(
        f'Widget HTML for "shopping-cart" not found in {ASSETS_DIR}. '
        "Run `pnpm run build` to generate the assets before starting the server."
    )


SHOPPING_CART_HTML = _load_widget_html()


def _split_env_list(value: str | None) -> List[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def _transport_security_settings() -> TransportSecuritySettings:
    allowed_hosts = _split_env_list(os.getenv("MCP_ALLOWED_HOSTS"))
    allowed_origins = _split_env_list(os.getenv("MCP_ALLOWED_ORIGINS"))
    if not allowed_hosts and not allowed_origins:
        return TransportSecuritySettings(enable_dns_rebinding_protection=False)
    return TransportSecuritySettings(
        enable_dns_rebinding_protection=True,
        allowed_hosts=allowed_hosts,
        allowed_origins=allowed_origins,
    )


class CartItem(BaseModel):
    name: str = Field(..., description="Name of the playful fictional item.")
    quantity: int = Field(default=1, ge=1, description="Quantity to add.")
    model_config = ConfigDict(populate_by_name=True, extra="allow")


class AddToCartInput(BaseModel):
    items: List[CartItem] = Field(..., description="Items to add to the active cart.")
    cart_id: str | None = Field(default=None, alias="cartId")
    model_config = ConfigDict(populate_by_name=True, extra="forbid")


OPEN_INPUT_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {},
    "additionalProperties": False,
}
ADD_INPUT_SCHEMA = AddToCartInput.model_json_schema(by_alias=True)

carts: Dict[str, List[Dict[str, Any]]] = {}

mcp = FastMCP(
    name="rob-openai-cart",
    stateless_http=True,
    transport_security=_transport_security_settings(),
)


def _serialize_item(item: CartItem) -> Dict[str, Any]:
    return item.model_dump(by_alias=True)


def _get_or_create_cart(cart_id: str | None) -> str:
    if cart_id and cart_id in carts:
        return cart_id
    new_id = cart_id or uuid4().hex
    carts.setdefault(new_id, [])
    return new_id


def _widget_meta() -> Dict[str, Any]:
    return {
        "ui": {"resourceUri": WIDGET_TEMPLATE_URI},
        "openai/outputTemplate": WIDGET_TEMPLATE_URI,
        "openai/toolInvocation/invoking": WIDGET_INVOKING,
        "openai/toolInvocation/invoked": WIDGET_INVOKED,
        "openai/widgetAccessible": True,
    }


@mcp._mcp_server.list_tools()
async def _list_tools() -> List[types.Tool]:
    meta = _widget_meta()
    return [
        types.Tool(
            name=OPEN_CART_TOOL,
            title="打开 Rob 的公费购物车",
            description="Use this when the user wants to open or play with Rob's fictional OpenAI expense shopping cart.",
            inputSchema=OPEN_INPUT_SCHEMA,
            _meta=meta,
        ),
        types.Tool(
            name=ADD_TO_CART_TOOL,
            title="往 Rob 的购物车加东西",
            description="Use this when the user asks to add named playful fictional items to the active cart.",
            inputSchema=ADD_INPUT_SCHEMA,
            _meta=meta,
        ),
    ]


@mcp._mcp_server.list_resources()
async def _list_resources() -> List[types.Resource]:
    return [
        types.Resource(
            name=WIDGET_TITLE,
            title=WIDGET_TITLE,
            uri=WIDGET_TEMPLATE_URI,
            description="Interactive widget for Rob's fictional OpenAI expense cart game.",
            mimeType=MIME_TYPE,
            _meta=_widget_meta(),
        )
    ]


async def _handle_read_resource(req: types.ReadResourceRequest) -> types.ServerResult:
    if str(req.params.uri) != WIDGET_TEMPLATE_URI:
        return types.ServerResult(
            types.ReadResourceResult(contents=[], _meta={"error": f"Unknown resource: {req.params.uri}"})
        )
    contents = [
        types.TextResourceContents(
            uri=WIDGET_TEMPLATE_URI,
            mimeType=MIME_TYPE,
            text=SHOPPING_CART_HTML,
            _meta=_widget_meta(),
        )
    ]
    return types.ServerResult(types.ReadResourceResult(contents=contents))


def _cart_result(cart_id: str, items: List[Dict[str, Any]], message: str) -> types.ServerResult:
    meta = _widget_meta()
    meta["openai/widgetSessionId"] = cart_id
    return types.ServerResult(
        types.CallToolResult(
            content=[types.TextContent(type="text", text=message)],
            structuredContent={"cartId": cart_id, "items": items},
            _meta=meta,
        )
    )


async def _handle_call_tool(req: types.CallToolRequest) -> types.ServerResult:
    if req.params.name == OPEN_CART_TOOL:
        cart_id = _get_or_create_cart(None)
        return _cart_result(cart_id, [], "Rob 的公费购物车已打开。")

    if req.params.name == ADD_TO_CART_TOOL:
        try:
            payload = AddToCartInput.model_validate(req.params.arguments or {})
        except ValidationError as exc:
            return types.ServerResult(
                types.CallToolResult(
                    content=[types.TextContent(type="text", text=f"Invalid input: {exc.errors()}")],
                    isError=True,
                )
            )
        cart_id = _get_or_create_cart(payload.cart_id)
        items = [_serialize_item(item) for item in payload.items]
        return _cart_result(cart_id, items, f"往购物车塞了 {len(items)} 种东西。")

    return types.ServerResult(
        types.CallToolResult(
            content=[types.TextContent(type="text", text=f"Unknown tool: {req.params.name}")],
            isError=True,
        )
    )


mcp._mcp_server.request_handlers[types.CallToolRequest] = _handle_call_tool
mcp._mcp_server.request_handlers[types.ReadResourceRequest] = _handle_read_resource

app = mcp.streamable_http_app()

try:
    from starlette.middleware.cors import CORSMiddleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=False,
    )
except Exception:
    pass


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
