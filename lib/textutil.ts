import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import path from "node:path";
import { rm, writeFile } from "node:fs/promises";

const execFileAsync = promisify(execFile);

function decodeRtfToPlainText(rtf: string): string {
  let text = rtf;

  text = text.replace(/\\par[d]?/g, "\n\n");
  text = text.replace(/\\line/g, "\n");
  text = text.replace(/\\tab/g, "\t");
  text = text.replace(/\\'[0-9a-fA-F]{2}/g, (match) =>
    String.fromCharCode(Number.parseInt(match.slice(2), 16))
  );
  text = text.replace(/\\u(-?\d+)\??/g, (_match, codePoint: string) => {
    const value = Number.parseInt(codePoint, 10);
    return Number.isNaN(value) ? "" : String.fromCharCode(value < 0 ? value + 65536 : value);
  });
  text = text.replace(/\\[a-zA-Z]+-?\d* ?/g, "");
  text = text.replace(/[{}]/g, "");
  text = text.replace(/\r\n/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

export async function convertRtfToPlainText(rtf: string): Promise<string> {
  const tempPath = path.join(tmpdir(), `glossary-${randomUUID()}.rtf`);

  try {
    await writeFile(tempPath, rtf, "utf8");
    const { stdout } = await execFileAsync("textutil", ["-convert", "txt", "-stdout", tempPath], {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024
    });
    return stdout;
  } catch {
    return decodeRtfToPlainText(rtf);
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
