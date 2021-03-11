# queuemanager

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT) [![Slack](https://img.shields.io/badge/Join-Slack-blue)](https://callforcode.org/slack)

Polls the `choirless_queue` database looking for documents that are `type: mixdown` (final mixdown jobs) and `status: new` (brand new jobs).

Such jobs are dispatched one at a time by the renderer.
