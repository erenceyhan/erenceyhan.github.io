import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const isUserSiteRepository = repositoryName?.toLowerCase().endsWith(".github.io");
const base =
  process.env.BASE_PATH ??
  (isUserSiteRepository ? "/" : "/");

export default defineConfig({
  plugins: [react()],
  base
});
