# queuemanager

Polls the `choirless_queue` database looking for documents that are `type: mixdown` (final mixdown jobs) and `status: new` (brand new jobs).

Such jobs are dispatched one at a time by the renderer.
