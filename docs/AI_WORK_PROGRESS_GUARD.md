# IFFG EDB - AI Work Progress Guard

## Purpose

Prevent autonomous project work from consuming significant elapsed time without measurable progress, and prevent estimated or tool-waiting time from being presented as actual AI work time.

## Operating rules

### 1. Define the objective before execution

Each autonomous work block must begin with a concrete objective and an explicit completion condition.

Example:

> Fix the duplicate `getEDBBookingForNewUI()` definition, preserve the richer adapter contract, correct the lifecycle call, and verify the resulting diff.

### 2. Work in short execution blocks

Use a focused cycle:

**inspect -> decide -> change -> verify -> record**

Do not continue open-ended investigation when the next useful action is already known.

### 3. Five-minute productivity checkpoint

If approximately five minutes of elapsed activity has passed without a concrete project result, reassess the approach.

A concrete result is one of:

- verified finding that materially narrows the problem;
- source/code/document change;
- test created or executed;
- defect eliminated;
- regression evidence obtained;
- verified repository state change; or
- a precisely established blocker.

If none has occurred, change strategy rather than continuing the same unproductive route.

The five-minute rule is a **productivity guard**, not a claim that elapsed time is precisely measured.

### 4. Waiting time is not work time

Repository latency, tool execution time, network delay, retries, queueing, or other waiting must not be described as AI investigation, coding, testing, or productive work.

Unless reliable timestamps are available, do not provide a numerical work-time breakdown.

Use explicit wording such as:

> I can verify the work performed, but I do not have a reliable measurement of how many minutes were spent on it.

### 5. Never manufacture time logs

A sequence of tool calls or conversation events is evidence of **what happened**, not evidence of the exact duration between events.

Do not infer or present an exact or approximate duration as an actual measured log unless the duration is supported by a real timing record.

When reporting time, distinguish:

- **Measured elapsed time** - supported by timestamps or a timing mechanism.
- **Unmeasured activity sequence** - actions that can be verified but whose duration cannot.
- **Tool/waiting time** - only report separately when actually measured.

### 6. Do not confuse activity with completion

The following are not, by themselves, completion of a requested fix:

- investigation;
- finding a defect;
- creating a regression test;
- making an unrelated test improvement;
- creating a commit that does not contain the requested fix; or
- explaining why the fix is difficult.

Completion requires evidence that the requested outcome itself has been achieved, or a clearly documented blocker prevents it.

### 7. Escalate blockers early

If the current tool or editing route cannot safely perform the required operation, do not spend extended time repeatedly attempting the same route.

Within the productivity checkpoint, either:

1. find a safer viable route;
2. reduce the task to a safe, independently useful step; or
3. report the precise blocker and what evidence establishes it.

Never use a tooling limitation as a reason to claim that the requested source change was completed.

### 8. Preserve safety boundaries

This guard does not override existing IFFG EDB safety rules. In particular:

- do not modify Production or deploy without the required evidence and approval;
- preserve known-good baselines and recoverable backups before material changes;
- do not silently modify source data or delete unresolved records;
- keep source data, derived data, configuration, audit and operational state distinct; and
- stop for genuine destructive, irreversible, production, security, privacy, payment or compliance boundaries requiring user action or approval.

### 9. Autonomous work means progress, not persistence

The project shorthand `1` means continue AI-side work autonomously: inspect, diagnose, design, code, test, fix, regression-test, verify and document as appropriate.

It does **not** mean continue investigating indefinitely.

The objective is verified project progress. If the current route is not producing progress, change route or expose the blocker.

### 10. End-of-work reporting

When asked what was done, report:

1. **Verified work completed** - concrete actions and repository/test evidence.
2. **Verified remaining defects** - what is still unresolved.
3. **Measured elapsed time** - only when actually measured.
4. **Unmeasured duration** - explicitly stated when timing is unavailable.
5. **User action required** - only where the AI cannot safely or technically perform/verify the action.

Do not convert a reconstructed activity narrative into a fabricated time log.
