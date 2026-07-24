---
title: Tech Stack
published: 2026-07-03
authors:
  - Jane Doe
description: Look at the service stack used to build this product, along with the reasoning behind the choices and a bit of personal preference.
image: /images/tech-stack.png
---

## Frontend

### Tanstack Start
I've been using [Next.js](http://nextjs.org/) for a long time because its ecosystem provides a wide range of conveniences that make developers more productive. However, over time, I found its increasingly heavyweight architecture to be cumbersome.

In contrast, although [TanStack Start](https://tanstack.com/start/latest/docs/framework/react/overview)'s ecosystem is still relatively young, it offers a much more developer-friendly experience. It is fully type-safe from end to end, and the resulting applications are remarkably lightweight. Those trade-offs made it the right choice for this project.

### Tailwind CSS
I've been using [Tailwind CSS](https://tailwindcss.com/) for a long time. Their approach is incredibly intuitive and easy to use. I also appreciate the fact that it allows for a high degree of customization, which is important for creating unique and visually appealing designs.

### Shadcn
I previously tried building my own design system using Base UI and Panda CSS, but it quickly turned into a rabbit hole. There was an overwhelming amount to learn about web standards and accessibility, and I realized it was too early to invest that much time into solving those problems myself.

Instead, I chose [shadcn/ui](https://ui.shadcn.com/)—a tool I've relied on for a long time. It provides nearly every UI component I need while following modern web standards and accessibility best practices. 

It also integrates seamlessly with Tailwind CSS, allowing me to build a consistent, maintainable interface without having to create an entire design system from scratch.

## Backend

### Hono
[Hono](https://hono.dev/) is built on the Web Standard APIs, making it a perfect fit for Cloudflare Workers.

It is extremely lightweight, fast, and intentionally minimal. Since it closely follows the standard Web APIs, anyone familiar with JavaScript can become productive quickly without learning a large framework or a new programming model.

Frameworks like NestJS and Spring are excellent choices with mature ecosystems, but they also come with a steeper learning curve and more abstraction. For this project, I valued simplicity, fast development, and seamless integration with Cloudflare Workers above all else.

After using Hono extensively, it has become one of my favorite backend frameworks. The developer experience is so enjoyable that I expect it to be my default choice for future projects whenever it fits the use case.

### Supabase PostgreSQL
[Supabase](https://supabase.com/) is one of the most widely adopted backend platforms for modern web applications, and its generous free tier makes it an excellent choice for early-stage projects.  

Beyond PostgreSQL, it provides a rich set of built-in features such as Authentication, Edge Functions, and Storage, reducing the need to integrate multiple services.

For an MVP, it offers an excellent balance of developer experience, functionality, and scalability, which made it the right choice for this project.

### Clickhouse
ClickHouse is a column-oriented database optimized for storing and aggregating large volumes of analytics data. As page views, sessions, and custom events continue to grow, analytical queries such as time-based aggregations and grouping are better suited to ClickHouse than a traditional relational database like PostgreSQL.

Application data and analytics data are stored separately. User accounts, authentication, and project data are stored in PostgreSQL (Supabase), while event and analytics data are stored in ClickHouse.


## Others

For payments, we use [Creem](https://www.creem.io/). While Stripe is the most popular choice, it isn't available in my region and isn't an option for me as an individual.

I also evaluated several alternatives, including [Dodo Payments](https://dodopayments.com/) and [Polar](https://polar.sh/), but ultimately chose Creem because it offers the most intuitive developer and user experience.

Both the frontend and backend are deployed on [Cloudflare Workers](https://developers.cloudflare.com/workers/). Its edge runtime and near-zero cold starts make it a very compelling platform.

On top of that, the free tier is generous, and it integrates exceptionally well with both TanStack Start and Hono, making it an easy choice for this project.

For authentication, we use [BetterAuth](https://www.better-auth.com/), which is a simple and easy-to-use authentication service. It provides a seamless login experience for users and integrates well with our backend. And also it's very lightweight, which is important for keeping our application fast and responsive. I really love it!