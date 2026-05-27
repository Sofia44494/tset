# SAP S/4HANA MCP Server for Claude Code

MCP server connecting Claude Code to SAP S/4HANA via OData API.

## Quick Start

### 1. Install dependencies

```bash
pip install -r sap_mcp/requirements.txt
```

### 2. Configure connection

```bash
cp .env.example .env
# Edit .env with your SAP credentials
```

### 3. Set environment variables

```bash
export SAP_BASE_URL=https://your-sap-host:44300
export SAP_USER=your_username
export SAP_PASSWORD=your_password
export SAP_CLIENT=100
```

### 4. Start Claude Code

Claude Code will automatically start the MCP server (configured in `.claude/settings.json`).

---

## Available Tools

| Tool | Description |
|------|-------------|
| `sap_odata_query` | Query an entity set with filters, sorting, pagination |
| `sap_odata_get` | Read a single entity by key |
| `sap_odata_create` | Create a new entity (POST) |
| `sap_odata_update` | Update an entity (PATCH) |
| `sap_odata_delete` | Delete an entity |
| `sap_odata_function` | Call an OData function import / action |
| `sap_odata_metadata` | Fetch $metadata to discover the service schema |

---

## Example Prompts

```
Покажи первые 10 бизнес-партнёров из SAP
→ sap_odata_query(service="/sap/opu/odata/sap/API_BUSINESS_PARTNER", entity_set="A_BusinessPartner", top=10)

Найди заказы на продажу клиента 'CUST001'
→ sap_odata_query(service="/sap/opu/odata/sap/API_SALES_ORDER_SRV", entity_set="A_SalesOrder",
                  filter="SoldToParty eq 'CUST001'")

Создай нового поставщика
→ sap_odata_create(service="...", entity_set="A_BusinessPartner", payload={...})
```

---

## Popular SAP OData Services

| Service path | Description |
|---|---|
| `/sap/opu/odata/sap/API_BUSINESS_PARTNER` | Business Partners |
| `/sap/opu/odata/sap/API_SALES_ORDER_SRV` | Sales Orders |
| `/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV` | Purchase Orders |
| `/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV` | Material Stock |
| `/sap/opu/odata/sap/API_FINANCIALPLANDATA_SRV` | Financial Plan Data |

Full list: [SAP API Business Hub](https://api.sap.com/products/SAPS4HANACloud/apis/all)
