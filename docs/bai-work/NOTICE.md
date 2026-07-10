# BAI Work Notices

BAI Work is a desktop workbench for BAI Code. It provides a local desktop
experience for project conversations, runtime configuration, provider settings,
commands, skills, and workspace-scoped automation.

## Runtime Sources

- BAI Code documentation: https://docs.b.ai/baicode/BAI-code-introduction/
- BAI Code install page: https://docs.b.ai/baicode/BAI-code-introduction/#installation

## Credential Handling

BAI API keys and provider tokens are sensitive credentials. They must not be
committed, printed in logs, stored in test snapshots, or embedded in packaged
resources. Development smoke tests should pass credentials through local
environment variables, local auth files, or the app settings store only.

## Distribution Assumption

Keep required third-party notices and license files with any public
distribution. Do not present unavailable BAI Code desktop service capabilities
as implemented until the official contract is published and verified.
