import { cpSync, rmSync } from "fs";

rmSync("api/_lib", { recursive: true, force: true });
cpSync("server/dist", "api/_lib", { recursive: true });