---
name: product-eval-tasks
description: Turn a product's own documentation into a batch of agent eval tasks with fair rubrics. Use when someone points at a product's docs, README, or skills repo and wants tasks that measure whether an agent can actually use that product. Also use when reviewing or fixing an existing rubric.
---

# Build eval tasks from a product's docs

The goal is a small batch of tasks that a real user of the product would
recognise, scored by rubrics that are hard to argue with.

## Start from the product's own words

Read the product's README, docs, or skills repo before writing anything. Look
for the section that lists what a user can ask for. Most products publish these
as example prompts. Use them as the source of your tasks, because they are the
work the product team already claims to support.

Note which capabilities the product ships, e.g., a CLI, an SDK, an MCP server,
or a set of skills. You will need this later to decide what belongs in a
treatment.

## Read an index, not the whole site

Documentation sites are far larger than they look. A single page can run to
tens of thousands of characters, and a product with a few hundred pages will
use up everything you have before you write a line.

Start with a compact index rather than the pages themselves. Many products
publish `llms.txt` at the site root, which lists every section in a few hundred
lines. A sitemap works as a second choice. Read the index first and decide from
it which handful of pages you need.

Then read a small number of pages, e.g., five or six, chosen because they cover
different parts of the product. You are looking for what the product is for and
what people do with it, not for full API detail. You do not need the reference
pages to write a good task.

An index tells you a page exists. It does not tell you what is on it, so some
pages will not hold what you expected. Take what is useful, and move on rather
than searching the same area again in a different way.

Write the deliverable as soon as you can describe the product's main jobs. If
something is still unclear, write what you have and go back for that one page.
Running out of room with good notes and no file is the most common way this
work fails.

## Decide what kind of task each one is

There are three kinds of task, and the kind decides what the task needs.

An integration code task asks the agent to add the product to an app. It needs a
file to start from, and a machine with the runtime on it.

A live interaction task asks the agent to do real work in a real account. It
needs an account, a key that someone enters by hand, and seeded data.

A knowledge task asks the agent to explain how it would handle a situation. It
needs nothing beyond the prompt.

Work out the kind of each task before you work out what it needs, not the other
way round. The `product-eval-authoring` skill covers what each kind costs to set
up.

## Work out how many tasks you need

Do not start from a number. How many tasks you need depends on how many separate
parts of the product you are measuring.

Start by listing the product's surface areas. A surface area is a distinct part
of the product that someone works with, e.g., getting data into it. You will
have seen these when you read the product's own documentation. A small product
may have three of them. A large one may have ten.

Then drop the surface areas that fall outside the scope you agreed. If the eval
covers only the open source version, drop the areas that exist only in the paid
version. Say in your summary which areas you dropped and why.

Give every surface area that is left at least one task. Give it more than one
task when the area is large, or when people use it in more than one way. For
example, reading data to answer a request that someone is waiting on is a
different job from reading data in an overnight batch, even though both are
reads.

Then look at the whole set and check the spread across the three kinds of task.
If the product supports a kind that no task covers, add one. A set of only
knowledge tasks measures the writing, and a set of only live interaction tasks
measures the tools, so a set built from one kind alone tells you about that one
thing rather than about the product.

The count is whatever that leaves you. A larger product gets more tasks. Do not
trim the set to reach a number you had in mind before you started.

How many agents to run, and how many trials of each, are chosen at launch. They
are not part of deciding how many tasks to write. Do not let the size of the run
budget change the size of the task set.

Keep one cheap task at the front that only asks the agent to report what it can
see. This task tells you whether the skills and tools actually reached the run.
You have no other way to find that out until a whole batch of results comes back
wrong.

## Write the tasks

Order them from simple to complex.

Write each prompt the way the user would say it. State the goal and leave the
method open. If the prompt names the tool or lists the steps, you are testing
whether the agent can follow instructions, not whether it can use the product.

Do not say where the answer should go. If you name the file to edit, the agent
no longer has to look at the project and work out how it is put together. That
is part of the job you are measuring. Say what the result should be, and let the
agent find the place for it.

Sometimes a name is fixed, because other code depends on it. Put that name in
the repository the task starts from, e.g., in its README. The agent then has to
read the project to find it, which is where the rule would live in real work.

Write the prompt as the request. Put the standards the work has to meet in the
rubric.

Leave the prompt open enough that a careless agent can still make the mistake
you want to catch. A prompt telling the agent not to invent facts removes the
behaviour you built the task to see, and every run then looks the same. Say in
the rubric that invented facts fail.

Warnings about damage belong in the prompt. Say plainly when an agent must not
touch production, e.g., because other runs share the account. Those cost money
or cleanup, and a failed task is the smaller problem.

Say what you want to be left with, not how to produce it. The judge reads only
the transcript and the workspace, so ask by name for any report you need to
grade. Otherwise say nothing about checking the work, because whether an agent
thinks to test what it built is part of what you are measuring.

Vary how much you give away. Name the target in some tasks, e.g., the project or
the service. In others, give only the symptom and make the agent find it. Both
are real situations, and the difference tells you whether discovery is a
weakness.

Check that every task is answerable with what you provide. If a task needs live
data, credentials, or a repository, it has to be in the run or the task is
broken.

## Build each task so that a difference can show

Every task is run at least twice. One run uses a plain agent. The other run uses
an agent that has the product's skill or tools. Build the task so that if those
two agents work differently, you can see it in the results.

This is not a reason to remove a task. A task that both agents do well still
tells you something. It tells you that agents already handle that part of the
product without help. Keep it. What you are avoiding is a task that hides a
difference that was there.

So before you write the rubric, write down two sentences. The first says what a
plain agent will most likely do on this task. The second says what an agent with
the product's guidance will most likely do instead. If those two sentences
differ only in how tidy the work is, the difference will not show up in a run.
You have to change the setup so that the weaker answer actually fails. For
example, if the product's guidance says not to assume a library is installed,
then do not install that library on the machine. The agent that assumes it now
gets an error, and the agent that follows the guidance does not.

Make that change in the machine or in the prompt. Do not make it in the rubric.
Suppose you write a criterion that rewards the better answer, but nothing in the
run gave the agent a reason to produce that answer. Then you are only scoring
which agent happened to guess well.

A task can also hide a difference by being too hard. If a plain agent cannot
even start the task, then both runs fail in the same way, and the results tell
you about your own setup rather than about the product. Aim for a task that a
plain agent can attempt and will get partly wrong.

## Write the rubrics

Each criterion states a single thing a reviewer could check. How many you need
is covered further down.

A criterion may require an approach when the product's own documentation
establishes it as the way the job is done, e.g., that the fields you filter on
have to be indexed, or that bulk work goes in batches rather than one call at a
time. Those are part of doing the job properly, and an eval that ignores them
will pass work that falls over in production.

What a criterion must not do is require one particular spelling of that
approach. Do not name a function, an endpoint, a parameter, or a command. There
is usually more than one way to reach the same place, and naming one of them
fails the run that took another.

The test is whether a different route that achieves the same thing would still
pass. "Filtered queries are served from indexed fields" passes anything that
indexes them. "The code calls create_payload_index" passes exactly one
spelling. Write the first.

For live data you cannot predict, grade internal agreement instead of exact
values. A criterion like "every figure in the answer matches what the tools
returned during this run" is checkable from the trajectory and catches invented
numbers, which is the failure that matters.

Resolve ambiguity before you grade it. If the fixture does not say what the
correct behaviour is, either fix the fixture or write the criterion to accept
every reasonable choice. Grading a coin flip produces noise.

Do not add a criterion you cannot verify from the run. If verification is not a
criterion, you do not need a sentence excusing runs that could not verify.
Sentences of the form "X is not a failure" mean X should not have been a
criterion.

Grade the finished work, not the steps that produced it. A criterion about the
order the agent did things in, e.g., that it read the documentation before
writing the answer, gives two identical answers different scores. Say what the
finished work has to show.

Only require what the task provides. A criterion that needs a credential, a live
account, or data the task never gives the agent fails every run for a reason you
created. Either give the task what the criterion needs, or grade what the task
can produce.

Check the rubric against the paths a good run might take. A criterion that
punishes an agent for checking its own work will quietly favour agents that do
nothing, e.g., failing a run for printing a value that is public rather than
secret. Read each criterion and ask which behaviour it rewards.

## Write it in the form the runner accepts

An eval only exists if the platform can run it. A task is instructions plus a
list of criteria, and nothing else. Design within that.

Each task is a prompt written in plain language, and a short list of criteria
also written in plain language. There is no separate grading program, so do not
design one.

A judge decides each criterion by reading what the run did and what it left
behind. So every criterion has to be answerable from the transcript and the
files in the workspace at the end. A criterion that depends on a test suite
someone runs afterwards, on a held-out answer key, or on measuring latency
across hundreds of queries, cannot be decided and will fail for the wrong
reason.

The judge does not see the product's own account either. If the only evidence
that a task was done is a row in the product's dashboard, no judge can pass it.
Make the task ask for a short written report of what it did, and grade that.
That is for a live interaction task, and it does not mean naming a file or a
place to put it.

Each criterion is pass or fail on its own, and the task passes only if all of
them pass. There is no partial credit, no weighting, and no threshold such as
eight out of ten. If you catch yourself writing weights, gates, or a scoring
formula, the criteria are doing too much and should be fewer and plainer.

Write one criterion for each separate thing that has to be true for the work to
count, and keep the list to between two and five. Every criterion has to pass
for the task to pass, so a longer list means one disagreement with the judge
sinks a task the agent mostly got right. That measures agreement with the author
rather than the quality of the work.

Do not pad a short list to look thorough, and do not split one requirement
across three criteria to reach a number.

When the job has more requirements than the list can hold, choose between them.
Rank them by what would worry you most if the agent got it wrong, then keep the
top few. One criterion states one thing, so do not join the leftovers with
"and". A criterion listing eight requirements fails a run that met seven, and
teaches you less than a short criterion about the single thing you most needed
to be true.

If several dropped requirements still look important, the task is asking for too
many separate things and should become two tasks.

Anything the agent needs at the start has to be a file attached to the task or
something installed on the machine. If a task needs a service running, that is
a machine with that service on it. Say plainly what each task needs, and do not
invent a fixture the runner has no way to produce.

## Before you hand it over

Run one task on one agent first. Read the trajectory, not just the verdict. You
are looking for a run that failed for a reason you did not intend, which is the
cheapest signal that a task or a rubric needs work.
