export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO date
  readingTime: string;
  tags: string[];
  ogImage?: string;
}
