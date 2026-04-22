export const ADMIN_ROUTES = [
  { link: "Command Board", href: "/admin", slug: "command-board" },
  { link: "Clients", href: "/admin/clients", slug: "clients" },
  { link: "Deployments", href: "/admin/deployments", slug: "deployments" },
  { link: "Agents", href: "/admin/agents", slug: "agents" },
  { link: "Workflows", href: "/admin/workflows", slug: "workflows" },
  { link: "Revenue", href: "/admin/revenue", slug: "revenue" },
  { link: "Content Engine", href: "/admin/content", slug: "content" },
  { link: "Support", href: "/admin/support", slug: "support" },
  { link: "Settings", href: "/admin/settings", slug: "settings" },
] as const;

export type AdminRoute = (typeof ADMIN_ROUTES)[number];
