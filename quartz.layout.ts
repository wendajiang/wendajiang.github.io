import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"
import { SimpleSlug } from "./quartz/util/path"

const recentNotes = [
  Component.RecentNotes({
        title: "Recent Blogs",
        limit: 9,
        showTags: false,
        filter: (f) =>
          f.slug!.startsWith("area/blog/") && f.slug! !== "area/blog/index" && !f.frontmatter?.noindex,
        linkToMore: "blog/" as SimpleSlug,
      }),
]

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [...recentNotes.map((c) => Component.MobileOnly(c))],
  footer: Component.Footer({
    links: {
      GitHub: "https://github.com/wendajiang/wendajiang.github.io",
    },
  }),
}

const left = [
  Component.Flex({
    gap: "0.5rem",
    components: [
      { Component: Component.PageTitle(), grow: true },
      { Component: Component.Search() },
      { Component: Component.Darkmode() },
    ],
  }),
  ...recentNotes.map((c) => Component.DesktopOnly(c)),
]

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle(), Component.ContentMeta(), Component.TagList()],
  left,
  right: [Component.Graph({
          globalGraph: {
               showTags: false,
          },
      }), Component.DesktopOnly(Component.TableOfContents()), Component.Backlinks()],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.ArticleTitle(), Component.ContentMeta()],
  left,
  right: [],
}
