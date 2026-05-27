"""MCP server for SAP S/4HANA via OData API."""

import json
import os
from typing import Any
from urllib.parse import urljoin, urlencode

import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

SAP_BASE_URL = os.environ.get("SAP_BASE_URL", "")
SAP_USER = os.environ.get("SAP_USER", "")
SAP_PASSWORD = os.environ.get("SAP_PASSWORD", "")
SAP_CLIENT = os.environ.get("SAP_CLIENT", "100")


def get_client() -> httpx.Client:
    return httpx.Client(
        auth=(SAP_USER, SAP_PASSWORD),
        headers={
            "Accept": "application/json",
            "sap-client": SAP_CLIENT,
        },
        verify=os.environ.get("SAP_SSL_VERIFY", "true").lower() != "false",
        timeout=30,
    )


def fetch_csrf_token(client: httpx.Client, service_url: str) -> str:
    resp = client.get(service_url, headers={"x-csrf-token": "Fetch"})
    resp.raise_for_status()
    return resp.headers.get("x-csrf-token", "")


app = Server("sap-s4hana")


@app.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="sap_odata_query",
            description=(
                "Query an SAP S/4HANA OData entity set. "
                "Returns a list of records matching optional filters."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "service": {
                        "type": "string",
                        "description": "OData service path, e.g. /sap/opu/odata/sap/API_BUSINESS_PARTNER",
                    },
                    "entity_set": {
                        "type": "string",
                        "description": "Entity set name, e.g. A_BusinessPartner",
                    },
                    "filter": {
                        "type": "string",
                        "description": "$filter expression, e.g. BusinessPartnerCategory eq '1'",
                    },
                    "select": {
                        "type": "string",
                        "description": "$select fields, comma-separated",
                    },
                    "top": {
                        "type": "integer",
                        "description": "Maximum number of records to return (default 20)",
                        "default": 20,
                    },
                    "skip": {
                        "type": "integer",
                        "description": "Number of records to skip",
                        "default": 0,
                    },
                    "orderby": {
                        "type": "string",
                        "description": "$orderby expression",
                    },
                    "expand": {
                        "type": "string",
                        "description": "$expand navigation properties, comma-separated",
                    },
                },
                "required": ["service", "entity_set"],
            },
        ),
        Tool(
            name="sap_odata_get",
            description="Read a single SAP S/4HANA entity by its key.",
            inputSchema={
                "type": "object",
                "properties": {
                    "service": {
                        "type": "string",
                        "description": "OData service path",
                    },
                    "entity_set": {
                        "type": "string",
                        "description": "Entity set name",
                    },
                    "key": {
                        "type": "string",
                        "description": "Entity key, e.g. 'BP0001' or \"BusinessPartner='BP0001'\"",
                    },
                    "select": {
                        "type": "string",
                        "description": "$select fields",
                    },
                    "expand": {
                        "type": "string",
                        "description": "$expand navigation properties",
                    },
                },
                "required": ["service", "entity_set", "key"],
            },
        ),
        Tool(
            name="sap_odata_create",
            description="Create a new entity in SAP S/4HANA via OData POST.",
            inputSchema={
                "type": "object",
                "properties": {
                    "service": {"type": "string"},
                    "entity_set": {"type": "string"},
                    "payload": {
                        "type": "object",
                        "description": "Entity data as key-value pairs",
                    },
                },
                "required": ["service", "entity_set", "payload"],
            },
        ),
        Tool(
            name="sap_odata_update",
            description="Update an existing SAP S/4HANA entity via OData PATCH.",
            inputSchema={
                "type": "object",
                "properties": {
                    "service": {"type": "string"},
                    "entity_set": {"type": "string"},
                    "key": {"type": "string"},
                    "payload": {
                        "type": "object",
                        "description": "Fields to update",
                    },
                },
                "required": ["service", "entity_set", "key", "payload"],
            },
        ),
        Tool(
            name="sap_odata_delete",
            description="Delete an SAP S/4HANA entity via OData DELETE.",
            inputSchema={
                "type": "object",
                "properties": {
                    "service": {"type": "string"},
                    "entity_set": {"type": "string"},
                    "key": {"type": "string"},
                },
                "required": ["service", "entity_set", "key"],
            },
        ),
        Tool(
            name="sap_odata_function",
            description="Call an OData function import or action in SAP S/4HANA.",
            inputSchema={
                "type": "object",
                "properties": {
                    "service": {"type": "string"},
                    "function_name": {
                        "type": "string",
                        "description": "Function import name",
                    },
                    "parameters": {
                        "type": "object",
                        "description": "Function parameters",
                    },
                    "method": {
                        "type": "string",
                        "enum": ["GET", "POST"],
                        "description": "HTTP method (GET for functions, POST for actions)",
                        "default": "POST",
                    },
                },
                "required": ["service", "function_name"],
            },
        ),
        Tool(
            name="sap_odata_metadata",
            description="Fetch the $metadata document for an SAP OData service to discover entity sets and properties.",
            inputSchema={
                "type": "object",
                "properties": {
                    "service": {"type": "string"},
                },
                "required": ["service"],
            },
        ),
    ]


def _build_url(service: str, path: str, params: dict[str, Any] | None = None) -> str:
    base = SAP_BASE_URL.rstrip("/")
    service = service.strip("/")
    path = path.lstrip("/")
    url = f"{base}/{service}/{path}"
    if params:
        # Remove None values
        params = {k: v for k, v in params.items() if v is not None}
        if params:
            url += "?" + urlencode(params)
    return url


@app.call_tool()
async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
    try:
        with get_client() as client:
            result = await _dispatch(client, name, arguments)
        return [TextContent(type="text", text=json.dumps(result, ensure_ascii=False, indent=2))]
    except httpx.HTTPStatusError as e:
        error = {
            "error": f"HTTP {e.response.status_code}",
            "detail": e.response.text[:2000],
        }
        return [TextContent(type="text", text=json.dumps(error, ensure_ascii=False, indent=2))]
    except Exception as e:
        return [TextContent(type="text", text=json.dumps({"error": str(e)}))]


async def _dispatch(client: httpx.Client, name: str, args: dict[str, Any]) -> Any:
    if name == "sap_odata_query":
        params: dict[str, Any] = {
            "$format": "json",
            "$top": args.get("top", 20),
            "$skip": args.get("skip", 0),
        }
        for key in ("filter", "select", "orderby", "expand"):
            val = args.get(key)
            if val:
                params[f"${key}"] = val
        url = _build_url(args["service"], args["entity_set"], params)
        resp = client.get(url)
        resp.raise_for_status()
        data = resp.json()
        return data.get("d", {}).get("results", data.get("d", data))

    if name == "sap_odata_get":
        key = args["key"]
        if not (key.startswith("(") and key.endswith(")")):
            key = f"('{key}')"
        params = {"$format": "json"}
        for k in ("select", "expand"):
            if args.get(k):
                params[f"${k}"] = args[k]
        url = _build_url(args["service"], f"{args['entity_set']}{key}", params)
        resp = client.get(url)
        resp.raise_for_status()
        data = resp.json()
        return data.get("d", data)

    if name == "sap_odata_create":
        service_url = _build_url(args["service"], "")
        csrf = fetch_csrf_token(client, service_url)
        url = _build_url(args["service"], args["entity_set"], {"$format": "json"})
        resp = client.post(
            url,
            json=args["payload"],
            headers={"x-csrf-token": csrf, "Content-Type": "application/json"},
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("d", data)

    if name == "sap_odata_update":
        service_url = _build_url(args["service"], "")
        csrf = fetch_csrf_token(client, service_url)
        key = args["key"]
        if not (key.startswith("(") and key.endswith(")")):
            key = f"('{key}')"
        url = _build_url(args["service"], f"{args['entity_set']}{key}", {"$format": "json"})
        resp = client.patch(
            url,
            json=args["payload"],
            headers={"x-csrf-token": csrf, "Content-Type": "application/json"},
        )
        resp.raise_for_status()
        return {"status": "updated", "key": args["key"]}

    if name == "sap_odata_delete":
        service_url = _build_url(args["service"], "")
        csrf = fetch_csrf_token(client, service_url)
        key = args["key"]
        if not (key.startswith("(") and key.endswith(")")):
            key = f"('{key}')"
        url = _build_url(args["service"], f"{args['entity_set']}{key}")
        resp = client.delete(url, headers={"x-csrf-token": csrf})
        resp.raise_for_status()
        return {"status": "deleted", "key": args["key"]}

    if name == "sap_odata_function":
        service_url = _build_url(args["service"], "")
        method = args.get("method", "POST").upper()
        params_data = args.get("parameters", {})

        if method == "GET":
            url = _build_url(args["service"], args["function_name"], {**params_data, "$format": "json"})
            resp = client.get(url)
        else:
            csrf = fetch_csrf_token(client, service_url)
            url = _build_url(args["service"], args["function_name"], {"$format": "json"})
            resp = client.post(
                url,
                json=params_data,
                headers={"x-csrf-token": csrf, "Content-Type": "application/json"},
            )
        resp.raise_for_status()
        try:
            data = resp.json()
            return data.get("d", data)
        except Exception:
            return {"status": resp.status_code, "text": resp.text[:2000]}

    if name == "sap_odata_metadata":
        url = _build_url(args["service"], "$metadata")
        resp = client.get(url, headers={"Accept": "application/xml"})
        resp.raise_for_status()
        return {"metadata_xml": resp.text[:10000]}

    return {"error": f"Unknown tool: {name}"}


async def main() -> None:
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
