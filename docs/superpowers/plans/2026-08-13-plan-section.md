# PlanSection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a responsive Free/Pro pricing section to the home page with monthly and yearly Creem checkout selection.

**Architecture:** Keep the pricing catalog local to a focused `PlanSection` component. Use the existing Better Auth Creem client for checkout, existing `/log-in` navigation for anonymous users, and the existing Button/Tailwind tokens for styling.

**Tech Stack:** React 19, TanStack Router, Better Auth Creem client, Base UI Button, Tailwind CSS.

## Global Constraints

- Do not add frontend tests unless explicitly requested.
- Do not add dependencies.
- Use `prod_1M7K6uOQxjMu006ypD04R` for monthly and `prod_6oaKuPlsztLLAQt3Y5BlqD` for yearly checkout.
- Use the existing design tokens and Button component.

---

### Task 1: Add the pricing section

**Files:**
- Create: `apps/frontend/src/components/layout/sections/plan-section.tsx`

**Interfaces:**
- Consumes: `authClient.creem.createCheckout`, `useSession`, `Button`, `Badge`.
- Produces: default-exported `PlanSection` React component.

- [x] **Step 1: Define the local plan and billing-period data**

  Add the monthly and yearly product ID constants. Define Free, Monthly, and Yearly display data with feature lists and the confirmed `$6/month` and `$60/year` prices.

- [x] **Step 2: Implement checkout behavior**

  Read the Better Auth session. If no user exists, navigate to `/log-in`. If the selected product ID exists, call `authClient.creem.createCheckout({ productId })`, navigate to `data.url`, and restore the loading state in a `finally` block.

- [x] **Step 3: Render responsive cards**

  Render the heading, Free card, and Pro card. Use a single selected billing period, a native button group for Monthly/Yearly, visible focus states, and `grid-cols-1 md:grid-cols-2` for layout.

### Task 2: Add the section to the home route

**Files:**
- Modify: `apps/frontend/src/routes/index.tsx`

**Interfaces:**
- Consumes: default `PlanSection` component.
- Produces: home page order `HeroSection → FeatureSection → PlanSection → CTASection`.

- [x] **Step 1: Import and render `PlanSection`**

  Insert the section directly after `FeatureSection` and before the CTA reveal wrapper.

### Task 3: Verify the frontend

**Files:**
- No test files; project rules exclude frontend tests.

- [x] **Step 1: Run Biome on changed files**

  Run `bunx biome check apps/frontend/src/components/layout/sections/plan-section.tsx apps/frontend/src/routes/index.tsx`.

- [x] **Step 2: Run frontend type checking**

  Run `bun run --cwd apps/frontend typecheck` and record any repository baseline issue separately from this change.

  Result: the repository's TypeScript 7 config fails before source checking because `baseUrl` was removed. TypeScript 6 source checking reports only existing errors outside `PlanSection`.

- [x] **Step 3: Run the frontend production build**

  Run `bun run --cwd apps/frontend build` and confirm the route compiles.
