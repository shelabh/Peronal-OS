import type { Metadata } from "next";
import { DocsClient } from "./docs-client";
import { docsTabs } from "@/lib/docs-content";

export const metadata: Metadata = {
  title: "Docs | Personal OS",
  description: "Learn how to use Personal OS well and understand the system behind it.",
};

export default function DocsPage() {
  return <DocsClient tabs={docsTabs} />;
}
