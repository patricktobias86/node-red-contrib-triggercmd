const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const _cache = new Map();

async function listCommandsViaConfig(RED, configId) {
  const cfg = RED.nodes.getNode(configId);
  if (!cfg || !cfg.getHeaders) throw new Error("Invalid TRIGGERcmd config");
  const baseUrl = cfg.baseUrl || "https://www.triggercmd.com";

  const res = await fetch(`${baseUrl}/api/command/list`, {
    method: "POST",
    headers: cfg.getHeaders(),
    body: JSON.stringify({})
  });
  if (!res.ok) throw new Error(`List failed: ${res.status}`);
  return res.json();
}

module.exports = function (RED) {
  function getClient(node, configId) {
    const cfg = RED.nodes.getNode(configId);
    if (!cfg || !cfg.getHeaders) {
      node.status({ fill: "red", shape: "ring", text: "no credentials" });
      throw new Error("TRIGGERcmd config not set");
    }
    return cfg;
  }

  function TriggerNode(n) {
    RED.nodes.createNode(this, n);
    const node = this;
    node.configId = n.config;
    node.computer = n.computer;
    node.trigger = n.trigger;
    node.params  = n.params;
    node.paramsType = n.paramsType || "msg";

    node.on("input", async (msg, send, done) => {
      try {
        const cfg = getClient(node, node.configId);
        const baseUrl = cfg.baseUrl || "https://www.triggercmd.com";
        // Resolve params via typed input if configured; fallback preserves old behavior
        let resolvedParams;
        if (node.paramsType) {
          try {
            const evalType = node.paramsType === 're' ? 'str' : node.paramsType;
            resolvedParams = await RED.util.evaluateNodeProperty(node.params, evalType, node, msg);
          } catch (e) {
            // if evaluation fails, surface error below
            throw e;
          }
        } else {
          resolvedParams = (msg.params !== undefined) ? msg.params : node.params;
        }

        const body = {
          computer: msg.computer || node.computer,
          trigger:  msg.trigger  || node.trigger,
          params:   resolvedParams
        };
        if (!body.computer || !body.trigger) throw new Error("computer & trigger required");
        node.status({ fill: "blue", shape: "dot", text: "triggering..." });

        const res = await fetch(`${baseUrl}/api/run/trigger`, {
          method: "POST", headers: cfg.getHeaders(), body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        msg.payload = { ok: res.ok, status: res.status, data };
        send(msg);
        node.status({ fill: res.ok ? "green" : "red", shape: "dot", text: res.ok ? "ok" : `err ${res.status}` });
        done();
      } catch (err) {
        node.status({ fill: "red", shape: "ring", text: err.message });
        done(err);
      }
    });
  }
  RED.nodes.registerType("triggercmd out", TriggerNode);

  // Removed the separate 'triggercmd list' node. Listing is integrated into the
  // 'triggercmd out' editor via the admin endpoint below.

  RED.httpAdmin.get("/triggercmd/:configId/commandList", async function (req, res) {
    const { configId } = req.params;
    const now = Date.now();
    const entry = _cache.get(configId);
    if (entry && now - entry.ts < 60_000) {
      return res.json(entry.data);
    }

    try {
      const raw = await listCommandsViaConfig(RED, configId);
      const items = Array.isArray(raw?.commands) ? raw.commands
                   : Array.isArray(raw?.data)     ? raw.data
                   : Array.isArray(raw)           ? raw
                   : [];
      const computers = [];
      const seen = new Set();
      const triggersByComputer = {};

      for (const it of items) {
        const comp = it.computer || it.computerName || it.Computer || "";
        const trig = it.trigger  || it.name || it.Trigger || "";
        if (comp && !seen.has(comp)) {
          seen.add(comp);
          computers.push(comp);
          triggersByComputer[comp] = [];
        }
        if (comp && trig) {
          (triggersByComputer[comp] = triggersByComputer[comp] || []).push(trig);
        }
      }

      const data = { computers, triggersByComputer };
      _cache.set(configId, { ts: now, data });
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  // Test connection endpoint used by config dialog (guarded for test harness)
  if (RED.httpAdmin && typeof RED.httpAdmin.post === "function") {
    RED.httpAdmin.post("/triggercmd/test", async function (req, res) {
      try {
        const baseUrl = (req.body && req.body.baseUrl) || "https://www.triggercmd.com";
        const token = req.body && req.body.token;
        if (!token) return res.status(400).json({ error: "missing token" });

        const url = `${baseUrl}/api/command/list`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({})
        });
        const data = await response.json().catch(() => ({}));
        const count = Array.isArray(data?.commands) ? data.commands.length
                   : Array.isArray(data?.data)     ? data.data.length
                   : Array.isArray(data)           ? data.length
                   : 0;
        return res.status(response.ok ? 200 : response.status).json({ ok: response.ok, status: response.status, sample: count });
      } catch (e) {
        return res.status(500).json({ ok: false, error: String(e.message || e) });
      }
    });
  }
};
