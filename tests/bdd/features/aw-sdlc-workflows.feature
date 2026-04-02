Feature: AW SDLC workflows stay intent-first and outcome-driven
  So teams can trust the workflow engine in real delivery situations
  the core AW stages should behave like clear user-facing workflows
  instead of exposing internal command complexity.

  # case-id: plan-technical-spec
  @plan @intent @backend
  Scenario: Create a technical spec from an approved API contract
    Given an approved contact sync API contract already exists
    When a developer asks "Create the implementation spec for the approved API contract in contracts/contact-sync-api.md. Do not make me write a PRD first."
    Then the planning stage should be selected
    And the feature spec artifact should be created for "contact-sync-api"
    And a PRD artifact should not be created

  # case-id: plan-tasks-from-spec
  @plan @intent @backend
  Scenario: Break an approved spec into execution tasks
    Given an approved contact sync technical spec already exists
    When a developer asks "Break the approved contact sync spec into execution tasks."
    Then the planning stage should stay focused on execution prep
    And a tasks artifact should be created for "contact-sync-api"
    And execution artifacts should not be created yet

  # case-id: execute-approved-spec
  @execute @intent @backend
  Scenario: Implement an approved backend change
    Given the approved contact sync spec calls for batch normalization
    When a developer asks "Implement the approved contact sync batch normalization helper and wire it into the queue path."
    Then the execution stage should be selected
    And implementation files should be changed for "contact-sync-api"
    And release artifacts should not be created yet

  # case-id: execute-docs-only
  @execute @intent @docs
  Scenario: Handle a docs-only implementation request safely
    Given the approved work only asks for runbook changes
    When a developer asks "Update docs/runbooks/contact-sync.md with the approved rollout steps for contact sync. Do not change src/contact-sync.js."
    Then the execution stage should stay narrow
    And documentation should be updated for "contact-sync-api"
    And source files should remain unchanged

  # case-id: verify-pr-governance
  @verify @intent @pr
  Scenario: Verify a microservice PR for staging readiness
    Given a microservice repo has a completed implementation and PR description
    When a reviewer asks "Review this PR and tell me if it is ready for staging in a microservice repo."
    Then the verify stage should be selected
    And verification evidence should be written for "contact-sync-api"
    And PR governance should be checked

  # case-id: verify-failing-change-requires-repair-loop
  @verify @intent @repair
  Scenario: Verify a failing implementation and require a repair loop
    Given a contact sync implementation attempt still misses the normalization helper
    When a reviewer asks "Review this failing contact sync implementation and tell me what must be repaired before staging."
    Then the verify stage should be selected
    And verification evidence should be written for "contact-sync-api"
    And the verification outcome should require a repair loop instead of release

  # case-id: deploy-microservice-staging
  @deploy @intent @microservice
  Scenario: Deploy a verified API service to staging
    Given a verified contact sync API change is ready in a microservice repo
    When an engineer asks "Deploy this verified API service to staging in a microservice repo."
    Then the deploy stage should be selected
    And release evidence should be written for "contact-sync-api"
    And versioned service links should be recorded

  # case-id: deploy-microfrontend-staging
  @deploy @intent @microfrontend
  Scenario: Deploy a verified MFA to staging
    Given a verified contact sync MFA change is ready in a microfrontend repo
    When an engineer asks "Deploy this verified MFA to staging in a microfrontend repo."
    Then the deploy stage should be selected
    And release evidence should be written for "contact-sync-mfa"
    And versioned MFA links should be recorded

  # case-id: deploy-worker-staging
  @deploy @intent @worker
  Scenario: Deploy a verified worker to staging
    Given a verified contact sync worker change is ready in a worker repo
    When an engineer asks "Deploy this verified worker to staging in a worker repo."
    Then the deploy stage should be selected
    And release evidence should be written for "contact-sync-worker"
    And worker deployment links should be recorded

  # case-id: ship-verified-to-staging
  @ship @intent @microservice
  Scenario: Ship already-verified work without recreating planning artifacts
    Given the contact sync API work is already planned and verified
    When an engineer asks "Ship this verified API service to staging in a microservice repo."
    Then the ship stage should be selected
    And a release artifact should be created for "contact-sync-api"
    And planning artifacts should not be recreated

  # case-id: ship-unverified-to-staging
  @ship @intent @end_to_end
  Scenario: Take approved but unverified work through execution, verification, and staging
    Given the contact sync API implementation plan is approved but not yet verified
    When a developer asks "Take this approved contact sync implementation plan through execution, verification, and staging in a microservice repo."
    Then the full workflow should complete from planning through release
    And planning, execution, verification, and release artifacts should exist for "contact-sync-api"
    And the release artifact should mention staging deployment evidence
