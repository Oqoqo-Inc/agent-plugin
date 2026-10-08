---
name: product-eval-authoring
description: Build a complete eval set in Oqoqo from a product's documentation, including the tasks, the machine, the files, the assets and the treatments. Use when someone points at a product and asks for an eval set to be created, or asks what they should evaluate about their product. Covers what to ask them, how to find the product's MCP server, CLI and SDK, and how to write everything into an Oqoqo project.
---

# Build an eval set in Oqoqo from a product's docs

Someone points at a product and wants an eval set. This skill covers the whole
job, from the first question to the last thing you tell them to do.

Two other skills cover the craft. Use `product-eval-tasks` for writing the tasks
and the rubrics. Use `product-eval-setup` for the machine and the seeded data.
For general guidance on how Oqoqo works, start with the public documentation
index at `https://docs.oqoqo.ai/llms.txt`, then read the pages relevant to the
workflow. Do not assume that a separate documentation MCP server is connected.

## Never end a turn on a question

Say what you are going to assume, ask the question in the same message, and keep
working. Someone who is there will correct you before you get far. A run with
nobody there still finishes and still produces the eval set.

This skill gets tested by running it as an Oqoqo task, and in a run there is
nobody to answer. An agent that stops and waits produces nothing, and producing
nothing scores zero. Every question below comes with what to assume when no
answer arrives.

## Find out what you are evaluating

You need the product's documentation and the Oqoqo project to write into.

State the scope before you start research. If the user names a product area,
use that scope. Otherwise say that you will cover the product broadly across
its documented user jobs and every task kind it supports. Broad coverage is the
default.

Call `get_project_context` for the project. If there is more than one and nobody
says which, use the one that is already active.

Read the documentation the way `product-eval-tasks` describes, which is an index
first and then five or six pages. Do not start writing tasks before you can say
what the product is for.

## Decide what kind of tasks to write

Ask what kind of tasks they want. There are three kinds, and the kind belongs to
each task rather than to the whole set.

| Kind | The prompt asks the agent to | It needs | It means |
|---|---|---|---|
| Integration code | add the product to an app | a file to start from, and a machine with the runtime on it | safe to run in parallel |
| Live interaction | do real work in a real account | an account, a key someone enters by hand, and seeded data | give it its own target if it writes |
| Knowledge | explain how it would handle a situation | nothing | cheapest, and the standard machine will do |

The kind decides which assets a task needs. Work out the kind first and the
assets second, not the other way round.

Use the three kinds as a checklist of what to cover. They are not a quota to
fill. Write at least one task of every kind the product can support. Do not add
a weak task just to reach a number for one kind. A strong task covering a part
of the product you have not reached yet is worth more. The `product-eval-tasks`
skill covers how to work out the number of tasks from the product's surface
areas.

Only offer live interaction tasks when the product has an account someone can
sign up for. If there is no account, say so, and cover those surface areas with
the other kinds instead. A set that is mostly integration code is the right
answer for a product that is mostly a library. Say that in your summary rather
than describing the set as balanced.

If no answer arrives about which kinds they want, cover every kind the product
supports and record that you chose this.

## What the judge can see

Grading reads the transcript of the run and the files left in the workspace at
the end. The judge never sees the product's own account.

This is the main way a live interaction task fails for a reason you did not
intend. If the only evidence that the work happened is a row in the product's
dashboard, no judge can pass it. Make the task ask for something written down,
e.g., a short report of what was sent and what came back, and grade that. It
does not mean naming a file or a place to put it.

## Find out what the product ships

You need to know whether the product has an MCP server, a CLI, an SDK or a
published skill, because those are what a treatment carries.

Check the product's own domain first. Many products publish one or more of
these files:

- `https://<domain>/llms.txt`
- `https://<domain>/.well-known/integrations.json`
- `https://<domain>/.well-known/agent-skills/index.json`
- `https://<domain>/.well-known/api-catalog`
- `https://mcp.<domain>/mcp`

If the product publishes none of them, look it up at
`https://integrations.sh/<domain>/`, which collects specs for MCP servers,
OpenAPI, GraphQL and CLIs across several thousand products.

Ask whether they want these set up now. If no answer arrives, set up everything
you found and name the ones you could not find.

You can create the MCP server, the CLI and the SDK. You cannot complete OAuth or
enter secrets for them. Say this at the start so nobody expects otherwise.

## Show the plan before you write

Before the first resource write, send one plan update that includes:

- The scope and any product areas left out.
- Every proposed task and its kind.
- The Machine, fixture files, treatment assets and Treatments.
- The expected Run count for one trial and for two trials.

Calculate the Run count as Tasks multiplied by Treatments multiplied by trials.
Give the result per enabled agent. If the user already chose several agents,
multiply both totals by that number too.

Keep the plan short enough to read in one go. This is a progress update, not an
approval gate. Continue after sending it. If the user changes the scope before
the first write, update the plan and use the new scope.

## Write it into Oqoqo

Before calling `author_resource` or `bulk_author_resources`, read
the exact input schema published with that MCP tool. When using the CLI, run
`oqoqo schema resources apply` or `oqoqo schema resources bulk-apply` and use
the returned payload schema. The product docs explain the workflow, but the
exact shapes come from these schemas. Do not infer write shapes from catalog
resources or probe the contract with failed writes.

Use the order below. A task refers to its machine and its files by ID, and a
treatment refers to its assets by version ID, so nothing can be written before
the thing it points at.

1. The machine, which needs a name and a definition. The definition holds
   `packages`, `setup`, `services` and `variables`. Put shell lines in `setup`
   to install what the fixture needs.
2. The files. Upload a local folder or ZIP; never put archive bytes or base64
   in a tool argument. With the CLI, run
   `oqoqo uploads create <path> --kind file`. With MCP, call `create_upload`.
   If you can run commands, declare the file (name, exact size, and SHA-256),
   send it with `curl -X PUT` to the returned transfer target, then call
   `complete_upload`. Otherwise, give the user the returned `uploadUrl` and
   poll `get_upload` until it completes. A public GitHub repository also works
   through `author_resource`; private repositories do not.
3. The assets, which are the MCP server, the CLI, the SDK and any skill. Upload
   a local skill the same way with kind `skill`. Declare
   every credential by name. For a remote MCP server, use `auth: "oauth"` for
   OAuth or `headerNames` for static headers. For a local MCP server, use
   `envNames`. On a CLI or SDK, use
   `variables: [{name: "THE_NAME", required: true}]`. Never send a value. Keep
   the version IDs that come back, which start with `mcpver_`, `cliver_`,
   `sdkver_` and `sklver_`.
4. The treatments. Write a baseline with every list empty and one treatment for
   each interface you want to measure. Add a combined treatment only when the
   combination itself is part of the test.
5. The tasks, which point at the machine through `environmentId` and at the
   files through `assetAttachments`. Give each file its own `mountPath`, a
   relative path inside the agent's working directory, e.g., `helpdesk-web` or
   `data/customer-fixtures`. Use `.` to put the file in the working directory
   itself. Never start the path with `/` or `~`. Refer to the same relative
   path in the instructions, e.g., `helpdesk-web/`.

`bulk_author_resources` takes at most 20 operations and stops at the first
failure. Write each dependency stage in batches of 20 or fewer. Finish steps 1
to 3 and read their IDs before writing steps 4 and 5.

The rubric on a task is `{schemaVersion: 1, criteria: [{index, text}]}`, and the
criteria are numbered from 1. Each criterion is one plain sentence.

When you update something that already exists, prefer its short key, e.g.,
`task_08`, as `targetKey`. CLI and SDK updates may use their matching public ID
as `targetKey`; Oqoqo normalizes it to the short key. For every other resource
kind, including Tasks, use the short key. A public ID for those kinds is invalid
input, not a revision conflict. Use the current `expectedUpdatedAt` value. A
Task update also needs its current `version` and `versionId`.

Editing an asset mints a new version ID, and a treatment keeps pointing at the
old one. So any change to a skill, MCP server, CLI or SDK after the treatments
exist means updating every treatment that carries it. Get the credential
declarations right in step 3 and you avoid the round trip.

## Hand it over

Call `get_setup_links` and give them the exact link for each connection or secret
they have to finish, e.g., the machines page for a machine variable, and the MCP
page for OAuth or a secret header.

Call `preflight_experiment`. It checks the plan, the secrets and the quota
without spending a run. Expect it to report a missing MCP header or OAuth
connection, because that is the one thing you could not do for them.

Preflight does not report a missing CLI or SDK variable, even one you declared
as required. It can come back ready while the key a live interaction task
depends on is still empty. So list those keys yourself, with the page each is
entered on, and say plainly that preflight will not flag them.

Then tell them what to do next:

1. Enter the keys at the links above.
2. Turn on the agents they want under Manage, then Agents.
3. Run preflight again and expect it to pass this time.
4. Launch with at least two trials.

Let them pick `maxParallelAgentSessions` themselves. The default suits most
batches. Suggest 1 only when concurrent runs share mutable data and cannot be
given separate targets.
