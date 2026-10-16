# ProfIT - интеграционные контракты

Синхронный REST (`openapi.yaml`) и асинхронные сообщения (`asyncapi.yaml`) + анализ в `docs/ProfIT_API_design_analysis.md`.

## Проверка спецификаций

```bash
npm install
npm run check
```

Терминал 1 — mock:

```bash
npm run mock
```

Терминал 2 — smoke:

```bash
npm run smoke
```

Опционально: `npm run lint:openapi`.

Prism: пути как в YAML (`/public/...`), без `/api/v1`. Mock не бизнес-логика, только контракт + примеры.
