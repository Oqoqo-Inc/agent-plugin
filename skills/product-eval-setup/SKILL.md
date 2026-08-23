---
name: product-eval-setup
description: Build the machine, fixtures, treatments and seeded data an eval batch runs on, so that parallel runs stay valid and the baseline stays clean. Use when setting up an experiment environment, deciding what belongs on a machine versus a treatment, or seeding a product account with test data.
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

Do not add a setup command that checks the product is absent. Treatment assets
are installed before setup runs, so that check fails the machine build for every
treatment that carries the product, and every run under it is lost. Leaving the
product out of `packages` and `setup` is the guarantee, so there is nothing left
to verify.

Secrets belong on the asset that needs them, not on the machine, so that the
baseline never sees a credential.

You cannot enter a secret yourself, so every asset gets its credential in one
of three ways. Work out which one applies before you create the asset.

1. The agent gets its own during the run, e.g., by provisioning a throwaway
   account from an unauthenticated endpoint. Each run then has its own account
   and cannot collide with the others.
2. A person connects OAuth or enters a key afterwards. You declare the required
   input on the asset, create the asset anyway, and tell them it is waiting on
   them. Call `get_setup_links` and hand over the link for the page they need.

   Declare it by name only. For a remote MCP server, use `auth: "oauth"` for
   OAuth or `headerNames` for static headers. For a local MCP server, use
   `envNames`. On a CLI or SDK, use
   `variables: [{name: "THE_NAME", required: true}]`. Do not send a value of any
   kind. A `value` field, a `{{PLACEHOLDER}}` string and a `secret: true` flag
   are all refused, because secure values are entered in the web app and nowhere
   else.
3. The asset needs no credential. That is normal for a skill. For anything that
   reaches the product, check before you decide it, because a tool that appears
   to need nothing is often getting a credential some other way.

Prefer the first when the product offers it, and the second when it does not.
Ask which one they want, say which one you are assuming, and keep working.

Say in your summary which of the three ways each asset uses, and name every
connection or key a person still has to finish before the eval can run.

Do not rely on preflight to remind them. Preflight reports a missing MCP header
and a missing OAuth connection, but it does not report a CLI or SDK variable
that was declared and never filled in. The plan comes back ready with that
variable still empty, and the task that depends on it then fails in every run
for a reason nobody was warned about. Declaring the name is still worth doing,
because it puts a labelled field on the asset page for the person to fill in,
but treat it as a note to the reader rather than as something the platform will
chase. Write the key, the page it is entered on, and the task it blocks into
your handover, and say plainly that preflight will look green without it.

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
whether the assets actually reached the agent, which is otherwise invisible
until a whole matrix comes back wrong.
