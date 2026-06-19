import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import path from "node:path";
import { rm, writeFile } from "node:fs/promises";

const execFileAsync = promisify(execFile);

export async function convertRtfToPlainText(rtf: string): Promise<string> {
  const tempPath = path.join(tmpdir(), `glossary-${randomUUID()}.rtf`);

  try {
    await writeFile(tempPath, rtf, "utf8");
    const { stdout } = await execFileAsync("textutil", ["-convert", "txt", "-stdout", tempPath], {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024
    });
    return stdout;
  } finally {
    await rm(tempPath, { force: true });
  }
}

export async function convertRtfToHtml(rtf: string): Promise<string> {
  const tempPath = path.join(tmpdir(), `glossary-${randomUUID()}.rtf`);

  try {
    await writeFile(tempPath, rtf, "utf8");
    const { stdout } = await execFileAsync("textutil", ["-convert", "html", "-stdout", tempPath], {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024
    });
    return stdout;
  } finally {
    await rm(tempPath, { force: true });
  }
}
