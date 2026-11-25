---
name: product-eval-setup
description: Build the machine, fixtures, treatments (toolsets) and seeded data an eval batch runs on, so that parallel runs stay valid and the baseline stays clean. Use when setting up an experiment environment, deciding what belongs on a machine versus a treatment, or seeding a product account with test data.
---

# Set up the environment for an eval

Most eval results are wrong for environment reasons rather than agent reasons.
These are the five ways it happens.

## Keep the product off the machine

The machine is attached to the task, so every treatment gets the same one,
including the baseline. Anything from the product that you install on the
machine reaches the untreated agent too, and the comparison stops meaning
anything. The presence of the product's CLI is itself a hint that the product is
the expected answer.

Put only framework dependencies on the machine, e.g., the web framework and the
build tool the fixture needs. Put every piece of the product in a treatment, as
a skill, an MCP server, a CLI, or an SDK.

Do not add a setup command that checks the product is absent. Treatment tools
that install from a package manager are installed before setup runs, so that
check fails the machine build for every treatment that carries the product, and
every run under it is lost. Leaving the product out of `packages` and `setup` is
the guarantee, so there is nothing left to verify.

Secrets belong on the tool that needs them, not on the machine, so that the
baseline never sees a credential.

You cannot enter a secret yourself, so every tool gets its credential in one
of three ways. Work out which one applies before you create the tool.

1. The agent gets its own during the run, e.g., by provisioning a throwaway
   account from an unauthenticated endpoint. Each run then has its own account
   and cannot collide with the others.
2. A person connects OAuth or enters a key afterwards. You declare the required
   input on the tool, create the tool anyway, and tell them it is waiting on
   them. Call `get_setup_links` with the `project_id` from `get_project_context`,
   and hand over the link for the page they need.

   Declare it by name only. For a remote MCP server, use `auth: "oauth"` for
   OAuth or `headerNames` for static headers. For a local MCP server, use
   `envNames`. On a CLI or SDK, use
   `variables: [{name: "THE_NAME", required: true}]`. Do not send a value of any
   kind. A `value` field and a `secret: true` flag are refused, because secure
   values are entered in the web app and nowhere else.

   Where a command, URL, or argument needs the value, write `${THE_NAME}`.
   Install commands can't use Variables.
3. The tool needs no credential. That is normal for a skill. For anything that
   reaches the product, check before you decide it, because a tool that appears
   to need nothing is often getting a credential some other way.

Prefer the first when the product offers it, and the second when it does not.
Ask which one they want, say which one you are assuming, and keep working.

Say in your summary which of the three ways each tool uses, and name every
connection or key a person still has to finish before the eval can run.

Mark every key a task cannot run without as `required: true`. Preflight then
blocks the launch until someone fills it in, and returns the page where it goes.
It does the same for a missing MCP header and a missing OAuth connection.
Preflight does not check a variable declared without `required: true`. The plan
comes back ready with that variable still empty, and the task that depends on
it then fails in every run for a reason nobody was warned about. Write each key,
the page it is entered on, and the task it blocks into your handover.

## Design for runs happening at once

Every run of every treatment and trial executes at the same time against the
same account. The workspace is separate per run, so file changes are safe. The
product account is shared, so writes collide.

Prefer tasks that only read from the shared account. Many runs reading the same
data is safe.

When a task has to write, give it a target that nothing else reads, e.g., a
sandbox project created for this purpose. This is worth doing even if you think
no task writes, because agents send test traffic while verifying, and that
traffic has to land somewhere harmless.

Solve this in the design rather than in the prompt. Telling agents not to
interfere with each other does not work and adds instructions that shape their
behaviour in other ways.

`maxParallelAgentSessions` sets how many runs happen at once, and the person
launching picks it. Most batches can run at the default, because each task that
writes has its own target. Suggest 1 only when concurrent runs share mutable
data and cannot be given separate targets.

## Seed data with a property worth measuring

Data that is merely realistic will not separate a good answer from a lazy one.
Decide what distinction you want to test, then build the data so a shortcut
gives the wrong answer.

For example, if the task asks which problem affects the most users, make the
highest volume item have the fewest users. An agent that sorts by count then
fails, which is the behaviour you wanted to catch.

Check the seeded data after it lands. Ingestion lags, some events are dropped by
default filters, and the numbers you sent are not always the numbers that
appear.

Seeded data that sits inside a time window decays as the window slides. Either
ask about a wider window, or re-seed immediately before each launch and make
that a fixed step rather than something you remember.

## Make the fixture as real as the task needs

A fixture does not have to be a whole product. It does have to be real enough
that a wrong answer actually goes wrong inside it.

Match the fixture to what you are grading. When the task is about getting a
small piece of logic right, a few files are enough. When the task is about
behaviour that only appears once the data is large, a small tidy fixture will
let the wrong answer through. A query that reads the whole table finishes
instantly over two hundred rows, so a fixture that small cannot tell that
answer apart from one that reads only what it needs.

The same holds for tasks about finding something. If you ask an agent to work
out which part of a system is at fault, the fixture needs several parts that are
not at fault. When the repository holds three files, there is nothing to
search, and you are measuring reading speed instead.

So decide what the agent has to do to succeed, then check that the fixture
actually demands it. If it does not, either make the fixture bigger or messier,
or change the task to grade something the fixture can show. A larger fixture
costs time in every run, so decide that on purpose.

## Make the fixture and the data agree

When a task asks an agent to trace a production error back to code, the error in
the account and the code in the fixture have to match exactly. Stack trace file
names and line numbers must point at real lines in the shipped repository.

Write the code first, confirm the bug reproduces, then read the actual line
numbers out of the file and seed the error with those. Verify once more after
any edit to the file, because adding a comment moves every line below it.

If the account already holds data from another task, check that it does not
contradict the new one. An agent that looks and finds nothing wrong will
correctly report that there is nothing to do, and you will have measured
confusion instead of skill.

## Prove the environment once

The first run of a new machine is the one that finds the setup errors. Spend one
cheap run on a task that only reports what it can see, e.g., which capabilities
are present and where they were found. It costs a single run and tells you
whether the tools actually reached the agent, which is otherwise invisible
until a whole matrix comes back wrong.


## Decide what a development version can test

A development package carries only the code that runs in the experiment
environment. It calls the product's hosted API as that API is today. Find
where the fix lives before you upload anything:

- In the MCP, CLI, or SDK code, such as tool descriptions, input schemas,
  paging, errors, or output shape: upload that code as a package.
- In the hosted API or backend: a package cannot carry it, and a client that
  sends a new parameter fails until the API accepts it. Deploy the change to a
  non-production URL, then point a new MCP version at that URL, or pass the
  base URL to the package as an environment name.
- In an MCP server that needs the product's database or internal credentials:
  that server cannot run in the experiment environment. Package a small MCP
  that forwards to the hosted server and changes only what the agent sees, or
  use a non-production URL.

Tell the user when a fix cannot be tested this way, rather than uploading a
package that cannot show it.

Development packages are available only to organizations with the rollout.
When an upload or launch says they are not available for the organization,
tell the user rather than retrying.


## Test a local MCP change as a development version

A Local MCP runs inside the experiment environment, not on the developer's
laptop. Upload its code as an MCP development package; keep product code out
of Machines. Its backend can remain hosted. Declare the environment names the
MCP reads and use the authenticated Web setup for their values. Remote MCP
headers do not automatically become environment variables.

In the checkout, create `oqoqo.mcp.json` with an explicit file list:

```json
{
  "command": "node",
  "args": ["dist/index.js"],
  "files": ["dist", "package.json", "package-lock.json"],
  "installCommands": ["npm ci --omit=dev"],
  "envNames": ["PRODUCT_API_URL", "PRODUCT_API_KEY"]
}
```

Run the build before packaging when the file list contains build output. Include
its runtime dependencies and lockfile. Install commands run in the package
folder during image construction and do not receive tool secrets. Put runtime
configuration in environment variables, not install commands or source files.
The CLI excludes common credential files and caches; inspect the explicit file
list for other sensitive files before uploading. A dependency-free MCP can use
an empty `installCommands` list. Agents in the run can read the installed
package, so do not describe the expected fix in its comments or file names.

For an HTTP-only package, add `connection` to the manifest (or the upload
operation beside `definition`):

```json
"connection": {
  "transport": "http",
  "port": 8080,
  "path": "/mcp",
  "readinessPath": "/health",
  "startupTimeoutSeconds": 60
}
```

The command must listen on `0.0.0.0` at the declared port. Oqoqo starts a private
service for each run, waits for readiness, connects using native HTTP, and removes
it when the environment is cleaned up. Omit `readinessPath` for TCP readiness;
a health path must return unauthenticated HTTP success. Use `transport: "sse"`
with the server's SSE path for legacy SSE. Omit `connection` for stdio.
For authentication between the agent and the packaged MCP, optional
`headerEnv: {"Authorization":"MCP_AUTHORIZATION"}` reads the full header value
from a declared environment name. Configure its value, including any Bearer
prefix, in the Web editor. No value belongs in the manifest.

Services inherit image-time Machine packages and package install commands.
Machine runtime setup and CLI post-install run only in the agent container;
service startup configuration belongs in its command and environment variables.
Service files are a separate copy of the frozen image, not live agent file edits.

Inspect the existing MCP with `inspect_resource` or `oqoqo resources inspect`
for the chosen base `mcpver_` ID and development facts. Read the current revision
(`updatedAt`) from `inspect_catalog` with `projection: "full"` (CLI:
`oqoqo catalog list --kind mcp --projection full`), or from the previous push's
receipt. A version's own `updatedAt` in `inspect_resource` is not the revision
an upload checks. Then run the installed CLI (check `oqoqo schema "mcp push"` for availability):

```sh
oqoqo mcp push . --project-id <project-id> --target <mcp-id> \
  --base-version <base-mcpver-id> --expected-updated-at <current-updated-at> \
  --output json
```

Keep the original base ID when iterating v1.1 to v1.2. Use the current checkout,
including earlier fixes, and pass the previous receipt's `updatedAt` (or
re-read it from the full catalog projection) before each push. An upload
creates an immutable development version. It leaves the official version and
existing treatments unchanged. Use the receipt's version ID to create the new
treatment. Upload success verifies the package, not dependency installation or
MCP startup; prove those with a small experiment.

The MCP adapter uses the same operation through `create_upload`: an operation
with `kind: "mcp"`, `action: "update"`, `targetKey`, `expectedUpdatedAt`,
`baseVersionId`, a Local `definition`, and `installCommands`. Transfer the ZIP
only to the returned transfer target using its own headers, then call
`complete_upload`. Use `get_upload` to recover a pending receipt; retry
completion on the same upload after an interrupted response. If local file
transfer is unavailable, give the person the returned authenticated upload page.
Never send credentials or archive bytes as MCP tool arguments.

## Test a local CLI change as a development version

Use the same immutable package loop for a CLI. Keep code out of Machines. In the
checkout, create `oqoqo.cli.json` with an explicit `files` list and `definition`:

```json
{
  "files": ["dist", "package.json", "package-lock.json"],
  "definition": {
    "install": {"manager": "custom", "command": "npm ci --omit=dev && npm install -g ."},
    "commands": ["my-cli"],
    "postInstall": [],
    "variables": [{"name": "PRODUCT_API_KEY", "required": true}]
  }
}
```

The install runs from the uploaded directory without runtime secrets and must
put the declared commands on PATH. For a compiled CLI, include a Linux binary
for each architecture the environment can use, and an install script that puts
the right one on PATH. Build it for the environment the tasks call. Post-install commands and variables retain
normal CLI behavior; values stay in authenticated Web setup. Include lockfiles
and inspect selected files, following the same package exclusions as MCPs.

Read the CLI's current revision (`updatedAt` from `oqoqo catalog list --kind cli
--projection full` or the previous push's receipt) and its published `cliver_`
base, then run
`oqoqo cli push . --project-id <project-id> --target <cli-id> --base-version <base-cliver-id> --expected-updated-at <current-updated-at> --output json`.
Check availability with `oqoqo schema "cli push"`. Keep the original published
base when iterating. MCP `create_upload` accepts the same `kind: "cli"`,
`action: "update"`, `targetKey`, `expectedUpdatedAt`, `baseVersionId`, and
`definition`; transfer/complete/recovery are identical to the MCP package flow.

Select the returned CLI version in a treatment and run an experiment to verify
installation and behavior. Official versions and existing treatments stay
unchanged. Use friction evidence to fix the checkout and upload the next
development revision.


## Test a local SDK change as a development version

Use the same package loop for SDKs. Create `oqoqo.sdk.json` with an explicit
`files` list and `definition.install` containing a custom command that builds
and installs the library from the uploaded directory. Include source, dependency
manifests and lockfiles. Declare only variable names; configure values on Web.
SDKs do not declare executable commands or post-install commands.

Read the SDK's current revision (`updatedAt` from `oqoqo catalog list --kind sdk
--projection full` or the previous push's receipt) and its published `sdkver_`
base, then run
`oqoqo sdk push . --project-id <project-id> --target <sdk-id> --base-version <base-sdkver-id> --expected-updated-at <current-updated-at> --output json`.
Check availability with `oqoqo schema "sdk push"`. MCP `create_upload` accepts
the same operation as CLI packages with `kind: "sdk"`; transfer, completion and
retry use the same upload session. Never send archive bytes or credentials as
MCP arguments. Keep the original published base for the next revision.

Select the returned SDK version in a treatment. Run an experiment that imports
and calls the SDK, follow its Evals and Insights, fix the demonstrated friction,
and upload the next development revision. Preserve the task, Machine, agents,
other tools and rubric for the rerun. The Machine supplies language/build tools;
the package install command supplies library dependencies. Uploading does not
mark the version official or update existing treatments.
