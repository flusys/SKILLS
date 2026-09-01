import { createServer } from "./server.js";

const port = Number(process.env.PORT ?? 4001);
createServer().listen(port, () => {
  console.log(`PRD Studio API listening on http://localhost:${port}`);
});
