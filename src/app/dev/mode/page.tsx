import { notFound } from "next/navigation";
import DevModeClient from "./dev-mode-client";

export const metadata = {
  title: "DEV: Device Mode Inspector | Sumit Mahajan",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DevModePage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <DevModeClient />;
}
