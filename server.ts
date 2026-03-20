import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();

app.use(express.json());
app.use((_, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  next();
});

const port = Number(process.env.FRUITFY_PROXY_PORT || 8787);
const apiBaseUrl = process.env.FRUITFY_API_BASE_URL || "https://api.fruitfy.io";
const apiToken = process.env.FRUITFY_API_TOKEN;
const storeId = process.env.FRUITFY_STORE_ID;

function getAuthHeaders() {
  if (!apiToken || !storeId) {
    return null;
  }

  return {
    Authorization: `Bearer ${apiToken}`,
    "Store-Id": storeId,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

app.get("/health", (_req, res) => {
  res.json({ success: true, message: "Fruitfy proxy online" });
});

app.post("/api/pix/charge", async (req, res) => {
  const headers = getAuthHeaders();

  if (!headers) {
    res.status(500).json({
      success: false,
      message:
        "Credenciais da Fruitfy ausentes. Configure FRUITFY_API_TOKEN e FRUITFY_STORE_ID no .env.",
    });
    return;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/pix/charge`, {
      method: "POST",
      headers,
      body: JSON.stringify(req.body),
    });

    const body = await response.json().catch(() => ({}));
    res.status(response.status).json(body);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Falha ao comunicar com a Fruitfy.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.get("/api/order/:order", async (req, res) => {
  const headers = getAuthHeaders();

  if (!headers) {
    res.status(500).json({
      success: false,
      message:
        "Credenciais da Fruitfy ausentes. Configure FRUITFY_API_TOKEN e FRUITFY_STORE_ID no .env.",
    });
    return;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/order/${req.params.order}`, {
      method: "GET",
      headers,
    });

    const body = await response.json().catch(() => ({}));
    res.status(response.status).json(body);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Falha ao consultar pedido na Fruitfy.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.listen(port, () => {
  console.log(`Fruitfy proxy rodando em http://localhost:${port}`);
});
