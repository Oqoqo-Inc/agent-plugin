---
name: product-eval-results
description: Launch an Oqoqo eval experiment, follow it to the end, and turn its runs, Evals verdicts, trajectories and frictions into conclusions that hold up. Use when someone asks to launch or rerun an experiment, check on one, compare treatments (toolsets), explain why runs passed or failed, say whether agents used a tool, find frictions, or count anything across runs.
---

# Run an eval and read its results

An experiment is cheap to misread. Results arrive in stages, a pass rate can
rest on two runs, and a treatment can look better without the agent ever using
it. This skill covers the run from launch to a conclusion you can defend.

If a term such as pass rate, lift or trial is unclear, read
`https://docs.oqoqo.ai/evaluation/results`. For when Evals and Insights
results are final, read `https://docs.oqoqo.ai/evaluation/evals#pending-verdicts`
and `https://docs.oqoqo.ai/evaluation/insights#pending-frictions`.

## Stay in one project and one organization

Call `get_project_context` once, before any other Oqoqo call. MCP has no
current project. A project-scoped call without `project_id` lets the server
pick a project for that call only, so two calls can read or launch in
different projects. Choose the project from its `projects` list. If there is
more than one and nobody says which, ask which one, say that you will use the
one it returns as `project`, and keep working. Pass that `projectId` as
`project_id` on every project-scoped call, and every CLI command passes it as
`--project-id`.

Keep its `organization.id`. Every write, including a launch, a rerun, a
schedule change and a new Evals attempt, passes it as
`expected_organization_id`, and every CLI command passes it as
`--expected-organization-id`. Another session can sign in again and move the
shared sign-in to another organization. Then the write fails with
`organization_scope_changed` and changes nothing, instead of spending runs in
the wrong organization. Tell the person, and read the context again before you
continue.

## Launch once, and only once

Every launch spends runs. The count is tasks multiplied by treatments,
multiplied by agents, multiplied by trials. Say that number before you launch,
and launch with at least two trials.

To run a finished experiment again as it is, call `rerun_experiment` with its
`experiment_id` and a `launch_attempt_id` you keep. Choose the latest task
versions or the experiment's own with `version_mode`. To change something
first, call `get_experiment_plan`, edit the plan, then preflight and launch it.
To build a new plan, take the IDs from `inspect_catalog`.

To run it on a cadence, create a schedule with `manage_schedule`: `action`
`create`, a finished `experiment_id`, a `cron` whose minute is 0, 15, 30 or 45,
and an IANA `time_zone` such as America/New_York. An abbreviation such as EST
is refused, so ask the person for their city. Each launch uses the project's
tasks, treatments, and agents as they are then. Before you create it, call
`preview_schedule` with the same `experiment_id`, `cron`, and `time_zone`, and
tell the person its `nextLaunches`, `runsPerLaunch`, and `runsPer30Days`.
`runsPer30Days` is the runs in the next 30 days, not a monthly average. It
counts the schedule while active (as if resumed, for a paused schedule), and it
is 0 when no launch falls in the next 30 days. If it returns a `shortfall`,
the organization's runs won't cover every launch: tell the person its
`message` and `action` link. It is a warning, so the create still works. If
`blockers` is not empty, the create refuses with all of them; give the person
every fix link at once instead. To preview a change, pass `schedule_id` and only the fields you
would change. A schedule runs as the person who created it, resumed it, or
last changed when or what it runs. Oqoqo pauses it when a launch needs a fix
or after 3 failed launches in a row, and `pauseReason` says why. Give the
person its fix link; once they fix it, `resume` is the one step: it checks the
launch and resumes. If something still stops it, `resume` refuses with
`schedule_launch_blocked` and every blocker with its fix link in
`details.blockers`. A launch is
skipped while the schedule's previous experiment still runs; `skippedInARow`
counts them, and from 3 the schedule repeats faster than its experiment
finishes, so suggest a less frequent `cron`. Launch it now with
`rerun_experiment` and its `schedule_id`. List what it launched with
`list_experiments` and its `schedule_id`. Find the schedule that launched an
experiment with `list_schedules` and `launched_experiment_id`, and the
schedules an experiment already has with `experiment_id`, before you create
another.
Read the agents with `kinds` set to agent and `projection` `full`: each agent's
`facts` holds the configuration revisions the plan needs.

Call `preflight_experiment` with the plan before you launch it. It spends
nothing, and it returns the plan it checked. Fix every blocker it reports, then
launch the plan it returned.

- `configuration_changed` means an agent setting changed after the plan was
  made. Follow its message and preflight again. Sending the same plan again
  fails the same way.
- A missing MCP header, OAuth connection or required variable needs a
  person. Give them the `setupUrl` that the issue carries.
- `mcp_header_values_unbound` means an MCP server version would send its
  saved header values to an address that no person bound them to, for
  example a version you saved at a new URL. Only a person can fix it. Give
  them the blocker's `setupUrl`, the version's Tools tab, where they check
  the address and select Refresh. Do not change the URL back or launch again
  before they do.

Give `launch_experiment` a `launchAttemptId` that you keep for this launch. If
the call times out or you cannot tell whether it worked, send the same plan
with the same ID. Oqoqo returns the launch it already made. A new ID starts a
second experiment and spends the runs again.

Let the person choose `maxParallelAgentSessions`.

## Follow it to the end

Follow `get_launch_status` until the experiment exists, then
`get_experiment_status`. Send `wait_ms` (up to 25000) and call again at once:
each call waits until the status changes or a run finishes, so you do not
need to sleep between calls.

Read the final run list after a status call returns `terminal` true. Do not
send `list_runs` in parallel with a waiting status call. `list_runs` returns
first, so it can show a run as still running while the status call, which
returns later, shows the experiment finished.

A finished experiment can still have results on the way. Evals and Insights
read each run after it ends, so verdicts and frictions arrive later.

- `get_evals_results` and `get_insights_results` read one attempt. Leave out
  its ID to read the latest attempt. Send the ID that the result names when
  you page on with a cursor or an offset. Send `wait_ms` to wait in the call
  while the attempt is still running. A row with status `queued` or `running`
  has no result yet. `completed` is final. `skipped` or `failed` means that
  attempt gives the run no result.
- `analyze_results` counts `pendingRuns`. A pass rate with pending runs is not
  final. An empty list of frictions is final only when Insights has no pending
  runs.

Say what is still pending in every report. Do not wait in a loop for results
that nobody asked you to wait for.

## Pick the read that answers the question

Start from the question, not from the tool list. Each read below names the
next one to go to when you need more detail.

| Question | Start with | Go deeper with |
|---|---|---|
| What did the experiment show, or why did a treatment or an agent do worse? | `get_experiment_brief` | `get_evals_comparisons` for every comparison, then `get_friction` for one friction's evidence |
| Which treatment did better? | `analyze_results`, mode `compare_treatments` | `list_runs` filtered to one treatment |
| Does a difference hold up? | `get_evals_comparisons` | `get_experiment_plan` with the comparison's `comparison_id`, to plan the runs that check it again |
| File a difference as an issue | `get_experiment_brief`, the finding's `issueMarkdown` | `get_friction` for each friction it lists |
| Did a fix work? | `get_experiment_brief`, the finding's `afterFix` | `get_experiment_plan` with its `comparison_id` and `after_fix: true` |
| Why did this run pass or fail? | `get_evals_results` for its verdict and `outcomeExplanation` | `analyze_results`, mode `get_run_evidence`, then `get_run_trajectory` around the steps it cites |
| Did the agent use the tool? | `get_run_profile`, or `treatmentUse` in `list_runs` | `get_run_trajectory` from the first step that used it |
| Where do agents get stuck? | `list_frictions`, ranked by runs the agent never got past; `fix_in` narrows to where the team can fix it | `get_friction` for one friction, then `list_runs` with its `friction_id` |
| What failed the same way? | `analyze_results`, mode `find_failure_patterns` or `find_similar_failures` | `analyze_results`, mode `get_run_evidence`, for each run it names |
| How many, how much, or how often? | `query_data`, after `inspect_data_model` | a narrower filter or another `groupBy` |
| What did the agent leave behind? | `get_run_output`, part `manifest` | the diff or one file |

Read the Brief first when someone asks what an experiment showed, or why a
treatment or an agent did worse. `get_experiment_brief` returns `summary`,
the experiment's answer in one sentence (say it first), and at most 5
`findings`: the main comparisons with a clear or likely difference, then
clear differences for one agent alone or between agents. Each finding has
its difference in the words the dashboard shows (`name`, `sides`,
`taskLine`, `verdict`, `nextStep`, `byAgent`), one written `sentence`, and
the frictions seen with
`worseSide`, counted for both sides: `failedRuns` is how many of the worse
side's failed runs had the friction, and `passedRuns` how many of the other
side's passed runs had it. Say the `summary` and each `verdict` as
written. Such a friction was seen with the side that did worse. That does
not mean it caused the difference: say "seen with", never "because",
and give both sides' counts as the dashboard does: "Raw Agent 24 of 28
failed runs · Stripe CLI 0 of 26 passed runs". Add no number and no reason of your own. When
`comparisonsLeftOut` is above 0, say that the Brief does not show every
difference. `list_frictions` lists every friction of the experiment.

To file a difference as an issue, use its `issueMarkdown` exactly as it is:
its headline is the title, and it holds both sides, the result, the
sentence, the frictions with where to fix each, and the links. Do not
rewrite it or add a cause. Ask before you create an issue in someone's
tracker.

A clear difference that lists a friction to fix in the product carries
`afterFix` (its `text`, `taskCount`, and `runs`). Once the team has shipped
the fix, `get_experiment_plan` with the experiment, that `comparison_id`,
and `after_fix: true` plans the runs that check it again: the tasks where
the two sides differed, both sides, the same runs each. Say the run count
first, then preflight and launch the plan. A likely difference never has
it: run that one again to be sure instead.

- `writing`: the findings are there and the Brief is being written. Call
  again after `waitMs` milliseconds until `state` changes.
- `failed` and `not_written`: the findings are there with no written
  `sentence`. Say what `message` says, and `error.message` when it failed.
  Do not tell the person to run Evals or Insights again for it: a Brief is
  written the next time either finishes. Report the findings' counts, and
  read `get_evals_comparisons` and `list_frictions` for the rest.
- `no_insights`: there is no Brief. Say what `message` says, and answer from
  `get_evals_comparisons`. The frictions tools have nothing until Insights
  reviews a run.
- `not_available`: the experiment, its Evals or its Insights is still
  running. Read the Brief when they finish.

A `likely` finding carries the same `confirmation` as its comparison. Follow
"Compare treatments fairly" below, and launch nothing until the person says
to go ahead.

When you report a friction, lead with where the team can fix it (`fixIn`:
`product` Product, `agent` Custom agent, `setup` Setup, or `agent_behavior`
Agent behavior) and the place its fix names (`fixSurface`), then its
`concentration` sentences, before its counts. The family is the friction's
cause, not where to act. `agentNote` says what the agent did beside a
product or setup fix: report it after the fix, never as the action. When
`fixIn` is `agent_behavior`, the evidence points to the agent's behavior, not to the product or setup: read the
friction's rate by agent, and compare that agent's pass rate and cost with
`analyze_results`, mode `compare_treatments`, or the experiment's Matrix.
State concentration as counts, never as a cause.

Read small parts of a run. Start `get_run_trajectory` just before the step
you need, with a small `limit` and the compact projection. Open
`get_run_transcript` only for the original text of a step you already found.

## Count with `query_data`

Call `inspect_data_model` once, and choose the dataset by its grain. `runs`
has one row for each logical run, and `trials` has one row for each repeat of
it. Counting runs in `trials` counts every trial.

Answer a count or a breakdown with an aggregate, so the answer fits on one
page. For a breakdown, put each field in both `select` and `groupBy`, and add
an aggregate such as `{"function": "count", "as": "runs"}`.

When a query fails, read the error before you change anything. Fix the one
thing it names and send the query again.

Never present one page as the whole result. When `page.hasMore` is true, say
that more rows exist, and read the next page only when the question needs
every row.

## Compare treatments fairly

`compare_treatments` measures each treatment against the reference treatment,
which is normally the baseline. Read these before you call a difference real.

- **Count the runs behind every rate.** A failure rate counts only runs with
  a verdict. Runs whose Evals failed, runs the environment blocked,
  inconclusive runs and pending runs stay out. Report those counts too. With
  two trials of a task, one run moves that task's rate by 50 points.
- **Check that the tool was used.** `treatmentUse.useRate` says how often the
  agent used the treatment, counted over runs where use can be decided. A
  difference on runs that never used the tool did not come from the tool.
  `not_measured` and `inconclusive` mean the log cannot show use. They do not
  mean the tool went unused.
- **Look at each task.** A treatment can help overall and hurt one task.
  Check the tasks behind the totals before you recommend it.
- **Check whether the difference holds.** `get_evals_comparisons` compares
  each treatment with the baseline, and each pair of agents, on the same
  tasks. Start with `summary`: the answer to the experiment's question in
  one sentence, over its main comparisons. Then `differences`: one block
  for each difference, in the order to say them, the main comparisons with
  a clear or likely difference first, then a comparison for one agent alone
  or between agents only when its difference is `clear`. A `likely` result
  for one agent alone or between agents is never in `differences`: it is in
  `comparisons`, and `restLine` counts it. Each block has a `name` (its two
  sides), `sides` (each side's passes, runs and whole `percent`, the side
  that did better first), a `taskLine` (how the tasks went), a `verdict`
  (the result label), a `nextStep`, and `byAgent` (how many agents did
  better with the same side). Say the `summary` and each `verdict` as
  written, and do not reword a result. `restLine` says what `summary` and
  `differences` leave out. `comparisons` lists every comparison with the same fields, its
  `groupLabel` and its `taskSplit`.
- **Read the label.** `clear` means one side did better on enough tasks to
  be confident, `likely` means one side is ahead but more runs are needed to
  be sure, and `unclear` means neither side is reliably ahead on these
  tasks. `unclear` never means the two are the same.
  `family` says which comparisons a result was checked with: `primary` is
  the main comparisons, which answer the experiment's question, and
  `breakdown` is every other one (each agent on its own, agents against each
  other, and whether a treatment helps one agent more). The breakdowns are
  checked more strictly because there are more of them, so the same result
  can be `clear` for all agents together and `likely` for one agent. Call
  them main comparisons and breakdowns when you speak. Give `pValue` and
  `adjustedPValue` together, and do not call a result significant. Only
  tasks where one side did better count. With fewer than 6 tasks no
  comparison can show a difference: say that, and suggest more tasks. Read
  `notes`: they say when the experiment is too small, still running, or read
  from an earlier Evals attempt.
- **Compare cost only within one source.** A cost the agent reported and a
  cost estimated from list prices are not comparable. The delta stays null
  when the two sources differ.
- **Name the agent completely.** Runs with the same agent, model and effort
  can still differ by provider connection, shown as `providerDisplayName`.

Say plainly when the experiment is too small to decide. `nextStep` says what
to do next: `run_again` with its run count, `more_tasks` when these tasks
cannot show or settle a difference, or null. A `likely` difference from the
latest Evals of a finished experiment comes with a `confirmation`: the runs
that check it again and are likely to settle it. To run it again,
call `get_experiment_plan` with the experiment and that comparison's
`comparison_id`, then preflight and launch the plan it returns. Say its run
count first: a launch spends runs. When `confirmation` is null,
`confirmationUnavailable` says why: read the latest Evals, wait for the
experiment to finish, or add tasks, because running the same tasks again
cannot settle it. Run it again once. If it comes back `likely` again, report
it with both p-values, and ask before launching another. Do not promise that
the same result will come out `clear`: a difference in how much a treatment
helps each agent can stay `likely` when it is run again.

## Explain a result with evidence

Start from the verdict. `outcomeExplanation` says which rule decided the run
and how each criterion counted. Then find the steps that show why.

Check `evidenceCoverage` before you blame the agent. When the judge could not
read the whole run, the verdict covers only what it read. Say so.

A failed criterion is not always the agent's fault. If the work met the intent
of the task and the criterion asked for something else, the rubric is wrong.
Fix the rubric on the task, check the change with `preview_evals`, then run
Evals again with `trigger_evals`. That grades the same recorded work again,
and no new runs are needed.

A run that the environment blocked, or that failed before the agent answered,
says nothing about the agent. For a custom agent, `agentError` says where it
stopped.

## Write the report

Every number in the report comes from a tool result in this session. Give the
public IDs of the experiment, the runs and the trials you cite, and the step
ordinals of the steps you quote. Say what is still pending, what was too small
to decide, and what you would read next.
