import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const isUserSiteRepository = repositoryName?.toLowerCase().endsWith(".github.io");
const base = isUserSiteRepository ? "/" : "/aylik-senet-hesap/";

export default defineConfig({
  plugins: [react()],
  base
});
