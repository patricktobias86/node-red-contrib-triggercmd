# node-red-contrib-triggercmd

Node-RED nodes for TRIGGERcmd.

- Trigger commands on your computers via TRIGGERcmd
- List available computers and triggers for autocomplete in the trigger node editor

## Install

- From Node-RED Palette: Manage Palette → Install → search `node-red-contrib-triggercmd`.
- Or in your Node-RED user dir (usually `~/.node-red`):

  ```bash
  npm install node-red-contrib-triggercmd
  ```

Restart Node-RED after installation.

## Configure

Add a TRIGGERcmd Account config node (type `triggercmd-config`):

- Name: optional label to identify this account.
- Base URL: keep default `https://www.triggercmd.com` or point to your self-hosted/alternate service if applicable.
- Token: paste your TRIGGERcmd API token. You can generate/find this in your TRIGGERcmd account. The nodes use a `Bearer <token>` header to authenticate.
- Test connection: click the button to verify the Base URL and Token work (it calls the list API and reports success and a sample count).

## Nodes

### TRIGGERcmd out (`triggercmd out`)

Sends a trigger to TRIGGERcmd.

- Fields:
  - Account: required `triggercmd-config`.
  - Computer: name of the target computer.
  - Trigger: trigger name on that computer.
  - Params: select source and value via typed input. Supports `msg`, `flow`, `global`, `str`, `num`, `bool`, `re`, `jsonata`, `env`.
    - If you choose `re`, the editor validates the regex pattern and highlights errors. At runtime it is treated as a string value.
- Overrides via message:
  - `msg.computer` overrides Computer
  - `msg.trigger` overrides Trigger
  - If Params is set to `msg` with property `params` (default), it will use `msg.params`. You can choose `flow`, `global`, `env`, or a `JSONata` expression instead.
- Output:
  - `msg.payload = { ok, status, data }` where `data` is the JSON from TRIGGERcmd.
- Status:
  - Shows “triggering…”, then green on success or red with the HTTP status on failure.

Autocomplete: The edit dialog fetches your computers and triggers for suggestions. Use the small “refresh” link to re-fetch. Suggestions are cached briefly.

Note: The node editor fetches your computers and triggers to power autocomplete. There is no separate “list” node.

## Example flow

Import this flow into Node-RED, set your Account token in the config node, and deploy.

```json
[
  {
    "id": "cfg1",
    "type": "triggercmd-config",
    "name": "TRIGGERcmd",
    "baseUrl": "https://www.triggercmd.com",
    "credentials": { "token": "REPLACE_WITH_YOUR_TOKEN" }
  },
  {
    "id": "inj1",
    "type": "inject",
    "name": "Run trigger",
    "props": [
      { "p": "computer", "v": "MyComputer", "vt": "str" },
      { "p": "trigger",  "v": "MyTrigger",  "vt": "str" },
      { "p": "params",   "v": "optional",   "vt": "str" }
    ],
    "repeat": "",
    "once": false,
    "wires": [["out1"]]
  },
  {
    "id": "out1",
    "type": "triggercmd out",
    "name": "TRIGGERcmd out",
    "config": "cfg1",
    "computer": "",
    "trigger": "",
    "params": "",
    "wires": [["dbg1"]]
  },
  {
    "id": "dbg1",
    "type": "debug",
    "name": "result",
    "active": true,
    "tosidebar": true,
    "complete": "payload",
    "wires": []
  }
]
```

## Troubleshooting

- Node status shows “no credentials”: set the token in the Account config node.
- Errors from API (e.g. 401/403): verify token validity and Base URL.
- Autocomplete empty: ensure the Account is selected and try “refresh”.

## License

MIT
