# External Resources for CASRE Authoring

Curated references for writing high-quality Commands, Agents, Skills, Rules, and Evals.

## Resources

### Anthropic: Skill Best Practices

**URL:** https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices

Key takeaways: Structure matters more than length -- a well-organized 200-line skill outperforms a rambling 2000-line one. Front-load success criteria and constraints before procedural steps. Use concrete examples of good and bad output rather than abstract descriptions.

### Anthropic: Equipping Agents with Agent Skills

**URL:** https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills

Key takeaways: Skills should encode domain expertise that the model lacks, not restate what it already knows. The most effective skills combine declarative knowledge (what good looks like) with procedural guardrails (what to avoid). Skills are most valuable when they reduce variance across runs -- the same input should produce consistently shaped output.

### Anthropic: Demystifying Evals for AI Agents

**URL:** https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents

Key takeaways: Build evals bottom-up -- start with the smallest testable unit and compose upward. Prefer deterministic graders (exact match, regex, structured checks) over model-based graders wherever possible. When model-based grading is necessary, constrain the grader with explicit rubrics and examples of pass/fail. Eval quality directly determines your ability to iterate on agent behavior.

### OpenAI: Eval Skills

**URL:** https://developers.openai.com/blog/eval-skills

Key takeaways: Evals should test behavior, not implementation. Define success criteria before writing the eval -- if you cannot state what "pass" looks like in concrete terms, the eval is not ready. Use multiple eval types (unit, integration, end-to-end) to cover different failure modes. Track eval results over time to detect regressions early.

### Promptfoo: Agent Eval Patterns

**URL:** https://www.promptfoo.dev/docs/integrations/agent-skill/

Key takeaways: Separate the eval scenario (input + context) from the grader (how to judge output). This separation enables reuse -- the same grader can apply across multiple scenarios, and scenarios can be graded by different methods. Parameterize scenarios to generate coverage from templates rather than writing each case by hand.

### O'Reilly: How to Write a Good Spec for AI Agents

**URL:** https://www.oreilly.com/radar/how-to-write-a-good-spec-for-ai-agents/

Key takeaways: A good spec defines the boundaries of acceptable output, not a single correct answer. Include examples of outputs that are wrong in subtle ways -- these teach the agent (and the eval grader) what to reject. Specs should be testable: every requirement should map to at least one eval scenario.

### OpenAI: Evaluation Best Practices

**URL:** https://developers.openai.com/api/docs/guides/evaluation-best-practices

Key takeaways: Start with the simplest eval that provides signal and add complexity only when needed. Use a mix of automated and human evaluation, but automate first. Track baseline performance before making changes so you can measure improvement. Small, frequent eval runs catch regressions faster than large, infrequent ones.

## Key Principles for CASRE Authoring

These principles recur across the resources above. Apply them when writing any CASRE artifact.

### Structure > Length

A concise, well-organized artifact outperforms a verbose one. Use headings, tables, and lists to make content scannable. Front-load the most important information.

### Success Criteria First

Define what "done" and "good" look like before writing implementation details. For skills, state the expected output shape. For evals, state pass/fail criteria. For commands, state the end state.

### Bottom-Up Eval Design

Start with the smallest testable behavior. Write evals for individual skills before writing evals for agents that compose those skills. Compose simple evals into integration evals rather than writing monolithic end-to-end evals first.

### Deterministic > Model-Based Graders

Use exact match, regex, JSON schema validation, or structured checks whenever the output format allows. Reserve model-based grading for genuinely subjective or creative dimensions. When using model-based graders, provide explicit rubrics with scored examples.

### Concrete Examples Over Abstract Descriptions

Show what good output looks like. Show what bad output looks like. Examples reduce ambiguity more effectively than prose descriptions of quality. Include at least one positive and one negative example in skills and eval graders.

### Testable Requirements

Every requirement in a skill, rule, or command should map to at least one eval scenario. If a requirement cannot be tested, it is either too vague (rewrite it) or aspirational (move it to a "nice to have" section).
