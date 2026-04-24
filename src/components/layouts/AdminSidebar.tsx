import {
  LayoutDashboard,
  Users,
  Rocket,
  Bot,
  Workflow,
  DollarSign,
  FileText,
  LifeBuoy,
  Settings,
  TrendingUp,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Command Board", url: "/admin", icon: LayoutDashboard, end: true },
  { title: "Performance", url: "/admin/performance", icon: TrendingUp },
  { title: "Clients", url: "/admin/clients", icon: Users },
  { title: "Deployments", url: "/admin/deployments", icon: Rocket },
  { title: "Agents", url: "/admin/agents", icon: Bot },
  { title: "Workflows", url: "/admin/workflows", icon: Workflow },
  { title: "Revenue", url: "/admin/revenue", icon: DollarSign },
  { title: "Content Engine", url: "/admin/content", icon: FileText },
  { title: "Support", url: "/admin/support", icon: LifeBuoy },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.end}
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
