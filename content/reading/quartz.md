---
title: Quartz and its build workflow
---

## How to build this site
I know about, quartz mostly impl by TypeScript that is superset of JavaScript. And learn from [architecture](https://quartz.jzhao.xyz/advanced/architecture), refer to the term `transpiling and bundling` the rest of Quartz, I'm confused about them.

Find [good article](https://dev.to/sayanide/the-what-why-and-how-of-javascript-bundlers-4po9) that explain well about what is bundler of JavaScript.

## Bundler mechanisms
- Mapping a dependency graph
	- when a brower request functions from the bundler it can easily return the requested function because of the already constructed dependency order
	- Since JS bundlers have a good source map of all the files and their dependencies, it prevents name conflicts
	- It detects unused files allowing you to get rid of them if you choose

## Bundler are not transpilers
Bundler is only a tool to combine multiple files into a single, efficient bundle that can be easily loaded by the browser. The goal is to minimize HTTP requests and improve page load performance.

On the other hand, a transpilers, shorts for "transformation compiler", is a tools that converts source code written in one program language (such as ES6 + JavaScript) into another.

## Quartz plugin
[Make your own plugins](https://quartz.jzhao.xyz/advanced/making-plugins)(those are series of transformations over content) (transpiler)

## Slugify
[paths in quartz](https://quartz.jzhao.xyz/advanced/paths)

For SSG(static site generator), paths are pretty complex.

### what is slug
A slug is the part of a URL that identifies a particular page on a website in an easy-to-read form. In other words, it’s the part of the URL that explains the page’s content.

For example, the URL is  `https://yoast.com/slug`, and the slug is simply 'slug'.