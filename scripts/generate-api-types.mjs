import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";

const source = process.env.YASLI_OPENAPI_URL?.trim() || "http://localhost:8000/openapi.json";
const outputPath = resolve("src/lib/api/types.ts");

await mkdir(dirname(outputPath), { recursive: true });

const command = process.platform === "win32" ? "openapi-typescript.cmd" : "openapi-typescript";
const child = spawn(command, [source, "-o", outputPath], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
