import { Hono } from "hono";
import { stringify } from "querystring";
import { cors } from "hono/cors"
import clients from "./clients";

const app = new Hono();

app.use(cors());

app.post("/", async (c) => {
  try {
    let { name, email, message, captcha } = await c.req.json();

    if (!captcha) {
      c.status(422);
      return c.json({ status: 422, message: "captcha not selected" });
    }

    let { success, hostname } = await (
      await fetch(
        `https://www.google.com/recaptcha/api/siteverify?${stringify({
          secret: c.env.RECAPTCHA_SECRET_KEY,
          response: captcha,
        })}`
      )
    ).json();

    if (!success) {
      c.status(422);
      return c.json({ status: 422, message: "wrong captcha" });
    }

    let client = clients.find((client) => client.hostname == hostname);

    await fetch(
      `https://api.telegram.org/bot${c.env.TELEGRAM_BOT_TOKEN}/sendMessage?${stringify({
        chat_id: client.chatId,
        text:
          `Hello, ${client.name},\n` +
          `Message: ${message}\n` +
          `From: ${name}<${email}>`,
      })}`
    );

    return c.json({ status: 200, message: "message sent successfully" });
  } catch ({ message }) {
    return c.json({ status: 500, message: `error: ${message}` });
  }
});

app.get("*", (c) => c.json({ status: 404, message: "not found" }));

export default app;
