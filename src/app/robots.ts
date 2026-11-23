import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sumitmahajan.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/skip"],
        disallow: ["/wanted", "/true-ending", "/dev/", "/style-test", "/biyoo-test", "/api/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
