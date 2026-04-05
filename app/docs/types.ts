export interface DocPage {
  slug: string[];
  title: string;
  description: string;
  keywords?: string[];
  content: React.ComponentType;
  section: string;
  order: number;
}

export interface NavSection {
  title: string;
  slug: string;
  items: NavItem[];
}

export interface NavItem {
  title: string;
  slug: string[];
  href: string;
  items?: NavItem[];
}
