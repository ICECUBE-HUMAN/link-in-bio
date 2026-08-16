---
title: Why do we separate the server?
published: 2026-07-06
authors:
  - Jane Doe
description: Separate the server from the frontend app instead of using in-app server routes.
image: /images/tech-stack.png
---

For a long time, while building web applications, I relied on in-app server routes.
For example, Next.js provides Route Handlers, and TanStack Start provides Server Routes. They are genuinely useful, and for a simple service, you can build everything with just those features without setting up a separate server.

But as an application grows, I personally start to see several problems.
First, server code gets mixed into the frontend, and the boundary of responsibility becomes unclear. In my view, the frontend should fetch data from the server and transform it for presentation to the user. Once it also starts accessing the database directly, that feels less appropriate, at least for larger applications.

Another issue appears when the number of APIs grows. Suppose you need to fix and test only one API endpoint in production. Unfortunately, that still requires building and deploying the entire application, including the frontend. As the app gets larger, build times increase significantly, and that eventually hurts productivity.

On the other hand, what if the API server is fully separated? Of course, if you have never worked with a separate server before, you need to invest some time in learning it. But once the split is in place, you no longer have to wait for the app build. You can simply update the endpoint, deploy it, and test it directly from the frontend.

In addition, removing server business logic and database access from the app reduces the app’s overall size, which can lead to smaller bundles and faster builds.