"use client";

import type {
  HandleAvailabilityResponse,
  OwnedPageListResponse,
  PageResponse,
} from "@grabbin/api";
import { PRO_MONTHLY_PRODUCT_ID } from "@grabbin/plan";
import { ChevronLeftIcon, Settings2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle, Loader, XCircle } from "reicon-react";
import { SharedLayoutBg } from "@/components/motion/shared-layout-bg";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createAuthClient } from "@/lib/auth/auth-client";
import { checkPageHandle, updatePage } from "@/lib/client/page-api";
import { getHandleAvailabilityStatus } from "@/lib/page/new-page-state";

type OwnerControlsProps = {
  page: PageResponse;
  ownedPages: OwnedPageListResponse | null;
  readOnly: boolean;
  apiBaseUrl: string;
  siteOrigin: string;
};

type SettingsView = "menu" | "handle" | "delete";
const DELETE_CONFIRMATION_CLICKS = 3;

export function OwnerControls({
  page,
  ownedPages,
  readOnly,
  apiBaseUrl,
  siteOrigin,
}: OwnerControlsProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<SettingsView>("menu");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billingError, setBillingError] = useState(false);
  const [handle, setHandle] = useState(page.handle);
  const [handleSuccess, setHandleSuccess] = useState(false);
  const [pageDeleteOpen, setPageDeleteOpen] = useState(false);
  const router = useRouter();
  const primary = ownedPages?.pages.find((candidate) => candidate.isPrimary);
  const authClient = useMemo(() => createAuthClient(apiBaseUrl), [apiBaseUrl]);

  useEffect(() => {
    setHandle(page.handle);
  }, [page.handle]);

  async function changePlan() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setBillingError(false);
    try {
      const result = ownedPages?.hasAccess
        ? await authClient.creem.createPortal()
        : await authClient.creem.createCheckout({
            productId: PRO_MONTHLY_PRODUCT_ID,
          });
      if (result.error || !result.data?.url)
        throw new Error("Billing could not be opened.");
      window.location.assign(result.data.url);
    } catch {
      setBillingError(true);
    } finally {
      setBusy(false);
    }
  }

  async function deletePage() {
    if (busy || !primary || primary.handle === page.handle) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/pages/${encodeURIComponent(page.handle)}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!response.ok) throw new Error("Could not delete page.");
      setPageDeleteOpen(false);
      setOpen(false);
      window.location.assign(`/${encodeURIComponent(primary.handle)}`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not delete page.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function logOut() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Could not log out.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not log out.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="contents">
      <div className="flex items-center gap-1">
        <Popover
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (nextOpen) {
              setView("menu");
              setHandleSuccess(false);
              setError(null);
              setBillingError(false);
            }
          }}
        >
          <PopoverTrigger
            render={<Button variant="ghost" size="icon-sm" />}
            aria-label="Settings"
            className="rounded-md text-muted-foreground"
          >
            <Settings2Icon />
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={12}
            className={`${view === "handle" || handleSuccess ? "w-88" : view === "delete" ? "w-80" : "w-64"} t-resize overflow-hidden rounded-2xl bg-background p-2 beautiful-shadow ${view === "delete" ? "rounded-4xl p-4" : ""}`}
          >
            <div
              className="t-page-slide t-resize"
              data-page={view === "menu" ? "1" : "2"}
              data-view={view}
              data-plan={ownedPages?.hasAccess ? "pro" : "free"}
              data-billing-error={billingError ? "true" : undefined}
              data-success={handleSuccess ? "true" : undefined}
            >
              <section className="t-page" data-page-id="1">
                <SharedLayoutBg className="px-5">
                  <button
                    type="button"
                    disabled={readOnly}
                    className="relative flex h-15 w-full flex-col items-start justify-center gap-0 rounded-lg text-left font-medium"
                    onClick={() => setView("handle")}
                  >
                    <span>Change handle</span>
                    <span className="text-muted-foreground/80">
                      /{page.handle}
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    aria-busy={busy}
                    className="relative flex h-15 w-full flex-col items-start justify-center gap-0 rounded-lg text-left font-medium"
                    onClick={() => void changePlan()}
                  >
                    {busy ? (
                      <span className="flex w-full justify-center">
                        <Loader className="size-4 animate-spin" />
                      </span>
                    ) : (
                      <>
                        <span>Change plan</span>
                        <span
                          className={
                            billingError
                              ? "text-destructive"
                              : "text-muted-foreground/80"
                          }
                          role={billingError ? "alert" : undefined}
                        >
                          {billingError
                            ? "Billing could not be opened."
                            : ownedPages?.hasAccess
                              ? "Pro"
                              : "Free"}
                        </span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="flex h-15 w-full items-center justify-start rounded-lg text-left font-medium"
                    onClick={() => void logOut()}
                  >
                    Log out
                  </button>
                  <button
                    type="button"
                    className="flex h-15 w-full items-center justify-start rounded-lg text-left font-medium"
                    onClick={() => setView("delete")}
                  >
                    Delete Account
                  </button>
                  <Popover
                    open={pageDeleteOpen}
                    onOpenChange={setPageDeleteOpen}
                  >
                    <PopoverTrigger
                      render={<button type="button" />}
                      disabled={
                        busy || !primary || primary.handle === page.handle
                      }
                      className="flex h-15 w-full items-center justify-start rounded-lg text-left font-medium text-gray-bright disabled:opacity-50"
                    >
                      Delete page
                    </PopoverTrigger>
                    <PopoverContent
                      side="right"
                      align="start"
                      sideOffset={12}
                      className="w-80 gap-1 rounded-2xl bg-background p-4"
                    >
                      <PopoverTitle className="text-xl font-semibold">
                        Delete page?
                      </PopoverTitle>
                      <PopoverDescription className="text-base text-primary">
                        Your contents will be permanently removed.
                      </PopoverDescription>
                      <Button
                        type="button"
                        variant="destructive"
                        size="lg"
                        className="mt-6 h-12 w-full rounded-lg text-base"
                        disabled={busy}
                        onClick={() => void deletePage()}
                      >
                        {busy ? (
                          <Loader className="animate-spin" />
                        ) : (
                          "Delete page"
                        )}
                      </Button>
                    </PopoverContent>
                  </Popover>
                  {error ? (
                    <div className="px-2 text-xs text-destructive" role="alert">
                      {error}
                    </div>
                  ) : null}
                </SharedLayoutBg>
              </section>
              <section className="t-page" data-page-id="2">
                {view === "handle" ? (
                  <ChangeHandleView
                    page={page}
                    handle={handle}
                    siteOrigin={siteOrigin}
                    readOnly={readOnly}
                    busy={busy}
                    onHandleChange={setHandle}
                    onBack={() => {
                      setHandleSuccess(false);
                      setView("menu");
                    }}
                    onSaved={(nextPage) => {
                      setHandle(nextPage.handle);
                      setHandleSuccess(true);
                      window.location.assign(
                        `/${encodeURIComponent(nextPage.handle)}`,
                      );
                    }}
                    onBusy={setBusy}
                  />
                ) : (
                  <DeleteAccountView
                    authClient={authClient}
                    onBack={() => setView("menu")}
                  />
                )}
              </section>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function ChangeHandleView({
  page,
  handle,
  siteOrigin,
  readOnly,
  busy,
  onHandleChange,
  onBack,
  onSaved,
  onBusy,
}: {
  page: PageResponse;
  handle: string;
  siteOrigin: string;
  readOnly: boolean;
  busy: boolean;
  onHandleChange: (value: string) => void;
  onBack: () => void;
  onSaved: (page: PageResponse) => void;
  onBusy: (busy: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [availability, setAvailability] =
    useState<HandleAvailabilityResponse | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = getHandleAvailabilityStatus(handle, availability, checking);
  const domain = useMemo(() => {
    try {
      return new URL(siteOrigin).host;
    } catch {
      return siteOrigin;
    }
  }, [siteOrigin]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (handle.trim().toLowerCase() === page.handle || !handle.trim()) {
      setAvailability(null);
      setChecking(false);
      return;
    }
    let current = true;
    const timer = window.setTimeout(async () => {
      setChecking(true);
      try {
        const result = await checkPageHandle(handle);
        if (current) setAvailability(result);
      } catch {
        if (current) setError("Could not check this handle.");
      } finally {
        if (current) setChecking(false);
      }
    }, 350);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [handle, page.handle]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || readOnly || !status.canCreatePage) return;
    onBusy(true);
    setError(null);
    try {
      const result = await updatePage(page.handle, { handle });
      onSaved(result.page);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not change this handle.",
      );
    } finally {
      onBusy(false);
    }
  }

  const StatusIcon = checking
    ? Loader
    : status.canCreatePage
      ? CheckCircle
      : availability?.available === false
        ? XCircle
        : null;

  return (
    <form
      className="flex h-full flex-col justify-between gap-3 p-2"
      onSubmit={(event) => void submit(event)}
    >
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          aria-label="Back"
          className="rounded-md"
        >
          <ChevronLeftIcon className="size-5 stroke-2" />
        </Button>
        <h3 className="text-base font-medium">Change handle</h3>
      </div>
      <div className="flex flex-col gap-2">
        <InputGroup className="h-11 rounded-lg">
          <InputGroupInput
            ref={inputRef}
            value={handle}
            onChange={(event) => {
              onHandleChange(event.target.value);
              setAvailability(null);
              setError(null);
            }}
            disabled={busy || readOnly}
            placeholder="your-handle"
            autoComplete="off"
            aria-invalid={Boolean(status.error || error)}
            className="pl-0.5! text-base! placeholder:font-normal placeholder:text-base! placeholder:text-muted-foreground/50"
          />
          <InputGroupAddon
            align="inline-start"
            className="pl-4 text-base! font-normal"
          >
            {domain}/
          </InputGroupAddon>
          <InputGroupAddon
            align="inline-end"
            className={`size-10 pr-1 ${status.canCreatePage ? "text-green-500" : availability?.available === false ? "text-destructive" : ""}`}
          >
            {StatusIcon ? (
              <StatusIcon
                weight={checking ? "Outline" : "Filled"}
                className={`size-full ${checking ? "animate-spin" : ""}`}
              />
            ) : null}
          </InputGroupAddon>
        </InputGroup>
        {/*{status.error || error ? (
          <p className="px-1 text-xs text-destructive">
            {error ?? status.error}
          </p>
        ) : null}*/}
        <Button
          type="submit"
          variant="brand"
          size="lg"
          disabled={
            busy ||
            checking ||
            !status.canCreatePage ||
            handle.trim().toLowerCase() === page.handle
          }
          className="h-12 rounded-lg text-base"
        >
          {busy ? <Loader className="animate-spin" /> : "Update handle"}
        </Button>
      </div>
    </form>
  );
}

function DeleteAccountView({
  authClient,
  onBack,
}: {
  authClient: ReturnType<
    typeof import("@/lib/auth/auth-client").createAuthClient
  >;
  onBack: () => void;
}) {
  const [clicks, setClicks] = useState(0);
  const [sent, setSent] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const progress = clicks / DELETE_CONFIRMATION_CLICKS;
  const label =
    clicks === DELETE_CONFIRMATION_CLICKS
      ? "Come back anytime!"
      : clicks
        ? clicks === 2
          ? "Almost there"
          : "One more step"
        : "Begin account deletion";

  async function confirm() {
    if (clicks < DELETE_CONFIRMATION_CLICKS) {
      setClicks((value) => value + 1);
      return;
    }
    setDeleting(true);
    try {
      const result = await authClient.deleteUser({
        callbackURL: new URL("/", window.location.origin).toString(),
      });
      if (result.error)
        throw new Error(
          result.error.message ?? "Could not send the deletion email.",
        );
      setSent(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not send the deletion email.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex h-full flex-col justify-between gap-8">
      {sent ? (
        <p className="text-base text-balance text-primary">
          Your inbox has the final step. Confirm when you’re ready, and we’ll
          take care of the rest.
          <span className="mt-4 block">
            See you again, whenever you’re ready.
          </span>
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <h3 className="text-xl font-semibold">Leaving alreday?</h3>
            <div className="text-base text-balance text-primary">
              <p>Ready to move on?</p>
              <p>
                We’ll send one last confirmation before your account and page
                are permanently removed.
              </p>
            </div>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
          <div className="flex flex-col items-start gap-2">
            <Button
              type="button"
              variant="destructive"
              size="lg"
              disabled={deleting}
              onClick={() => void confirm()}
              className="relative h-12 w-full overflow-hidden rounded-lg text-base"
            >
              <span className="relative z-0">
                {deleting ? <Loader className="animate-spin" /> : label}
              </span>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-red-500 text-primary-foreground transition-[clip-path] duration-200"
                style={{ clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)` }}
              >
                {label}
              </span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={onBack}
              className="h-12 w-full rounded-lg text-base text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        </>
      )}
      {sent ? (
        <p className="pt-4 text-sm italic text-muted-foreground">
          With care,
          <br />
          The founder
        </p>
      ) : null}
    </div>
  );
}
